/**
 * WANDERLY ENTERPRISE GLOBAL TRAVEL PLATFORM · CLIENT LOGIC & REAL-TIME TELEMETRY OS
 */

// Global State
let currentCurrency = localStorage.getItem("wanderly_currency") || "INR";
const exchangeRates = {
  INR: { rate: 1.0, symbol: "₹" },
  USD: { rate: 0.012, symbol: "$" },
  EUR: { rate: 0.011, symbol: "€" },
  GBP: { rate: 0.0095, symbol: "£" },
  AED: { rate: 0.044, symbol: "AED " }
};

let currentTab = "dashboard";
let searchTimer = null;
let attractionSearchTimer = null;
let diningSearchTimer = null;
let activePlan = null;
let currentWishlist = new Set();

// Real-Time Telemetry & Visualizations Global References
let telemetryIntervalMs = 3000;
let telemetryTimer = null;
let eventSource = null;
let lastTelemetryTimestamp = Date.now();
let relativeTimeTimer = null;
let totalOperationsCount = 142;
let latencyHistory = [];
let climateChart = null;
let categoryChart = null;
let latencyChart = null;
let latestTelemetryData = null;

// Leaflet Map Global References
let navMap = null;
let mapMarkersGroup = null;
let mapRouteGroup = null;
let currentNavGeoData = null;
let activeRouteDay = 1;
let visibleLayers = {
  hotel: true,
  attraction: true,
  restaurant: true,
  route: true
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initCurrency();
  initRealtimeTelemetry();
  initCharts();
  loadDestinations();
  loadHotels();
  loadAttractions();
  loadRestaurants();
  loadFlights();
  loadTours();
  loadWishlist();
  loadMyTrips();
  loadAnalyticsData();
  startRelativeTimeTicker();
});

// ==========================================================================
// REAL-TIME TELEMETRY & LIVE STREAMING (SSE / POLLING)
// ==========================================================================

function initRealtimeTelemetry() {
  if (window.EventSource) {
    try {
      eventSource = new EventSource("/api/telemetry/stream");
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          updateTelemetryUI(data);
        } catch (err) {
          console.error("Error parsing telemetry stream:", err);
        }
      };
      eventSource.onerror = () => {
        console.warn("SSE stream disconnected. Falling back to efficient polling.");
        if (eventSource) eventSource.close();
        eventSource = null;
        startPollingTelemetry();
      };
    } catch (err) {
      startPollingTelemetry();
    }
  } else {
    startPollingTelemetry();
  }
}

function startPollingTelemetry() {
  if (telemetryTimer) clearInterval(telemetryTimer);
  fetchTelemetryLive();
  telemetryTimer = setInterval(fetchTelemetryLive, telemetryIntervalMs);
}

function changeTelemetryRate(val) {
  telemetryIntervalMs = parseInt(val);
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  startPollingTelemetry();
  showToast(`Live telemetry refresh rate set to ${val / 1000}s ⚡`);
}

async function fetchTelemetryLive() {
  const data = await fetchAPI("/api/telemetry/live");
  if (data) {
    updateTelemetryUI(data);
  }
}

function syncTelemetryNow() {
  fetchTelemetryLive();
  loadAnalyticsData();
  showToast("Live telemetry snapshot refreshed from PostgreSQL 🟢");
}

function startRelativeTimeTicker() {
  if (relativeTimeTimer) clearInterval(relativeTimeTimer);
  relativeTimeTimer = setInterval(() => {
    const el = document.getElementById("topLastUpdated");
    const heroEl = document.getElementById("heroReadingSub");
    if (!lastTelemetryTimestamp) return;
    const diffSec = Math.floor((Date.now() - lastTelemetryTimestamp) / 1000);
    const text = diffSec < 2 ? "Just now" : `${diffSec}s ago`;
    if (el) el.textContent = text;
    if (heroEl) heroEl.textContent = `Updated ${text} · 🟢 Live`;
  }, 1000);
}

function updateTelemetryUI(data) {
  if (!data || !data.system) return;
  latestTelemetryData = data;
  lastTelemetryTimestamp = Date.now();

  const sys = data.system;
  totalOperationsCount = sys.total_operations || totalOperationsCount;

  // 1. Update Top Persistent Status Banner
  const statusDot = document.getElementById("streamStatusDot");
  const statusText = document.getElementById("streamStatusText");
  const topDbLatency = document.getElementById("topDbLatency");
  const topStationCount = document.getElementById("topStationCount");
  const topOpsCount = document.getElementById("topOpsCount");
  const topLastUpdated = document.getElementById("topLastUpdated");

  if (statusDot) {
    statusDot.style.background = sys.status === "connected" ? "#10b981" : "#ef4444";
  }
  if (statusText) {
    statusText.textContent = `SYSTEM STATUS: ${sys.status_indicator} Connected`;
  }
  if (topDbLatency) topDbLatency.textContent = `${sys.db_latency_ms} ms`;
  if (topStationCount) topStationCount.textContent = `${sys.active_weather_stations} Live`;
  if (topOpsCount) topOpsCount.textContent = totalOperationsCount;
  if (topLastUpdated) topLastUpdated.textContent = "Just now";

  // 2. Update Primary Real-Time Dashboard KPI Cards
  const kpiSystemStatusVal = document.getElementById("kpiSystemStatusVal");
  const kpiSystemStatusPill = document.getElementById("kpiSystemStatusPill");
  const kpiDbDetail = document.getElementById("kpiDbDetail");
  const kpiLatencyText = document.getElementById("kpiLatencyText");

  if (kpiSystemStatusVal) kpiSystemStatusVal.textContent = sys.status === "connected" ? "OPERATIONAL" : "DEGRADED";
  if (kpiSystemStatusPill) {
    kpiSystemStatusPill.textContent = `${sys.status_indicator} Connected`;
    kpiSystemStatusPill.className = sys.status === "connected" ? "status-indicator-pill live" : "status-indicator-pill processing";
  }
  if (kpiDbDetail) kpiDbDetail.textContent = `${sys.database} · ${sys.connection_pool}`;
  if (kpiLatencyText) kpiLatencyText.textContent = `${sys.db_latency_ms} ms`;

  // Hero Card Mini Readings
  const heroAvgTemp = document.getElementById("heroAvgTemp");
  const heroDbLatency = document.getElementById("heroDbLatency");
  const heroActiveStations = document.getElementById("heroActiveStations");
  const heroSystemUptime = document.getElementById("heroSystemUptime");

  if (heroDbLatency) heroDbLatency.textContent = `${sys.db_latency_ms} ms`;
  if (heroActiveStations) heroActiveStations.textContent = `${sys.active_weather_stations} Stations`;
  if (heroSystemUptime) heroSystemUptime.textContent = sys.uptime_formatted || "Healthy";

  // Climate KPI Card
  const kpiCurrentTemp = document.getElementById("kpiCurrentTemp");
  const kpiCurrentUV = document.getElementById("kpiCurrentUV");
  const kpiClimateLoc = document.getElementById("kpiClimateLoc");

  if (data.destinations && data.destinations.length > 0) {
    const firstDest = data.destinations[0];
    if (kpiCurrentTemp) kpiCurrentTemp.textContent = firstDest.temperature_str;
    if (kpiCurrentUV) kpiCurrentUV.textContent = `☀️ ${firstDest.uv_index_str} · ${firstDest.air_quality_str}`;
    if (kpiClimateLoc) kpiClimateLoc.textContent = `${firstDest.name} (${firstDest.state})`;

    // Compute average temp
    const avgTemp = (data.destinations.reduce((acc, d) => acc + d.temperature_c, 0) / data.destinations.length).toFixed(1);
    if (heroAvgTemp) heroAvgTemp.textContent = `${avgTemp} °C`;
  }

  // Financials & Ops KPI Cards
  const kpiGrossRevenue = document.getElementById("kpiGrossRevenue");
  const kpiTotalBookings = document.getElementById("kpiTotalBookings");
  const kpiAOVVal = document.getElementById("kpiAOVVal");
  const kpiTotalOpsVal = document.getElementById("kpiTotalOpsVal");
  const kpiOpenTickets = document.getElementById("kpiOpenTickets");

  if (kpiGrossRevenue) kpiGrossRevenue.textContent = formatMoney(sys.total_revenue);
  if (kpiTotalBookings) kpiTotalBookings.textContent = `${sys.total_bookings} Confirmed Bookings`;
  if (kpiAOVVal) {
    const aov = sys.total_revenue / Math.max(1, sys.total_bookings);
    kpiAOVVal.textContent = formatMoney(aov);
  }
  if (kpiTotalOpsVal) kpiTotalOpsVal.textContent = totalOperationsCount;
  if (kpiOpenTickets) kpiOpenTickets.textContent = sys.open_tickets;

  // 3. Render/Update Live Destination Telemetry Sensor Matrix
  renderTelemetrySensorGrid(data.destinations || []);

  // 4. Update Real-Time Charts
  updateLiveCharts(data);
}

