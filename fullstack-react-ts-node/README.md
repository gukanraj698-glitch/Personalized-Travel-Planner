# Wanderly Enterprise · Full-Stack Travel OS
> Production-grade architecture with **React 18 + TypeScript**, **Node.js + Express.js + TypeScript**, **PostgreSQL**, **Redis**, **Docker**, and **GitHub CI/CD**.

---

## 🌟 Key Features
1. **Smart Recommendation Engine (`POST /api/recommendations`)**: Matches tourist interests, budget, duration, companion type, and travel pace with dynamic scoring.
2. **Attractions & Sights (`GET /api/attractions`)**: Filter by destination and category with entry fees, duration, and insider tips.
3. **Curated Culinary Guide (`GET /api/restaurants`)**: Authentic regional cuisine, signature dishes, and dietary options.
4. **Interactive Map & Navigation (Leaflet.js)**: Multi-layer POI pins, daily circuit routes, and turn-by-turn guidance.
5. **AI Smart Itinerary Planner (`POST /api/itinerary`)**: Complete day-by-day plans with itemized budget breakdowns.
6. **PostgreSQL Relational DB**: Auto-migrated schema and connection pooling.
7. **Redis Caching & Rate Limiting**: Caching layer with in-memory fallback.
8. **Docker Multi-Container Orchestration**: One-click deployment with `docker-compose.yml`.

---

## 🚀 Quick Start (Docker)
```bash
docker-compose up --build
```
- Client runs on `http://localhost:3000`
- REST API runs on `http://localhost:5000`

---

## 💻 Local Development Setup

### 1. Backend REST API
```bash
cd server
npm install
npm run dev
```

### 2. Frontend React Application
```bash
cd client
npm install
npm run dev
```

---

## 🔑 Demo User Accounts
- **Administrator**: `admin@wanderly.com` / `admin123`
- **Traveller**: `traveller@wanderly.com` / `password123`