function renderTelemetrySensorGrid(destinations) {
  const container = document.getElementById("telemetrySensorGrid");
  if (!container) return;

  container.innerHTML = destinations.map(d => {
    const isHighUV = d.uv_index_val >= 6;
    const isCleanAQI = d.air_quality_aqi <= 50;

    return `
      <div class="telemetry-sensor-card">
        <div class="sensor-card-header">
          <div>
            <div class="sensor-loc-title">${d.name}</div>
            <div class="sensor-state-sub">${d.state}, India</div>
          </div>
          <span class="status-indicator-pill live">🟢 Live Sensor</span>
        </div>

        <div class="sensor-primary-reading">
          <div>
            <span style="font-size:10px; color:var(--text-muted); display:block;">TEMPERATURE</span>
            <span class="sensor-temp-val">${d.temperature_str}</span>
          </div>
          <div style="font-size: 28px;">
            ${d.name === 'Kashmir' ? '❄️' : d.name === 'Munnar' || d.name === 'Ooty' ? '⛅' : d.name === 'Goa' ? '🌴' : '☀️'}
          </div>
        </div>

        <div class="sensor-badges-row">
          <span class="uv-dial-badge" style="background:${isHighUV ? '#fef3c7' : '#dcfce7'}; color:${isHighUV ? '#92400e' : '#166534'};">
            ☀️ ${d.uv_index_str}
          </span>
          <span class="aqi-dial-badge" style="background:${isCleanAQI ? '#eff6ff' : '#fff7ed'}; color:${isCleanAQI ? '#1e40af' : '#c2410c'};">
            🍃 ${d.air_quality_str}
          </span>
        </div>

        <div class="sensor-metrics-row">
          <div class="sensor-metric-item">
            <small>Humidity</small>
            <b>${d.humidity_str}</b>
          </div>
          <div class="sensor-metric-item">
            <small>Wind Speed</small>
            <b>${d.wind_speed_kmh} km/h</b>
          </div>
          <div class="sensor-metric-item">
            <small>Pressure</small>
            <b>${d.pressure_hpa} hPa</b>
          </div>
          <div class="sensor-metric-item">
            <small>Station Status</small>
            <b style="color:#10b981;">Telemetry Active</b>
          </div>
        </div>

        <div class="sensor-card-footer">
          <span class="text-muted" style="font-size:10px;">Synced: ${d.last_updated}</span>
          <div style="display:flex; gap:4px;">
            <button class="btn-secondary small" style="padding:4px 8px; font-size:10px;" onclick="openDestinationDetail(${d.id})">Details ↗</button>
            <button class="btn-primary small" style="padding:4px 8px; font-size:10px;" onclick="presetAndOpenPlanner('${d.name}', 3, 'Balanced')">Plan ✦</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// REAL-TIME DATA VISUALIZATIONS (CHART.JS)
// ==========================================================================

function initCharts() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded. Skipping chart initialization.");
    return;
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#edf2ea" : "#141c15";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  // 1. Climate & AQI Comparison Chart
  const climateCtx = document.getElementById("chartClimateComparison");
  if (climateCtx) {
    climateChart = new Chart(climateCtx, {
      type: "bar",
      data: {
        labels: ["Pondicherry", "Munnar", "Jaipur", "Goa", "Ooty", "Rishikesh", "Kashmir", "Varanasi"],
        datasets: [
          {
            label: "Temperature (°C)",
            data: [28.4, 18.2, 26.5, 29.8, 16.5, 24.2, 11.5, 25.8],
            backgroundColor: "rgba(158, 219, 50, 0.85)",
            borderColor: "#9edb32",
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: "Air Quality (AQI)",
            data: [32, 18, 75, 28, 22, 26, 15, 68],
            backgroundColor: "rgba(59, 130, 246, 0.75)",
            borderColor: "#3b82f6",
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: "Humidity (%)",
            data: [72, 58, 38, 76, 62, 48, 50, 55],
            backgroundColor: "rgba(168, 85, 247, 0.65)",
            borderColor: "#a855f7",
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' } } }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  // 2. Booking Mix & Category Revenue Chart
  const catCtx = document.getElementById("chartCategoryRevenue");
  if (catCtx) {
    categoryChart = new Chart(catCtx, {
      type: "doughnut",
      data: {
        labels: ["Stays & Resorts", "Holiday Packages", "Air Flights", "Outdoor Tours"],
        datasets: [{
          data: [45, 30, 15, 10],
          backgroundColor: [
            "rgba(158, 219, 50, 0.9)",
            "rgba(59, 130, 246, 0.9)",
            "rgba(245, 158, 11, 0.9)",
            "rgba(236, 72, 153, 0.9)"
          ],
          borderWidth: 2,
          borderColor: isDark ? "#141f16" : "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } } }
        }
      }
    });
  }

  // 3. DB Latency Stream Line Chart
  const latCtx = document.getElementById("chartLatencyStream");
  if (latCtx) {
    const initialLabels = Array.from({ length: 12 }, (_, i) => `${(12 - i) * 3}s ago`);
    const initialData = Array.from({ length: 12 }, () => (1.0 + Math.random() * 0.6).toFixed(2));
    
    latencyChart = new Chart(latCtx, {
      type: "line",
      data: {
        labels: initialLabels,
        datasets: [{
          label: "PostgreSQL Pool Latency (ms)",
          data: initialData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' } } }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { min: 0, max: 5, ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }
}

function updateLiveCharts(telemetryData) {
  if (!telemetryData) return;

  // Update Climate Chart data
  if (climateChart && telemetryData.destinations) {
    climateChart.data.labels = telemetryData.destinations.map(d => d.name);
    climateChart.data.datasets[0].data = telemetryData.destinations.map(d => d.temperature_c);
    climateChart.data.datasets[1].data = telemetryData.destinations.map(d => d.air_quality_aqi);
    climateChart.data.datasets[2].data = telemetryData.destinations.map(d => d.humidity_pct);
    climateChart.update("none");
  }

  // Update Latency Stream Chart
  if (latencyChart && telemetryData.system) {
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    latencyChart.data.labels.push(nowLabel);
    latencyChart.data.datasets[0].data.push(telemetryData.system.db_latency_ms);

    if (latencyChart.data.labels.length > 15) {
      latencyChart.data.labels.shift();
      latencyChart.data.datasets[0].data.shift();
    }
    latencyChart.update("none");
  }
}

async function loadAnalyticsData() {
  const data = await fetchAPI("/api/analytics/summary");
  if (!data) return;

  // Update Category Doughnut Chart
  if (categoryChart && data.booking_types && data.booking_types.length > 0) {
    categoryChart.data.labels = data.booking_types.map(b => b.type);
    categoryChart.data.datasets[0].data = data.booking_types.map(b => b.count);
    categoryChart.update();
  }

  // Update Activity Feed Table
  const tbody = document.getElementById("activityFeedTbody");
  if (tbody && data.recent_bookings) {
    if (data.recent_bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:24px;">No transactions recorded yet. Explore stays and packages to create live bookings.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.recent_bookings.map(b => `
      <tr>
        <td><b>${b.booking_type ? b.booking_type.toUpperCase() : 'BOOKING'}</b></td>
        <td><span style="font-family:monospace; font-weight:700;">${b.booking_ref}</span> — ${b.item_name}</td>
        <td>${b.place}</td>
        <td><b>${formatMoney(b.total_amount)}</b></td>
        <td><span class="status-indicator-pill ${b.status === 'confirmed' ? 'live' : b.status === 'cancelled' ? 'failed' : 'processing'}">${b.status}</span></td>
        <td><small class="text-muted">${b.created_at || 'Just now'}</small></td>
      </tr>
    `).join("");
  }
}

// ==========================================
// SYSTEM DIAGNOSTICS & SELF-TEST RUNNER
// ==========================================

async function runDiagnosticsSelfTest() {
  const btn = document.getElementById("btnRunDiagnostics");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Running Diagnostics...";
  }

  // Set running state on UI
  for (let i = 1; i <= 4; i++) {
    const badge = document.getElementById(`diagTest${i}Badge`);
    if (badge) {
      badge.textContent = "🟡 Testing...";
      badge.className = "diag-badge running";
    }
  }

  showToast("Running automated platform diagnostics...");

  const res = await fetchAPI("/api/system/self-test", { method: "POST" });
  if (btn) {
    btn.disabled = false;
    btn.textContent = "▶ Run Self-Test";
  }

  if (!res || !res.tests) return;

  res.tests.forEach((t, idx) => {
    const itemIdx = idx + 1;
    const badge = document.getElementById(`diagTest${itemIdx}Badge`);
    const detail = document.getElementById(`diagTest${itemIdx}Detail`);

    if (badge) {
      badge.textContent = t.status === "passed" ? `🟢 Passed (${t.latency_ms}ms)` : `🔴 Failed (${t.latency_ms}ms)`;
      badge.className = t.status === "passed" ? "diag-badge passed" : "diag-badge failed";
    }
    if (detail) {
      detail.textContent = t.detail;
    }
  });

  const summaryBox = document.getElementById("diagSummaryBox");
  const overallStatus = document.getElementById("diagOverallStatus");
  const timestamp = document.getElementById("diagTimestamp");

  if (summaryBox) summaryBox.classList.remove("hidden");
  if (overallStatus) overallStatus.textContent = res.overall_status;
  if (timestamp) timestamp.textContent = `Completed at ${res.timestamp}`;

  totalOperationsCount += 1;
  const topOps = document.getElementById("topOpsCount");
  if (topOps) topOps.textContent = totalOperationsCount;

  showToast("Platform Diagnostics complete: " + res.overall_status);
}

// ==========================================================================
// MOBILE DRAWER CONTROLS
// ==========================================================================

function toggleMobileDrawer() {
  const drawer = document.getElementById("mobileDrawerOverlay");
  if (drawer) drawer.classList.toggle("hidden");
}

// ==========================================================================
// CURRENCY & THEME MANAGEMENT
// ==========================================================================

function initCurrency() {
  const sel = document.getElementById("currencySelect");
  if (sel) sel.value = currentCurrency;
}

function changeCurrency(curr) {
  currentCurrency = curr;
  localStorage.setItem("wanderly_currency", curr);
  loadDestinations();
  loadHotels();
  loadAttractions();
  loadRestaurants();
  loadFlights();
  loadTours();
  if (currentTab === 'trips') loadMyTrips();
  if (currentTab === 'wishlist') renderWishlistView();
  if (latestTelemetryData) updateTelemetryUI(latestTelemetryData);
}

function formatMoney(amountInINR) {
  const c = exchangeRates[currentCurrency] || exchangeRates.INR;
  const converted = (amountInINR || 0) * c.rate;
  return `${c.symbol}${Math.round(converted).toLocaleString()}`;
}

function initTheme() {
  const saved = localStorage.getItem("wanderly_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("wanderly_theme", next);
  updateThemeIcon(next);
  if (navMap) {
    setTimeout(() => navMap.invalidateSize(), 200);
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");
  if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleUserDropdown() {
  const menu = document.getElementById("userDropdownMenu");
  if (menu) menu.classList.toggle("hidden");
}

document.addEventListener("click", (e) => {
  const wrap = document.querySelector(".user-menu-wrap");
  const menu = document.getElementById("userDropdownMenu");
  if (wrap && menu && !wrap.contains(e.target)) {
    menu.classList.add("hidden");
  }
});

// ==========================================================================
// NAVIGATION & TABS
// ==========================================================================

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".drawer-nav-item").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".mobile-nav-btn").forEach(b => b.classList.remove("active"));

  const pane = document.getElementById(`tab-${tabId}`);
  const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  const drawerBtn = document.querySelector(`.drawer-nav-item[data-tab="${tabId}"]`);
  const mobileBtn = document.querySelector(`.mobile-nav-btn[data-tab="${tabId}"]`);

  if (pane) pane.classList.add("active");
  if (btn) btn.classList.add("active");
  if (drawerBtn) drawerBtn.classList.add("active");
  if (mobileBtn) mobileBtn.classList.add("active");

  if (tabId === "trips") loadMyTrips();
  if (tabId === "wishlist") renderWishlistView();
  if (tabId === "attractions") loadAttractions();
  if (tabId === "dining") loadRestaurants();
  if (tabId === "navigation") {
    setTimeout(initMapIfNeeded, 200);
  }
  if (tabId === "dashboard") {
    syncTelemetryNow();
  }
}

function showTripSection(sec) {
  document.querySelectorAll(".trips-subtab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".trips-view-section").forEach(s => s.classList.add("hidden"));

  if (sec === 'bookings') {
    const view = document.getElementById("tripsBookingsView");
    const btn = document.getElementById("tabSubBtnBookings");
    if (view) view.classList.remove("hidden");
    if (btn) btn.classList.add("active");
  } else {
    const view = document.getElementById("tripsItinerariesView");
    const btn = document.getElementById("tabSubBtnItineraries");
    if (view) view.classList.remove("hidden");
    if (btn) btn.classList.add("active");
    loadMyItineraries();
  }
}

// ==========================================================================
// API HELPER
// ==========================================================================

async function fetchAPI(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      window.location.href = "/login";
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("API error:", err);
    showToast("Network or server connection error.");
    return null;
  }
}

// ==========================================================================
// SMART MATCHER & PERSONALIZED QUIZ
// ==========================================================================

function toggleQuizChip(btn) {
  btn.classList.toggle("active");
}

function updateQuizBudget(val) {
  const el = document.getElementById("quizBudgetVal");
  if (el) el.textContent = "₹" + Number(val).toLocaleString();
}

async function runPersonalizedMatcher() {
  const chips = document.querySelectorAll("#quizInterestChips .quiz-chip.active");
  const selectedInterests = Array.from(chips).map(c => c.dataset.val);
  const budget = parseFloat(document.getElementById("quizBudgetRange")?.value || 15000);
  const days = parseInt(document.getElementById("quizDaysSelect")?.value || 3);
  const companion = document.getElementById("quizCompanionSelect")?.value || "couple";
  const pace = document.getElementById("quizPaceSelect")?.value || "balanced";

  showToast("Calculating matching destination scores...");

  const res = await fetchAPI("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      interests: selectedInterests,
      budget: budget,
      days: days,
      companion: companion,
      pace: pace
    })
  });

  if (!res || !res.recommendations) return;

  const container = document.getElementById("matcherResultsContainer");
  const grid = document.getElementById("matcherResultsGrid");
  const summaryBadge = document.getElementById("matcherSummaryBadge");

  if (!container || !grid) return;

  container.classList.remove("hidden");
  if (summaryBadge) summaryBadge.textContent = `${res.recommendations.length} Destinations Ranked`;

  grid.innerHTML = res.recommendations.slice(0, 4).map((d, index) => {
    const isTop = index === 0;
    return `
      <div class="matched-card ${isTop ? 'top-match-highlight' : ''}">
        <div class="matched-img-wrap">
          <img src="${d.image}" alt="${d.name}">
          <div class="match-score-badge ${d.match_score >= 90 ? 'score-super' : 'score-high'}">
            ✦ ${d.match_score}% MATCH
          </div>
          <div class="match-rank-badge">#${index + 1} Best Fit</div>
        </div>
        <div class="matched-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="dest-state-line">${d.state}, ${d.country}</span>
            <span style="font-weight:800; font-size:12px; color:#f59e0b;">★ ${d.rating}</span>
          </div>
          <h3 class="dest-title" style="margin: 4px 0 6px;">${d.name}</h3>
          <p class="dest-tagline" style="font-size: 13px;">${d.tagline}</p>

          <!-- Dynamic Reasons -->
          <div class="match-reasons-list">
            ${d.recommendation_reasons.map(r => `<div class="match-reason-item">✓ ${r}</div>`).join("")}
          </div>

          <!-- Highlight Highlights -->
          <div class="chips-row" style="margin: 10px 0;">
            ${d.highlights.slice(0, 3).map(h => `<span class="chip-item">✦ ${h}</span>`).join("")}
          </div>

          <div class="matched-footer">
            <div>
              <small class="text-muted">Est. Package (${days} Days)</small>
              <b style="font-size: 16px; color: var(--text-main); display:block;">${formatMoney(d.budget * (days / Math.max(1, d.days)))}</b>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-secondary small" onclick="openDestinationDetail(${d.id})">Details ↗</button>
              <button class="btn-primary small" onclick="presetAndOpenPlanner('${d.name}', ${days}, '${pace}')">Plan Trip ✦</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function presetAndOpenPlanner(destName, days, pace) {
  switchTab("planner");
  const destSel = document.getElementById("planDestSelect");
  const daysSel = document.getElementById("planDaysSelect");
  const paceSel = document.getElementById("planPaceSelect");
  if (destSel) destSel.value = destName;
  if (daysSel) daysSel.value = String(days);
  if (paceSel && pace) paceSel.value = pace.charAt(0).toUpperCase() + pace.slice(1);
}

// ==========================================================================
// DESTINATIONS CATALOG
// ==========================================================================

function updateBudgetSlider(val) {
  document.getElementById("budgetDisplay").textContent = "₹" + Number(val).toLocaleString();
  loadDestinations();
}

function debounceDestSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadDestinations, 300);
}

async function loadDestinations() {
  const search = document.getElementById("destSearchInput") ? document.getElementById("destSearchInput").value : "";
  const interest = document.getElementById("interestSelect") ? document.getElementById("interestSelect").value : "all";
  const budget = document.getElementById("budgetRange") ? document.getElementById("budgetRange").value : "999999";
  const sort = document.getElementById("sortSelect") ? document.getElementById("sortSelect").value : "rating";

  const url = `/api/destinations?search=${encodeURIComponent(search)}&interest=${interest}&budget=${budget}&sort=${sort}`;
  const destinations = await fetchAPI(url);
  const grid = document.getElementById("destinationGrid");

  if (!grid || !destinations) return;

  if (destinations.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;" class="text-muted">
      <h3>No destinations matched your criteria</h3>
      <p>Try adjusting your search terms or budget slider.</p>
    </div>`;
    return;
  }

  grid.innerHTML = destinations.map(d => {
    const isWishlisted = currentWishlist.has(`destination-${d.id}`);
    const uvVal = d.uv_index || "5 (Moderate)";
    const isHighUV = uvVal.includes("High") || parseInt(uvVal) >= 6;

    return `
      <article class="dest-card" onclick="openDestinationDetail(${d.id})">
        <div class="dest-image-wrap">
          <img src="${d.image}" alt="${d.name}" loading="lazy">
          <div class="dest-rating-tag">★ ${d.rating}</div>
          <div class="dest-uv-badge" style="position: absolute; bottom: 12px; left: 12px; background: rgba(18,29,20,0.85); backdrop-filter: blur(8px); color: ${isHighUV ? '#fbbf24' : '#a3e635'}; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;">
            ☀️ UV: ${uvVal.split('-')[0]}
          </div>
          <button class="dest-bookmark-btn" onclick="event.stopPropagation(); toggleWishlistItem('destination', '${d.id}', '${d.name}', '${d.image}', ${d.budget})" title="Save to Wishlist">
            ${isWishlisted ? '❤️' : '🤍'}
          </button>
        </div>
        <div class="dest-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="dest-state-line">${d.state}, ${d.country}</span>
            <small style="color:var(--text-muted); font-size:11px;">🌡️ ${d.temperature || '24°C'}</small>
          </div>
          <h3 class="dest-title">${d.name}</h3>
          <p class="dest-tagline">${d.tagline}</p>
          
          <div class="chips-row">
            ${d.highlights.slice(0, 3).map(h => `<span class="chip-item">✦ ${h}</span>`).join("")}
          </div>

          <div style="background: var(--bg-surface-alt); padding: 10px; border-radius: var(--radius-sm); margin: 10px 0; font-size: 11px;">
            <span style="color: var(--text-muted);">Package from:</span> 
            <b style="font-size: 13px; color: var(--text-main);">${formatMoney(d.package_price_silver || 6500)}</b> / person
          </div>

          <div class="dest-footer">
            <div class="dest-price-box">
              <small>Custom Tour (${d.days} Days)</small>
              <b>${formatMoney(d.budget)}</b>
            </div>
            <button class="btn-primary small" onclick="event.stopPropagation(); openDestinationDetail(${d.id})">Explore Tour & Package ↗</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function openDestinationDetail(id) {
  const d = await fetchAPI(`/api/destinations/${id}`);
  if (!d) return;

  const uvVal = d.uv_index || "5 (Moderate)";
  const isHighUV = uvVal.includes("High") || parseInt(uvVal) >= 6;
  const silverPkg = d.package_price_silver || 6500;
  const goldPkg = d.package_price_gold || 11500;
  const platPkg = d.package_price_platinum || 19500;

  let modalHtml = `
    <!-- TOP DESTINATION HERO & UV/WEATHER STATS -->
    <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 30px; align-items: flex-start;">
      <div>
        <div style="position:relative; height: 320px; border-radius: var(--radius-md); overflow:hidden; box-shadow: var(--shadow-md);">
          <img src="${d.image}" alt="${d.name}" style="width: 100%; height: 100%; object-fit: cover;">
          <div style="position:absolute; top:14px; left:14px; background:rgba(0,0,0,0.75); color:#fff; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px;">
            ★ ${d.rating} Verified Destination Rating
          </div>
        </div>

        <!-- Real-time UV Index & Environmental Bar -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px;">
          <div class="perk-box" style="padding: 12px; background: var(--bg-surface-alt); border-left: 4px solid ${isHighUV ? '#f59e0b' : '#10b981'};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <small class="text-muted">UV Radiation Index</small>
              <span style="font-size:10px; font-weight:800; background:${isHighUV ? '#fffbeb' : '#ecfdf5'}; color:${isHighUV ? '#b45309' : '#047857'}; padding:2px 6px; border-radius:4px;">LIVE</span>
            </div>
            <b style="font-size: 14px; display:block; margin: 4px 0 2px;">${uvVal}</b>
            <small style="font-size: 11px; color: var(--text-muted);">${isHighUV ? 'Sunglasses & SPF 30+ recommended' : 'Pleasant ambient sunshine'}</small>
          </div>

          <div class="perk-box" style="padding: 12px; background: var(--bg-surface-alt); border-left: 4px solid #3b82f6;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <small class="text-muted">Air Quality Index (AQI)</small>
              <span style="font-size:10px; font-weight:800; background:#eff6ff; color:#1d4ed8; padding:2px 6px; border-radius:4px;">ATMOSPHERIC</span>
            </div>
            <b style="font-size: 14px; display:block; margin: 4px 0 2px;">${d.air_quality || 'AQI 32 (Clean & Pure)'}</b>
            <small style="font-size: 11px; color: var(--text-muted);">Humidity: ${d.humidity || '65%'}</small>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <h3>About ${d.name}</h3>
          <p class="text-muted" style="line-height: 1.6; margin-top: 6px;">${d.description}</p>
        </div>

        <!-- Nearby Attractions Highlights -->
        ${d.attractions && d.attractions.length ? `
          <div style="margin-top: 20px;">
            <h4 style="font-size: 15px; margin-bottom: 8px;">📍 Top Nearby Sights</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${d.attractions.slice(0, 4).map(a => `
                <div style="background: var(--bg-surface-alt); padding: 8px 10px; border-radius: 6px; font-size: 12px;">
                  <b>${a.name}</b>
                  <div class="text-muted" style="font-size: 11px;">${a.category} · ★ ${a.rating}</div>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ''}

        <!-- Curated Culinary Spots -->
        ${d.restaurants && d.restaurants.length ? `
          <div style="margin-top: 16px;">
            <h4 style="font-size: 15px; margin-bottom: 8px;">🍴 Curated Dining & Cafes</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${d.restaurants.slice(0, 2).map(r => `
                <div style="background: var(--bg-surface-alt); padding: 8px 10px; border-radius: 6px; font-size: 12px;">
                  <b>${r.name}</b>
                  <div class="text-muted" style="font-size: 11px;">${r.cuisine} (${r.price_tier})</div>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- RIGHT SIDE: ALL-INCLUSIVE PACKAGE BOOKING FORM -->
      <div>
        <div style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 22px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <span class="badge-gold">ALL-INCLUSIVE HOLIDAY PACKAGES</span>
            <small class="text-muted">PostgreSQL Verified ✦</small>
          </div>
          
          <h3 style="font-size: 20px; margin-bottom: 4px;">Book ${d.name} Package</h3>
          <p class="text-muted" style="font-size: 12px; margin-bottom: 16px;">Includes verified boutique stays, private sightseeing transfers, curated meals, and entry passes.</p>

          <!-- Package Tier Selector Cards -->
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
            <label class="package-tier-label active" onclick="selectPackageTier(this, 'Silver Explorer', ${silverPkg})">
              <input type="radio" name="pkg_tier" value="Silver Explorer" checked>
              <div style="flex:1;">
                <b>Silver Explorer Tier</b>
                <small class="text-muted" style="display:block;">3-Star Boutique Stay + Breakfast + Guided Walking Tour</small>
              </div>
              <b class="pkg-price-val">${formatMoney(silverPkg)}</b>
            </label>

            <label class="package-tier-label" onclick="selectPackageTier(this, 'Gold Premium', ${goldPkg})">
              <input type="radio" name="pkg_tier" value="Gold Premium">
              <div style="flex:1;">
                <b>Gold Premium Tier ✦</b>
                <small class="text-muted" style="display:block;">5-Star Resort + All Meals + Private Chauffeur AC SUV</small>
              </div>
              <b class="pkg-price-val">${formatMoney(goldPkg)}</b>
            </label>

            <label class="package-tier-label" onclick="selectPackageTier(this, 'Platinum VIP', ${platPkg})">
              <input type="radio" name="pkg_tier" value="Platinum VIP">
              <div style="flex:1;">
                <b>Platinum VIP Butler Tier</b>
                <small class="text-muted" style="display:block;">Luxury Pool Villa + Airport Transfer + VIP Fast Track</small>
              </div>
              <b class="pkg-price-val">${formatMoney(platPkg)}</b>
            </label>
          </div>

          <!-- Booking Customization Form -->
          <form id="packageBookForm" onsubmit="submitPackageReservation(event, '${d.name.replace(/'/g, "\\'")}', ${d.days})">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label>Travelers</label>
                <input type="number" id="pkgTravelers" value="2" min="1" max="10" required onchange="recalculatePackageTotal()">
              </div>
              <div class="form-group">
                <label>Days Duration</label>
                <input type="number" id="pkgDays" value="${d.days}" min="1" max="14" required onchange="recalculatePackageTotal()">
              </div>
            </div>

            <div class="form-group">
              <label>Travel Start Date</label>
              <input type="date" id="pkgTravelDate" value="${new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]}" required>
            </div>

            <div class="form-group">
              <label>Promo Code</label>
              <div style="display:flex; gap: 8px;">
                <input type="text" id="pkgCouponInput" placeholder="e.g. WANDER2026, WELCOME10" style="text-transform:uppercase;">
                <button type="button" class="btn-secondary small" onclick="applyPackageCoupon()">Apply</button>
              </div>
              <small id="pkgCouponMsg" style="font-size: 11px; margin-top: 4px; display:block;"></small>
            </div>

            <!-- Price Breakdown Summary -->
            <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-sm); margin: 14px 0;">
              <div style="display:flex; justify-content:space-between; font-size: 12px; margin-bottom: 4px;">
                <span>Package Base (<span id="pkgTravelerCountLabel">2</span> travelers):</span>
                <span id="pkgBaseDisplay">₹0</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size: 12px; color:#2e7d32; margin-bottom: 4px;" id="pkgDiscountRow" class="hidden">
                <span>Voucher Discount:</span>
                <span id="pkgDiscountDisplay">-₹0</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size: 12px; margin-bottom: 6px;">
                <span>Tourism GST (12%):</span>
                <span id="pkgTaxDisplay">₹0</span>
              </div>
              <hr style="border:none; border-top:1px solid var(--border-light); margin: 6px 0;">
              <div style="display:flex; justify-content:space-between; font-size: 16px; font-weight:800;">
                <span>Total Amount:</span>
                <span id="pkgTotalDisplay" style="color:var(--text-main);">₹0</span>
              </div>
            </div>

            <button type="submit" class="btn-primary btn-block">Confirm Holiday Package & Pay →</button>
          </form>

          <div style="margin-top: 14px; text-align: center;">
            <button class="btn-secondary small" onclick="closeModal(); switchNavDestination('${d.slug}'); switchTab('navigation');">
              🗺️ Open in Interactive Map Navigator
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  openModal(modalHtml);
  window.selectedPackageRate = silverPkg;
  window.selectedPackageTierName = "Silver Explorer";
  window.pkgActiveDiscount = 0;
  setTimeout(recalculatePackageTotal, 100);
}

function selectPackageTier(el, tierName, rate) {
  document.querySelectorAll(".package-tier-label").forEach(l => l.classList.remove("active"));
  el.classList.add("active");
  const radio = el.querySelector("input[type=radio]");
  if (radio) radio.checked = true;
  window.selectedPackageRate = rate;
  window.selectedPackageTierName = tierName;
  recalculatePackageTotal();
}

function recalculatePackageTotal() {
  const travelers = parseInt(document.getElementById("pkgTravelers")?.value || 2);
  const days = parseInt(document.getElementById("pkgDays")?.value || 3);
  const rate = window.selectedPackageRate || 6500;
  
  const subtotal = rate * travelers * (days / 3.0);
  const discount = window.pkgActiveDiscount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * 0.12;
  const total = taxable + tax;

  const countLbl = document.getElementById("pkgTravelerCountLabel");
  if (countLbl) countLbl.textContent = travelers;

  const baseDisp = document.getElementById("pkgBaseDisplay");
  if (baseDisp) baseDisp.textContent = "₹" + Math.round(subtotal).toLocaleString();

  const taxDisp = document.getElementById("pkgTaxDisplay");
  if (taxDisp) taxDisp.textContent = "₹" + Math.round(tax).toLocaleString();

  const totalDisp = document.getElementById("pkgTotalDisplay");
  if (totalDisp) totalDisp.textContent = formatMoney(total);
}

async function applyPackageCoupon() {
  const code = document.getElementById("pkgCouponInput")?.value.trim().toUpperCase();
  const travelers = parseInt(document.getElementById("pkgTravelers")?.value || 2);
  const days = parseInt(document.getElementById("pkgDays")?.value || 3);
  const rate = window.selectedPackageRate || 6500;
  const subtotal = rate * travelers * (days / 3.0);

  const res = await fetchAPI("/api/coupons/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code, subtotal: subtotal })
  });

  const msg = document.getElementById("pkgCouponMsg");
  const discRow = document.getElementById("pkgDiscountRow");
  const discDisp = document.getElementById("pkgDiscountDisplay");

  if (res && res.valid) {
    window.pkgActiveDiscount = res.discount_amount;
    msg.style.color = "#2e7d32";
    msg.textContent = res.message;
    if (discRow) discRow.classList.remove("hidden");
    if (discDisp) discDisp.textContent = "-₹" + Math.round(res.discount_amount).toLocaleString();
    recalculatePackageTotal();
  } else {
    window.pkgActiveDiscount = 0;
    msg.style.color = "#c62828";
    msg.textContent = res ? res.message : "Invalid coupon code";
    if (discRow) discRow.classList.add("hidden");
    recalculatePackageTotal();
  }
}

async function submitPackageReservation(e, destName, baseDays) {
  e.preventDefault();
  const travelers = parseInt(document.getElementById("pkgTravelers").value);
  const days = parseInt(document.getElementById("pkgDays").value);
  const travelDate = document.getElementById("pkgTravelDate").value;
  const coupon = document.getElementById("pkgCouponInput").value.trim().toUpperCase();

  const payload = {
    destination: destName,
    package_tier: window.selectedPackageTierName || "Gold Premium",
    travelers: travelers,
    days: days,
    travel_date: travelDate,
    coupon_code: coupon
  };

  const res = await fetchAPI("/api/book-package", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res && res.success) {
    showToast(`🎉 ${res.message}`);
    closeModal();
    switchTab("trips");
  } else {
    showToast(res ? res.message : "Package booking failed.");
  }
}

// ==========================================
// HOTELS & BOOKING ENGINE
// ==========================================

async function loadHotels() {
  const place = document.getElementById("hotelPlaceFilter") ? document.getElementById("hotelPlaceFilter").value : "";
  const hotels = await fetchAPI(`/api/hotels?place=${encodeURIComponent(place)}`);
  const grid = document.getElementById("hotelGrid");
  if (!grid || !hotels) return;

  grid.innerHTML = hotels.map(h => {
    return `
      <article class="hotel-card">
        <div class="hotel-img-side">
          <img src="${h.image}" alt="${h.name}" loading="lazy">
        </div>
        <div class="hotel-info-side">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="hotel-place-line">📍 ${h.place}</span>
            <span style="font-weight:800; font-size:12px; color:#f59e0b;">★ ${h.rating} (${h.reviews_count})</span>
          </div>
          <h3 class="hotel-name">${h.name}</h3>
          <div class="hotel-features-list">
            ${h.features.slice(0, 4).map(f => `<span>✓ ${f}</span>`).join("")}
          </div>
          <div class="hotel-footer-row">
            <div>
              <small class="text-muted">From</small>
              <b style="font-size:17px;">${formatMoney(h.price_per_night)}</b> <small class="text-muted">/ night</small>
            </div>
            <button class="btn-primary small" onclick='openHotelBookingModal(${JSON.stringify(h)})'>Reserve Stay →</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function openHotelBookingModal(hotel) {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

  let modalHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
      <div>
        <img src="${hotel.image}" alt="${hotel.name}" style="width: 100%; height: 260px; object-fit: cover; border-radius: var(--radius-md);">
        <h2 style="font-size: 26px; margin: 12px 0 4px;">${hotel.name}</h2>
        <p class="text-muted" style="font-size: 13px;">📍 ${hotel.address || hotel.place}</p>
        
        <div class="hotel-features-list" style="margin-top: 14px;">
          ${hotel.features.map(f => `<span>✓ ${f}</span>`).join("")}
        </div>

        <div style="background: var(--bg-surface-alt); padding: 16px; border-radius: var(--radius-sm); margin-top: 20px;">
          <span class="badge-gold">PRIVILEGE MEMBER BENEFITS</span>
          <p style="font-size: 12px; margin-top: 6px;">Earn <b>5% Reward Points</b> + Free cancellation up to 48 hours prior to check-in.</p>
        </div>
      </div>

      <div>
        <h3 style="margin-bottom: 16px;">Customize Reservation</h3>
        <form id="hotelBookForm" onsubmit="submitHotelBooking(event, '${hotel.id}', ${hotel.price_per_night})">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>Check-in Date</label>
              <input type="date" name="check_in" id="bkCheckIn" value="${today}" min="${today}" required onchange="calculateLiveBookingTotal(${hotel.price_per_night})">
            </div>
            <div class="form-group">
              <label>Check-out Date</label>
              <input type="date" name="check_out" id="bkCheckOut" value="${nextWeek}" min="${today}" required onchange="calculateLiveBookingTotal(${hotel.price_per_night})">
            </div>
          </div>

          <div class="form-group">
            <label>Select Room Tier</label>
            <select name="room_type" id="bkRoomType" class="form-control" onchange="calculateLiveBookingTotal(${hotel.price_per_night})">
              ${hotel.room_types && hotel.room_types.length ? hotel.room_types.map(r => `
                <option value="${r.type}" data-multiplier="${r.price_multiplier}">${r.type} (${r.perks})</option>
              `).join("") : `<option value="Standard Deluxe Room" data-multiplier="1.0">Standard Deluxe Room</option>`}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label>Guests</label>
              <input type="number" name="guests" id="bkGuests" value="2" min="1" max="10" required onchange="calculateLiveBookingTotal(${hotel.price_per_night})">
            </div>
            <div class="form-group">
              <label>Rooms</label>
              <input type="number" name="rooms" id="bkRooms" value="1" min="1" max="5" required onchange="calculateLiveBookingTotal(${hotel.price_per_night})">
            </div>
          </div>

          <!-- Add-ons -->
          <div style="margin: 12px 0;">
            <label style="font-size: 12px; font-weight:700; display:block; margin-bottom: 6px;">Experience Add-ons</label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 4px;">
              <input type="checkbox" id="addBreakfast" onchange="calculateLiveBookingTotal(${hotel.price_per_night})"> Daily Luxury Breakfast Buffet (+₹500 / guest / night)
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
              <input type="checkbox" id="addTransfer" onchange="calculateLiveBookingTotal(${hotel.price_per_night})"> Private Airport / Station Chauffeur Transfer (+₹1,200)
            </label>
          </div>

          <!-- Promo Code -->
          <div class="form-group" style="margin-top: 14px;">
            <label>Promotional Coupon Code</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="couponCodeInput" placeholder="e.g. WELCOME10, WANDER2026" style="text-transform: uppercase;">
              <button type="button" class="btn-secondary" onclick="applyCouponCode(${hotel.price_per_night})">Apply</button>
            </div>
            <small id="couponMessage" style="font-size: 11px; margin-top: 4px; display:block;"></small>
          </div>

          <!-- Live Price Summary Box -->
          <div style="background: var(--bg-surface-alt); padding: 14px; border-radius: var(--radius-sm); margin: 16px 0;">
            <div style="display:flex; justify-content:space-between; font-size: 12px;">
              <span>Nights & Room Base:</span>
              <span id="summaryBasePrice">₹0</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 12px; color:#2e7d32;" id="summaryDiscountRow" class="hidden">
              <span>Coupon Discount:</span>
              <span id="summaryDiscount">-₹0</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 12px;">
              <span>Taxes & Service GST (12%):</span>
              <span id="summaryTax">₹0</span>
            </div>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border-light);">
            <div style="display:flex; justify-content:space-between; font-size: 15px; font-weight:800;">
              <span>Total Payable:</span>
              <span id="summaryTotalAmount" style="color:var(--text-main);">₹0</span>
            </div>
          </div>

          <button type="submit" class="btn-primary btn-block">Confirm Booking & Pay →</button>
        </form>
      </div>
    </div>
  `;

  openModal(modalHtml);
  setTimeout(() => calculateLiveBookingTotal(hotel.price_per_night), 100);
}

let activeDiscount = 0;

async function applyCouponCode(baseRate) {
  const code = document.getElementById("couponCodeInput").value.trim().toUpperCase();
  const subtotal = calculateCurrentSubtotal(baseRate);

  const res = await fetchAPI("/api/coupons/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code, subtotal: subtotal })
  });

  const msg = document.getElementById("couponMessage");
  if (res && res.valid) {
    activeDiscount = res.discount_amount;
    msg.style.color = "#2e7d32";
    msg.textContent = res.message;
    calculateLiveBookingTotal(baseRate);
  } else {
    activeDiscount = 0;
    msg.style.color = "#c62828";
    msg.textContent = res ? res.message : "Invalid promo code";
    calculateLiveBookingTotal(baseRate);
  }
}

function calculateCurrentSubtotal(baseRate) {
  const ci = new Date(document.getElementById("bkCheckIn").value);
  const co = new Date(document.getElementById("bkCheckOut").value);
  const nights = Math.max(1, Math.round((co - ci) / 86400000));
  const guests = parseInt(document.getElementById("bkGuests").value) || 2;
  const rooms = parseInt(document.getElementById("bkRooms").value) || 1;

  const roomSelect = document.getElementById("bkRoomType");
  const multiplier = roomSelect.options[roomSelect.selectedIndex]?.dataset?.multiplier ? parseFloat(roomSelect.options[roomSelect.selectedIndex].dataset.multiplier) : 1.0;

  let base = baseRate * multiplier * rooms * nights;
  if (document.getElementById("addBreakfast")?.checked) base += (500 * guests * nights);
  if (document.getElementById("addTransfer")?.checked) base += 1200;

  return base;
}

function calculateLiveBookingTotal(baseRate) {
  const subtotal = calculateCurrentSubtotal(baseRate);
  const discountRow = document.getElementById("summaryDiscountRow");
  
  if (activeDiscount > 0) {
    discountRow.classList.remove("hidden");
    document.getElementById("summaryDiscount").textContent = "-₹" + Math.round(activeDiscount).toLocaleString();
  } else {
    discountRow.classList.add("hidden");
  }

  const taxable = Math.max(0, subtotal - activeDiscount);
  const tax = taxable * 0.12;
  const total = taxable + tax;

  document.getElementById("summaryBasePrice").textContent = "₹" + Math.round(subtotal).toLocaleString();
  document.getElementById("summaryTax").textContent = "₹" + Math.round(tax).toLocaleString();
  document.getElementById("summaryTotalAmount").textContent = formatMoney(total);
}

async function submitHotelBooking(e, hotelId, baseRate) {
  e.preventDefault();
  const form = new FormData(e.target);
  const roomSelect = document.getElementById("bkRoomType");
  const multiplier = roomSelect.options[roomSelect.selectedIndex]?.dataset?.multiplier || "1.0";

  const payload = {
    hotel_id: hotelId,
    check_in: form.get("check_in"),
    check_out: form.get("check_out"),
    guests: parseInt(form.get("guests")),
    rooms: parseInt(form.get("rooms")),
    room_type: form.get("room_type"),
    price_multiplier: parseFloat(multiplier),
    include_breakfast: document.getElementById("addBreakfast").checked,
    include_transfer: document.getElementById("addTransfer").checked,
    coupon_code: document.getElementById("couponCodeInput").value.trim().toUpperCase()
  };

  const res = await fetchAPI("/api/book-hotel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res && res.success) {
    showToast(`🎉 ${res.message}`);
    closeModal();
    switchTab("trips");
  } else {
    showToast(res ? res.message : "Booking failed.");
  }
}

// ==========================================
// NEARBY ATTRACTIONS CATALOG & DETAILS
// ==========================================

function debounceAttractionsSearch() {
  clearTimeout(attractionSearchTimer);
  attractionSearchTimer = setTimeout(loadAttractions, 300);
}

async function loadAttractions() {
  const dest = document.getElementById("attractionDestFilter") ? document.getElementById("attractionDestFilter").value : "";
  const cat = document.getElementById("attractionCatFilter") ? document.getElementById("attractionCatFilter").value : "all";
  const search = document.getElementById("attractionSearchInput") ? document.getElementById("attractionSearchInput").value : "";

  const url = `/api/attractions?destination=${encodeURIComponent(dest)}&category=${encodeURIComponent(cat)}&search=${encodeURIComponent(search)}`;
  const attractions = await fetchAPI(url);
  const grid = document.getElementById("attractionsGrid");
  if (!grid || !attractions) return;

  if (attractions.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1; text-align:center; padding: 40px;">No attractions found for this filter.</p>`;
    return;
  }

  grid.innerHTML = attractions.map(a => {
    const isWishlisted = currentWishlist.has(`attraction-${a.id}`);
    return `
      <article class="attraction-card" onclick="openAttractionDetail('${a.id}')">
        <div class="attraction-img-wrap">
          <img src="${a.image}" alt="${a.name}" loading="lazy">
          <span class="attraction-category-badge">${a.category}</span>
          <span class="attraction-rating-tag">★ ${a.rating}</span>
          <button class="dest-bookmark-btn" onclick="event.stopPropagation(); toggleWishlistItem('attraction', '${a.id}', '${a.name.replace(/'/g, "\\'")}', '${a.image}', ${a.entry_fee})" title="Save to Wishlist">
            ${isWishlisted ? '❤️' : '🤍'}
          </button>
        </div>
        <div class="attraction-body">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom: 4px;">
            <span class="text-muted">⏱️ ${a.duration}</span>
            <span style="font-weight:700; color:var(--primary);">${a.entry_fee > 0 ? formatMoney(a.entry_fee) : 'Free Entry'}</span>
          </div>
          <h3 class="attraction-name">${a.name}</h3>
          <p class="attraction-desc">${a.description}</p>
          
          <div class="chips-row">
            ${a.highlights.slice(0, 3).map(h => `<span class="chip-item">✦ ${h}</span>`).join("")}
          </div>

          ${a.insider_tip ? `
            <div class="insider-tip-box">
              💡 <b>Insider Tip:</b> ${a.insider_tip}
            </div>
          ` : ''}

          <div class="attraction-footer">
            <small class="text-muted">🕒 ${a.best_time}</small>
            <button class="btn-primary small" onclick="event.stopPropagation(); openAttractionDetail('${a.id}')">View Details ↗</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function openAttractionDetail(attId) {
  const a = await fetchAPI(`/api/attractions/${attId}`);
  if (!a) return;

  let modalHtml = `
    <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px;">
      <div>
        <div style="position:relative; height: 280px; border-radius: var(--radius-md); overflow:hidden;">
          <img src="${a.image}" alt="${a.name}" style="width:100%; height:100%; object-fit:cover;">
          <span style="position:absolute; top:12px; left:12px; background:rgba(0,0,0,0.75); color:#fff; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:700;">
            ${a.category} · ★ ${a.rating} (${a.reviews_count} Reviews)
          </span>
        </div>

        <h2 style="font-size: 24px; margin: 14px 0 4px;">${a.name}</h2>
        <p class="text-muted" style="font-size: 13px;">📍 ${a.address || a.destination_slug}</p>
        <p style="margin: 12px 0; line-height: 1.6;">${a.description}</p>

        <div class="chips-row" style="margin: 12px 0;">
          ${a.highlights.map(h => `<span class="chip-item">✦ ${h}</span>`).join("")}
        </div>

        ${a.insider_tip ? `
          <div class="insider-tip-box" style="margin-top: 14px;">
            💡 <b>Curator Insider Advice:</b> ${a.insider_tip}
          </div>
        ` : ''}
      </div>

      <div>
        <div style="background: var(--bg-surface-alt); padding: 18px; border-radius: var(--radius-md); border:1px solid var(--border-color);">
          <h4 style="font-size: 16px; margin-bottom: 12px;">Visit & Logistics Info</h4>
          
          <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
            <span class="text-muted">Entry Fee:</span>
            <b>${a.entry_fee > 0 ? formatMoney(a.entry_fee) : 'Free Public Access'}</b>
          </div>

          <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
            <span class="text-muted">Recommended Duration:</span>
            <b>${a.duration}</b>
          </div>

          <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 14px;">
            <span class="text-muted">Best Visiting Hours:</span>
            <b>${a.best_time}</b>
          </div>

          <a href="https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}" target="_blank" class="btn-primary btn-block" style="text-align:center; text-decoration:none; display:block; margin-bottom: 10px;">
            🧭 Open Navigation Directions (GPS) ↗
          </a>

          <button class="btn-secondary btn-block" onclick="closeModal(); switchNavDestination('${a.destination_slug}'); switchTab('navigation');">
            🗺️ Locate On Interactive Circuit Map
          </button>
        </div>

        ${a.nearby_restaurants && a.nearby_restaurants.length ? `
          <div style="margin-top: 18px;">
            <h4 style="font-size: 15px; margin-bottom: 8px;">🍴 Nearby Culinary Stops</h4>
            ${a.nearby_restaurants.slice(0, 2).map(r => `
              <div style="background: var(--bg-surface-alt); padding: 10px; border-radius: 6px; margin-bottom: 6px; font-size: 12px;">
                <div style="display:flex; justify-content:space-between;">
                  <b>${r.name}</b>
                  <span style="color:#f59e0b;">★ ${r.rating}</span>
                </div>
                <small class="text-muted">${r.cuisine} · Avg ${formatMoney(r.avg_cost_for_two)} for two</small>
              </div>
            `).join("")}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  openModal(modalHtml);
}

// ==========================================
// RESTAURANTS & CULINARY EXPERIENCES
// ==========================================

function debounceRestaurantsSearch() {
  clearTimeout(diningSearchTimer);
  diningSearchTimer = setTimeout(loadRestaurants, 300);
}

async function loadRestaurants() {
  const dest = document.getElementById("diningDestFilter") ? document.getElementById("diningDestFilter").value : "";
  const diet = document.getElementById("diningDietFilter") ? document.getElementById("diningDietFilter").value : "all";
  const price = document.getElementById("diningPriceFilter") ? document.getElementById("diningPriceFilter").value : "all";
  const search = document.getElementById("diningSearchInput") ? document.getElementById("diningSearchInput").value : "";

  const url = `/api/restaurants?destination=${encodeURIComponent(dest)}&dietary=${encodeURIComponent(diet)}&price_tier=${encodeURIComponent(price)}&search=${encodeURIComponent(search)}`;
  const restaurants = await fetchAPI(url);
  const grid = document.getElementById("restaurantsGrid");
  if (!grid || !restaurants) return;

  if (restaurants.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1; text-align:center; padding: 40px;">No restaurants found for this filter.</p>`;
    return;
  }

  grid.innerHTML = restaurants.map(r => {
    return `
      <article class="dining-card" onclick="openRestaurantDetail('${r.id}')">
        <div class="dining-img-wrap">
          <img src="${r.image}" alt="${r.name}" loading="lazy">
          <span class="dining-price-badge">${r.price_tier}</span>
          <span class="dining-rating-tag">★ ${r.rating}</span>
        </div>
        <div class="dining-body">
          <span class="dining-cuisine-tag">${r.cuisine}</span>
          <h3 class="dining-name">${r.name}</h3>
          <p class="dining-address">📍 ${r.address}</p>

          <div style="margin: 8px 0;">
            <small class="text-muted" style="display:block; font-size:11px; margin-bottom:2px;">Signature Must-Try Dishes:</small>
            <div class="chips-row">
              ${r.signature_dishes.slice(0, 3).map(d => `<span class="chip-item chip-food">🍲 ${d}</span>`).join("")}
            </div>
          </div>

          <div class="dietary-tags-row">
            ${r.dietary_options.map(d => `<span class="dietary-badge">${d}</span>`).join("")}
          </div>

          <div class="dining-footer">
            <div>
              <small class="text-muted">Avg. for two</small>
              <b style="font-size:15px; display:block;">${formatMoney(r.avg_cost_for_two)}</b>
            </div>
            <button class="btn-primary small" onclick="event.stopPropagation(); openRestaurantDetail('${r.id}')">Menu & Details ↗</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function openRestaurantDetail(resId) {
  const r = await fetchAPI(`/api/restaurants/${resId}`);
  if (!r) return;

  let modalHtml = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div>
        <div style="height: 260px; border-radius: var(--radius-md); overflow:hidden;">
          <img src="${r.image}" alt="${r.name}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <h2 style="font-size: 24px; margin: 12px 0 4px;">${r.name}</h2>
        <span class="badge-gold">${r.cuisine} · ${r.price_tier}</span>
        <p class="text-muted" style="font-size: 13px; margin-top: 6px;">📍 ${r.address}</p>
        <p style="margin: 12px 0; line-height: 1.6;">${r.description}</p>
      </div>

      <div>
        <div style="background: var(--bg-surface-alt); padding: 18px; border-radius: var(--radius-md); border:1px solid var(--border-color);">
          <h4 style="font-size: 16px; margin-bottom: 12px;">Culinary Profile</h4>
          
          <div style="margin-bottom: 12px;">
            <b style="font-size: 13px; display:block; margin-bottom: 4px;">🍲 Signature Dishes:</b>
            <ul style="padding-left: 20px; font-size: 13px; margin: 0;">
              ${r.signature_dishes.map(d => `<li style="margin-bottom: 4px;"><b>${d}</b></li>`).join("")}
            </ul>
          </div>

          <div style="margin-bottom: 12px;">
            <b style="font-size: 13px; display:block; margin-bottom: 4px;">🥗 Dietary Options:</b>
            <div class="chips-row">
              ${r.dietary_options.map(d => `<span class="chip-item">✓ ${d}</span>`).join("")}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 6px;">
            <span class="text-muted">Operating Hours:</span>
            <b>${r.opening_hours}</b>
          </div>

          <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 16px;">
            <span class="text-muted">Reservations / Contact:</span>
            <b>${r.phone || 'Walk-in Welcome'}</b>
          </div>

          <a href="https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}" target="_blank" class="btn-primary btn-block" style="text-align:center; text-decoration:none; display:block; margin-bottom: 10px;">
            🍴 Open In Google Maps Directions ↗
          </a>
        </div>
      </div>
    </div>
  `;

  openModal(modalHtml);
}

// ==========================================
// INTERACTIVE MAP & ROUTE NAVIGATOR (LEAFLET)
// ==========================================

function initMapIfNeeded() {
  const mapElem = document.getElementById("interactiveMap");
  if (!mapElem) return;

  if (!navMap) {
    // Default center to Pondicherry
    navMap = L.map('interactiveMap', {
      zoomControl: true,
      attributionControl: false
    }).setView([11.9416, 79.8083], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(navMap);

    mapMarkersGroup = L.layerGroup().addTo(navMap);
    mapRouteGroup = L.layerGroup().addTo(navMap);
  }

  // Load geospatial data for active selected destination
  const currentSlug = document.getElementById("navDestSelect")?.value || "pondicherry";
  loadMapGeodata(currentSlug);
}

async function switchNavDestination(slug) {
  const sel = document.getElementById("navDestSelect");
  if (sel) sel.value = slug;
  await loadMapGeodata(slug);
}

async function loadMapGeodata(slug) {
  const data = await fetchAPI(`/api/navigation/destination/${slug}`);
  if (!data) return;

  currentNavGeoData = data;
  activeRouteDay = 1;

  if (!navMap) {
    initMapIfNeeded();
    return;
  }

  // Set map center
  navMap.setView([data.destination.lat, data.destination.lng], 13);
  renderMapLayers();
  renderRouteSidebar();
}

function toggleMapLayer(layerName, btn) {
  visibleLayers[layerName] = !visibleLayers[layerName];
  if (btn) btn.classList.toggle("active", visibleLayers[layerName]);
  renderMapLayers();
}

function renderMapLayers() {
  if (!navMap || !currentNavGeoData) return;

  mapMarkersGroup.clearLayers();
  mapRouteGroup.clearLayers();

  const bounds = [];

  // 1. Hotels
  if (visibleLayers.hotel && currentNavGeoData.hotels) {
    currentNavGeoData.hotels.forEach(h => {
      const icon = L.divIcon({
        className: 'custom-map-pin pin-hotel',
        html: `<span>🏨</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const marker = L.marker([h.lat, h.lng], { icon: icon }).bindPopup(`
        <div style="font-family:sans-serif; width:180px;">
          <b style="font-size:13px; color:#1e3a8a;">🏨 ${h.name}</b>
          <div style="font-size:11px; margin:4px 0;">★ ${h.rating} · From ${formatMoney(h.price_per_night)}/nt</div>
          <button class="btn-primary small" style="width:100%; padding:4px;" onclick="openHotelBookingModal(${JSON.stringify(h).replace(/"/g, '&quot;')})">Book Stay</button>
        </div>
      `);
      mapMarkersGroup.addLayer(marker);
      bounds.push([h.lat, h.lng]);
    });
  }

  // 2. Attractions
  if (visibleLayers.attraction && currentNavGeoData.attractions) {
    currentNavGeoData.attractions.forEach(a => {
      const icon = L.divIcon({
        className: 'custom-map-pin pin-attraction',
        html: `<span>📍</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const marker = L.marker([a.lat, a.lng], { icon: icon }).bindPopup(`
        <div style="font-family:sans-serif; width:190px;">
          <b style="font-size:13px; color:#b45309;">📍 ${a.name}</b>
          <div style="font-size:11px; color:#555; margin:3px 0;">${a.category} · ★ ${a.rating}</div>
          <div style="font-size:11px; margin-bottom:6px;">Entry: ${a.entry_fee > 0 ? formatMoney(a.entry_fee) : 'Free'}</div>
          <a href="https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}" target="_blank" style="font-size:11px; color:#0284c7; font-weight:700;">Start GPS Directions ↗</a>
        </div>
      `);
      mapMarkersGroup.addLayer(marker);
      bounds.push([a.lat, a.lng]);
    });
  }

  // 3. Restaurants
  if (visibleLayers.restaurant && currentNavGeoData.restaurants) {
    currentNavGeoData.restaurants.forEach(r => {
      const icon = L.divIcon({
        className: 'custom-map-pin pin-restaurant',
        html: `<span>🍴</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const marker = L.marker([r.lat, r.lng], { icon: icon }).bindPopup(`
        <div style="font-family:sans-serif; width:190px;">
          <b style="font-size:13px; color:#e11d48;">🍴 ${r.name}</b>
          <div style="font-size:11px; color:#555; margin:3px 0;">${r.cuisine} (${r.price_tier})</div>
          <div style="font-size:11px; margin-bottom:6px;">Must-try: ${r.signature_dishes ? r.signature_dishes[0] : ''}</div>
          <a href="https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}" target="_blank" style="font-size:11px; color:#0284c7; font-weight:700;">Navigate ↗</a>
        </div>
      `);
      mapMarkersGroup.addLayer(marker);
      bounds.push([r.lat, r.lng]);
    });
  }

  // 4. Daily Circuit Polyline Route
  if (visibleLayers.route && currentNavGeoData.daily_routes && currentNavGeoData.daily_routes.length > 0) {
    const route = currentNavGeoData.daily_routes[activeRouteDay - 1] || currentNavGeoData.daily_routes[0];
    if (route && route.waypoints && route.waypoints.length > 1) {
      const latlngs = route.waypoints.map(w => [w.lat, w.lng]);
      const polyline = L.polyline(latlngs, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8'
      });
      mapRouteGroup.addLayer(polyline);
    }
  }

  if (bounds.length > 0) {
    navMap.fitBounds(bounds, { padding: [40, 40] });
  }
}

function fitMapBounds() {
  if (!navMap || !currentNavGeoData) return;
  renderMapLayers();
}

function renderRouteSidebar() {
  if (!currentNavGeoData || !currentNavGeoData.daily_routes) return;

  const selector = document.getElementById("routeDaySelector");
  const list = document.getElementById("waypointsList");
  const title = document.getElementById("navRouteTitle");
  const summary = document.getElementById("navRouteSummary");

  if (!selector || !list) return;

  // Render Day Buttons
  selector.innerHTML = currentNavGeoData.daily_routes.map(r => `
    <button class="day-select-btn ${r.day === activeRouteDay ? 'active' : ''}" onclick="selectRouteDay(${r.day})">
      Day ${r.day}
    </button>
  `).join("");

  const route = currentNavGeoData.daily_routes[activeRouteDay - 1] || currentNavGeoData.daily_routes[0];
  if (title) title.textContent = `${currentNavGeoData.destination.name} · Day ${route.day} Circuit`;
  if (summary) summary.textContent = `Estimated distance: ${route.estimated_distance_km} km · ${route.estimated_travel_time}`;

  list.innerHTML = route.waypoints.map(w => `
    <div class="waypoint-card">
      <div class="waypoint-step-badge">${w.step}</div>
      <div class="waypoint-info">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b>${w.title}</b>
          <small style="color:var(--primary); font-weight:700;">${w.time}</small>
        </div>
        <p class="text-muted" style="font-size:12px; margin: 4px 0;">${w.notes || ''}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${w.lat},${w.lng}" target="_blank" class="nav-direction-link">
          🧭 Turn-by-Turn GPS ↗
        </a>
      </div>
    </div>
  `).join("");
}

function selectRouteDay(dayNum) {
  activeRouteDay = dayNum;
  renderRouteSidebar();
  renderMapLayers();
}

// ==========================================
// FLIGHTS & TOURS
// ==========================================

async function loadFlights() {
  const origin = document.getElementById("flightOriginInput") ? document.getElementById("flightOriginInput").value : "";
  const dest = document.getElementById("flightDestInput") ? document.getElementById("flightDestInput").value : "";
  const flights = await fetchAPI(`/api/flights?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`);
  const list = document.getElementById("flightsList");
  if (!list || !flights) return;

  list.innerHTML = flights.map(f => `
    <div class="flight-ticket-card">
      <div class="airline-badge">
        <span style="font-size:28px;">✈️</span>
        <div>
          <b>${f.airline}</b>
          <small>${f.flight_no} · ${f.cabin_class}</small>
        </div>
      </div>

      <div class="flight-timeline">
        <div class="flight-time-box">
          <b>${f.departure_time}</b>
          <small>${f.origin}</small>
        </div>
        <div class="flight-path-line">
          <span>${f.duration} · ${f.stops}</span>
          <div class="path-bar"></div>
        </div>
        <div class="flight-time-box">
          <b>${f.arrival_time}</b>
          <small>${f.destination}</small>
        </div>
      </div>

      <div>
        <small class="text-muted">Fare per seat</small>
        <b style="font-size:18px; display:block;">${formatMoney(f.price)}</b>
        <small style="color:#2e7d32;">${f.seats_available} seats left</small>
      </div>

      <button class="btn-primary small" onclick='bookFlightTicket("${f.id}", "${f.airline}", "${f.flight_no}", ${f.price})'>Book Flight →</button>
    </div>
  `).join("");
}

async function bookFlightTicket(flightId, airline, flightNo, price) {
  const travelDate = document.getElementById("flightDateInput")?.value || "2026-09-15";
  const res = await fetchAPI("/api/book-flight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flight_id: flightId, travel_date: travelDate, passengers: 1 })
  });

  if (res && res.success) {
    showToast(`✈️ Boarding Pass Issued: ${res.booking_ref}`);
    switchTab("trips");
  } else {
    showToast(res ? res.message : "Flight booking failed.");
  }
}

async function loadTours() {
  const tours = await fetchAPI("/api/tours");
  const grid = document.getElementById("toursGrid");
  if (!grid || !tours) return;

  grid.innerHTML = tours.map(t => `
    <article class="tour-card">
      <div class="tour-img-wrap">
        <img src="${t.image}" alt="${t.title}" loading="lazy">
        <span class="tour-category-tag">${t.category}</span>
      </div>
      <div class="tour-body">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
          <span class="text-muted">⏱️ ${t.duration}</span>
          <span style="font-weight:800; color:#f59e0b;">★ ${t.rating}</span>
        </div>
        <h4 style="font-size:17px; margin-bottom:8px;">${t.title}</h4>
        <p class="text-muted" style="font-size:12px; flex:1; margin-bottom:14px;">${t.description}</p>
        
        <div class="chips-row">
          ${t.highlights.map(h => `<span class="chip-item">✦ ${h}</span>`).join("")}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-light); padding-top:12px; margin-top:auto;">
          <div>
            <small class="text-muted">Per Person</small>
            <b style="font-size:16px; display:block;">${formatMoney(t.price)}</b>
          </div>
          <button class="btn-primary small" onclick='bookTourPass("${t.id}", "${t.title.replace(/'/g, "\\'")}")'>Book Experience →</button>
        </div>
      </div>
    </article>
  `).join("");
}

async function bookTourPass(tourId, title) {
  const res = await fetchAPI("/api/book-tour", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tour_id: tourId, participants: 2 })
  });

  if (res && res.success) {
    showToast(`🎒 Pass Reserved: ${res.booking_ref}`);
    switchTab("trips");
  } else {
    showToast(res ? res.message : "Tour booking failed.");
  }
}

// ==========================================
// AI SMART PERSONALIZED ITINERARY PLANNER
// ==========================================

async function generateAIItinerary(e) {
  e.preventDefault();
  const dest = document.getElementById("planDestSelect").value;
  const days = document.getElementById("planDaysSelect").value;
  const style = document.getElementById("planStyleSelect").value;
  const tier = document.getElementById("planBudgetTier").value;
  const companion = document.getElementById("planCompanionSelect")?.value || "Couple";
  const pace = document.getElementById("planPaceSelect")?.value || "Balanced";

  showToast("Constructing custom personalized itinerary with sightseeing & dining...");

  const plan = await fetchAPI("/api/itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: dest,
      days: days,
      travel_style: style,
      budget_tier: tier,
      companion: companion,
      pace: pace
    })
  });

  if (!plan) return;
  activePlan = plan;

  document.getElementById("plannerEmptyState").classList.add("hidden");
  const out = document.getElementById("plannerOutput");
  out.classList.remove("hidden");

  out.innerHTML = `
    <!-- Top Header -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
      <div>
        <span class="badge-pill">✦ AI PERSONALIZED ITINERARY</span>
        <h2 style="font-size: 28px; margin: 6px 0;">${plan.title}</h2>
        <p class="text-muted" style="font-size: 13px;">${plan.weather_advisory}</p>
        <p style="font-size: 13px; margin-top: 4px;">
          🏨 Recommended Stay: <b>${plan.recommended_stay.name}</b> (${formatMoney(plan.recommended_stay.price_per_night)}/night)
        </p>
      </div>
      <div style="display:flex; gap: 8px;">
        <button class="btn-primary small" onclick="saveActivePlan()">💾 Save to PostgreSQL</button>
        <button class="btn-secondary small" onclick="window.print()">🖨️ Print Plan</button>
      </div>
    </div>

    <!-- Itemized Budget Breakdown Card -->
    <div style="background: var(--bg-surface-alt); padding: 18px; border-radius: var(--radius-md); border:1px solid var(--border-color); margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
        <div>
          <small class="text-muted">Estimated Total Cost (${plan.days} Days · ${plan.companion})</small>
          <b style="font-size: 22px; color:var(--text-main); display:block;">${formatMoney(plan.estimated_cost)}</b>
        </div>
        <div>
          <span class="badge-gold">${plan.travel_style} · ${plan.budget_tier} · ${plan.pace}</span>
        </div>
      </div>

      <!-- Itemized Bars -->
      <div class="budget-breakdown-grid">
        <div class="breakdown-col">
          <small class="text-muted">🏨 Accommodations</small>
          <b>${formatMoney(plan.budget_breakdown.accommodation)}</b>
        </div>
        <div class="breakdown-col">
          <small class="text-muted">🍽️ Dining & Cafes</small>
          <b>${formatMoney(plan.budget_breakdown.food_and_dining)}</b>
        </div>
        <div class="breakdown-col">
          <small class="text-muted">🎟️ Sights & Entries</small>
          <b>${formatMoney(plan.budget_breakdown.activities_and_entries)}</b>
        </div>
        <div class="breakdown-col">
          <small class="text-muted">🚗 Local Transit & Cabs</small>
          <b>${formatMoney(plan.budget_breakdown.local_transit)}</b>
        </div>
      </div>
    </div>

    <!-- Day By Day Detailed Agenda -->
    <div class="itinerary-agenda-list">
      ${plan.plan.map(d => `
        <div class="day-itinerary-card">
          <div class="day-card-header">
            <h3 style="font-size: 18px; margin:0;">${d.title}</h3>
          </div>

          <div class="day-schedule-timeline">
            <!-- Morning Sight -->
            <div class="timeline-slot">
              <div class="slot-time-tag">🌅 ${d.morning.time}</div>
              <div class="slot-content">
                <b>${d.morning.attraction}</b> <span class="slot-badge">${d.morning.category}</span>
                <p class="text-muted" style="font-size:12px; margin: 4px 0;">${d.morning.description}</p>
                <div style="font-size:11px; color:#b45309; margin-top:2px;">💡 ${d.morning.insider_tip}</div>
                ${d.morning.maps_url ? `<a href="${d.morning.maps_url}" target="_blank" class="nav-direction-link" style="margin-top:6px; display:inline-block;">🧭 Get Directions ↗</a>` : ''}
              </div>
            </div>

            <!-- Lunch Dining -->
            <div class="timeline-slot">
              <div class="slot-time-tag">🍴 ${d.lunch.time}</div>
              <div class="slot-content">
                <b>${d.lunch.restaurant}</b> <span class="slot-badge" style="background:#ffe4e6; color:#be123c;">${d.lunch.cuisine} (${d.lunch.price_tier})</span>
                <div style="font-size:12px; margin-top:3px;">
                  Must-try dishes: <i>${d.lunch.signature_dishes ? d.lunch.signature_dishes.join(', ') : 'Regional feast'}</i>
                </div>
                ${d.lunch.maps_url ? `<a href="${d.lunch.maps_url}" target="_blank" class="nav-direction-link" style="margin-top:6px; display:inline-block;">🍴 Open Restaurant GPS ↗</a>` : ''}
              </div>
            </div>

            <!-- Afternoon Highlight -->
            <div class="timeline-slot">
              <div class="slot-time-tag">☀️ ${d.afternoon.time}</div>
              <div class="slot-content">
                <b>${d.afternoon.attraction}</b> <span class="slot-badge">${d.afternoon.category}</span>
                <p class="text-muted" style="font-size:12px; margin: 4px 0;">${d.afternoon.description}</p>
                ${d.afternoon.maps_url ? `<a href="${d.afternoon.maps_url}" target="_blank" class="nav-direction-link" style="margin-top:6px; display:inline-block;">🧭 Get Directions ↗</a>` : ''}
              </div>
            </div>

            <!-- Evening Sunset -->
            <div class="timeline-slot">
              <div class="slot-time-tag">🌆 ${d.evening.time}</div>
              <div class="slot-content">
                <b>${d.evening.activity}</b>
                <p class="text-muted" style="font-size:12px; margin: 2px 0;">${d.evening.tip}</p>
              </div>
            </div>

            <!-- Dinner -->
            <div class="timeline-slot">
              <div class="slot-time-tag">🌙 ${d.dinner.time}</div>
              <div class="slot-content">
                <b>${d.dinner.restaurant}</b> <span class="slot-badge" style="background:#fef3c7; color:#92400e;">${d.dinner.cuisine}</span>
                <div style="font-size:12px; margin-top:3px;">
                  Signature dish: <i>${d.dinner.signature_dishes ? d.dinner.signature_dishes[0] : 'Chef special'}</i>
                </div>
                ${d.dinner.maps_url ? `<a href="${d.dinner.maps_url}" target="_blank" class="nav-direction-link" style="margin-top:6px; display:inline-block;">🍴 Open Restaurant GPS ↗</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join("")}
    </div>

    <!-- Packing Checklist & Quick Map Switch -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px;">
      <div style="background: var(--bg-surface-alt); padding: 16px; border-radius: var(--radius-sm);">
        <h4 style="margin-bottom: 8px;">🎒 Smart Packing Checklist</h4>
        <div class="chips-row">
          ${plan.packing_checklist.map(p => `<span class="chip-item">✓ ${p}</span>`).join("")}
        </div>
      </div>

      <div style="background: var(--bg-surface-alt); padding: 16px; border-radius: var(--radius-sm); display:flex; flex-direction:column; justify-content:center;">
        <h4>🧭 Turn-by-Turn Circuit Map</h4>
        <p class="text-muted" style="font-size:12px; margin: 6px 0 12px;">Explore interactive waypoints, routing polylines, and distances for this itinerary on the map.</p>
        <button class="btn-primary" onclick="switchNavDestination('${plan.destination_slug || 'pondicherry'}'); switchTab('navigation');">
          Open In Interactive Map Navigator ↗
        </button>
      </div>
    </div>
  `;
}

async function saveActivePlan() {
  if (!activePlan) return;
  const res = await fetchAPI("/api/itinerary/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(activePlan)
  });

  if (res && res.success) {
    showToast(res.message);
  }
}

// ==========================================
// MY TRIPS, BOOKINGS & INVOICES
// ==========================================

async function loadMyTrips() {
  const bookings = await fetchAPI("/api/my-bookings");
  const list = document.getElementById("myBookingsList");
  if (!list) return;

  if (!bookings || bookings.length === 0) {
    list.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;" class="text-muted">
        <h3>No bookings yet</h3>
        <p>Explore luxury stays, holiday packages, and flights to plan your next journey.</p>
        <button class="btn-primary" onclick="switchTab('discover')" style="margin-top: 14px;">Discover Places ↗</button>
      </div>
    `;
    return;
  }

  list.innerHTML = bookings.map(b => `
    <div class="booking-item-card">
      <div>
        <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 6px;">
          <span class="badge-pill">${b.booking_type.toUpperCase()}</span>
          <b style="font-size: 14px;">${b.booking_ref}</b>
          <span class="badge-status ${b.status}">${b.status}</span>
        </div>
        <h3 style="font-size: 20px; margin: 4px 0;">${b.item_name}</h3>
        <p class="text-muted" style="font-size: 12px;">📍 ${b.place} · Dates: ${b.check_in || 'N/A'} to ${b.check_out || 'N/A'}</p>
        <div style="font-size: 12px; margin-top: 8px;">
          <span>Guests: <b>${b.guests}</b></span> | 
          <span>Total Paid: <b>${formatMoney(b.total_amount)}</b></span>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; justify-content:center; gap: 8px;">
        <button class="btn-primary small" onclick="openInvoice('${b.booking_ref}')">🧾 Tax Invoice</button>
        ${b.status === 'confirmed' ? `
          <button class="btn-secondary small" style="color:#c62828;" onclick="cancelBooking('${b.booking_ref}')">Cancel Booking</button>
        ` : ''}
      </div>
    </div>
  `).join("");
}

async function loadMyItineraries() {
  const itins = await fetchAPI("/api/my-itineraries");
  const list = document.getElementById("myItinerariesList");
  if (!list) return;

  if (!itins || itins.length === 0) {
    list.innerHTML = `<p class="text-muted" style="padding: 30px; text-align:center;">No saved itineraries. Use the AI Planner to build one!</p>`;
    return;
  }

  list.innerHTML = itins.map(it => `
    <div class="booking-item-card">
      <div>
        <span class="badge-pill">${it.days} DAYS TOUR</span>
        <h3 style="font-size: 18px; margin: 6px 0;">${it.title}</h3>
        <p class="text-muted" style="font-size: 12px;">📍 ${it.destination} · Estimated: ${formatMoney(it.total_estimated_cost)}</p>
      </div>
      <div style="display:flex; align-items:center; gap: 8px;">
        <button class="btn-secondary small" style="color:#c62828;" onclick="deleteItinerary('${it.id}')">🗑️ Delete</button>
      </div>
    </div>
  `).join("");
}

async function deleteItinerary(id) {
  const res = await fetchAPI(`/api/itinerary/${id}`, { method: "DELETE" });
  if (res && res.success) {
    showToast(res.message);
    loadMyItineraries();
  }
}

async function cancelBooking(ref) {
  if (!confirm(`Are you sure you want to cancel booking ${ref}? A full refund will be initiated.`)) return;
  const res = await fetchAPI(`/api/booking/${ref}/cancel`, { method: "POST" });
  if (res && res.success) {
    showToast(res.message);
    loadMyTrips();
  }
}

async function openInvoice(ref) {
  const inv = await fetchAPI(`/api/booking/${ref}/invoice`);
  if (!inv) return;

  let modalHtml = `
    <div class="invoice-box" style="background: white; color: #111; padding: 30px; border-radius: var(--radius-md); font-family: sans-serif;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; border-bottom: 2px solid #111; padding-bottom: 16px;">
        <div>
          <h2 style="font-size: 22px; margin: 0; letter-spacing: 1px;">WANDERLY ENTERPRISE</h2>
          <small style="color: #666;">${inv.company.name}</small><br>
          <small style="color: #666;">GSTIN: ${inv.company.gstin} | CIN: ${inv.company.cin}</small><br>
          <small style="color: #666;">${inv.company.address}</small>
        </div>
        <div style="text-align: right;">
          <h3 style="margin: 0; color: #2e7d32;">TAX INVOICE</h3>
          <b>${inv.invoice_no}</b><br>
          <small style="color: #666;">Date: ${inv.date}</small>
        </div>
      </div>

      <!-- Customer & Booking Info -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
        <div>
          <b style="font-size: 12px; color:#888;">BILLED TO:</b>
          <div style="font-weight:700; font-size:14px;">${inv.customer.name}</div>
          <div>${inv.customer.email}</div>
          <div>${inv.customer.phone}</div>
        </div>
        <div>
          <b style="font-size: 12px; color:#888;">RESERVATION SUMMARY:</b>
          <div><b>${inv.booking.item_name}</b></div>
          <div>Type: ${inv.booking.type} · Ref: ${inv.booking.ref}</div>
          <div>Dates: ${inv.booking.check_in} to ${inv.booking.check_out}</div>
        </div>
      </div>

      <!-- Financials Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f4f4f4; border-bottom: 1px solid #ccc;">
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: right;">Rate / Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              ${inv.booking.item_name} (${inv.booking.room_type || 'Standard'}) - ${inv.booking.guests} Guests
            </td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">
              ₹${inv.financials.subtotal.toLocaleString()}
            </td>
          </tr>
          ${inv.financials.discount > 0 ? `
            <tr>
              <td style="padding: 10px; color: #2e7d32; border-bottom: 1px solid #eee;">Promotional Voucher Discount</td>
              <td style="padding: 10px; text-align: right; color: #2e7d32; border-bottom: 1px solid #eee;">-₹${inv.financials.discount.toLocaleString()}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Goods & Services Tax (GST 12%)</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₹${inv.financials.tax.toLocaleString()}</td>
          </tr>
          <tr style="font-size: 16px; font-weight: 800;">
            <td style="padding: 12px 10px;">Total Paid (${inv.financials.payment_status})</td>
            <td style="padding: 12px 10px; text-align: right;">₹${inv.financials.total_amount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 14px;">
        <small style="color:#777;">Payment via ${inv.financials.payment_method} · Verified Electronic Receipt</small>
        <button class="btn-primary small" onclick="window.print()">🖨️ Print Tax Invoice</button>
      </div>
    </div>
  `;

  openModal(modalHtml);
}

// ==========================================
// WISHLIST
// ==========================================

async function loadWishlist() {
  const items = await fetchAPI("/api/wishlist");
  if (items) {
    currentWishlist = new Set(items.map(i => `${i.item_type}-${i.item_id}`));
    const badge = document.getElementById("wishlistCountBadge");
    if (badge) badge.textContent = items.length;
  }
}

async function toggleWishlistItem(type, id, title, image, price) {
  const res = await fetchAPI("/api/wishlist/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_type: type, item_id: id, item_title: title, item_image: image, item_price: price })
  });

  if (res && res.success) {
    showToast(res.message);
    await loadWishlist();
    loadDestinations();
    if (currentTab === 'wishlist') renderWishlistView();
  }
}

async function renderWishlistView() {
  const items = await fetchAPI("/api/wishlist");
  const grid = document.getElementById("wishlistGrid");
  if (!grid) return;

  if (!items || items.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="padding: 40px; text-align:center; grid-column:1/-1;">Your wishlist is empty. Tap ❤️ on any destination or stay to save it here.</p>`;
    return;
  }

  grid.innerHTML = items.map(i => `
    <article class="dest-card">
      <div class="dest-image-wrap">
        <img src="${i.item_image}" alt="${i.item_title}">
        <button class="dest-bookmark-btn" onclick="toggleWishlistItem('${i.item_type}', '${i.item_id}')">❤️</button>
      </div>
      <div class="dest-body">
        <span class="dest-state-line">${i.item_type.toUpperCase()}</span>
        <h3 class="dest-title">${i.item_title}</h3>
        <div class="dest-footer">
          <b style="font-size:16px;">${formatMoney(i.item_price)}</b>
          <button class="btn-secondary small" onclick="toggleWishlistItem('${i.item_type}', '${i.item_id}')">Remove</button>
        </div>
      </div>
    </article>
  `).join("");
}

// ==========================================
// REVIEWS & SUPPORT
// ==========================================

async function submitUserReview(e, type, id) {
  e.preventDefault();
  const form = new FormData(e.target);
  const res = await fetchAPI("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_type: type,
      item_id: id,
      title: form.get("title"),
      rating: parseInt(form.get("rating")),
      comment: form.get("comment")
    })
  });

  if (res && res.success) {
    showToast(res.message);
    closeModal();
  }
}

function openSupportModal() {
  const modalHtml = `
    <h2>24/7 Wanderly Concierge Support</h2>
    <p class="text-muted">Have a question regarding reservations, refunds, or custom group itineraries? Our concierge team is standing by.</p>
    <form onsubmit="submitSupportTicket(event)" style="margin-top: 20px;">
      <div class="form-group">
        <label>Subject</label>
        <input type="text" name="subject" required placeholder="e.g. Booking Modification / Itinerary Inquiry">
      </div>
      <div class="form-group">
        <label>Category</label>
        <select name="category" class="form-control">
          <option value="Booking Modification">Booking Modification</option>
          <option value="Billing & Invoicing">Billing & Invoicing</option>
          <option value="Special Dietary / Access Request">Special Dietary / Access Request</option>
          <option value="Corporate / Enterprise Travel">Corporate / Enterprise Travel</option>
        </select>
      </div>
      <div class="form-group">
        <label>Message Details</label>
        <textarea name="message" rows="4" required placeholder="Describe your request in detail..."></textarea>
      </div>
      <button type="submit" class="btn-primary btn-block">Submit Inquiry →</button>
    </form>
  `;
  openModal(modalHtml);
}

async function submitSupportTicket(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const res = await fetchAPI("/api/support/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(form.entries()))
  });

  if (res && res.success) {
    showToast(res.message);
    closeModal();
  }
}

function copyCouponCode(code) {
  navigator.clipboard.writeText(code);
  showToast(`Copied coupon code '${code}' to clipboard!`);
}

// ==========================================
// MODAL & TOAST UTILITIES
// ==========================================

function openModal(htmlContent) {
  const overlay = document.getElementById("modalOverlay");
  const body = document.getElementById("modalBody");
  if (overlay && body) {
    body.innerHTML = htmlContent;
    overlay.classList.remove("hidden");
  }
}

function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.classList.add("hidden");
}

function handleOverlayClick(e) {
  if (e.target.id === "modalOverlay") closeModal();
}

function showToast(text) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
