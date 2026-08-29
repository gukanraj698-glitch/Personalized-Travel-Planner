import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Utensils, Navigation, Calendar, Heart, Shield, Sparkles, Sun, Search, User, LogOut } from 'lucide-react';
import { fetchFromAPI } from './services/api.ts';
import { Destination, Attraction, Restaurant, RecommendationResult, ItineraryPlan } from './types/index.ts';
import { LoginPage } from './components/LoginPage.tsx';

export default function App() {
  const [tab, setTab] = useState<'discover' | 'matcher' | 'attractions' | 'dining' | 'planner' | 'login'>('discover');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['nature', 'food']);
  const [quizBudget, setQuizBudget] = useState<number>(15000);
  const [quizDays, setQuizDays] = useState<number>(3);
  const [quizCompanion, setQuizCompanion] = useState<string>('couple');
  const [quizPace, setQuizPace] = useState<string>('balanced');
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [plan, setPlan] = useState<ItineraryPlan | null>(null);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('wanderly_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    loadDestinations();
    loadAttractions();
    loadRestaurants();
  }, []);

  async function loadDestinations() {
    try {
      const data = await fetchFromAPI('/destinations');
      setDestinations(data);
    } catch (e) { console.error(e); }
  }

  async function loadAttractions() {
    try {
      const data = await fetchFromAPI('/attractions');
      setAttractions(data);
    } catch (e) { console.error(e); }
  }

  async function loadRestaurants() {
    try {
      const data = await fetchFromAPI('/restaurants');
      setRestaurants(data);
    } catch (e) { console.error(e); }
  }

  async function runMatcher() {
    setLoading(true);
    try {
      const res = await fetchFromAPI('/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          interests: selectedInterests,
          budget: quizBudget,
          days: quizDays,
          companion: quizCompanion,
          pace: quizPace
        })
      });
      setRecommendations(res.recommendations || []);
      setTab('matcher');
    } catch (e) {
      alert('Matcher error');
    } finally {
      setLoading(false);
    }
  }

  async function generatePlan(destName: string) {
    setLoading(true);
    try {
      const res = await fetchFromAPI('/itinerary', {
        method: 'POST',
        body: JSON.stringify({
          destination: destName,
          days: quizDays,
          travel_style: 'Highlights & Foodie',
          budget_tier: 'Moderate',
          companion: quizCompanion,
          pace: quizPace
        })
      });
      setPlan(res);
      setTab('planner');
    } catch (e) {
      alert('Planner error');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('wanderly_token');
    localStorage.removeItem('wanderly_user');
    setCurrentUser(null);
  }

  function toggleInterest(i: string) {
    setSelectedInterests(prev => 
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }

  if (tab === 'login') {
    return (
      <LoginPage
        onSuccess={(user) => {
          setCurrentUser(user);
          setTab('discover');
        }}
        onClose={() => setTab('discover')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-200">
              ✦
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              WANDERLY <span className="text-emerald-600 font-black">REACT OS</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button onClick={() => setTab('discover')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'discover' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Explore</button>
            <button onClick={() => setTab('matcher')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'matcher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Smart Matcher ✦</button>
            <button onClick={() => setTab('attractions')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'attractions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Attractions 📍</button>
            <button onClick={() => setTab('dining')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'dining' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Dining 🍽️</button>
            <button onClick={() => setTab('planner')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'planner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>AI Planner</button>
          </nav>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  {currentUser.full_name?.split(' ')[0] || 'User'} ({currentUser.tier})
                </span>
                <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 p-1.5 transition" title="Sign Out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setTab('login')} className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm">
                Sign In 🔑
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO & QUIZ MATCHER */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        {tab === 'discover' && (
          <div>
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-8 md:p-12 mb-10 shadow-xl relative overflow-hidden">
              <div className="max-w-2xl relative z-10">
                <span className="inline-block bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full mb-4 border border-emerald-500/30">
                  REACT + TYPESCRIPT + NODE.JS + REDIS + POSTGRESQL
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                  Personalized travel plans tailored to your budget.
                </h1>
                <p className="text-slate-300 text-sm md:text-base mb-8 leading-relaxed">
                  Discover destinations based on your interests, explore nearby sights, reserve luxury stays, uncover culinary gems, and navigate seamless day-by-day itineraries.
                </p>
                
                {/* QUIZ WIDGET */}
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                  <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider mb-3">1. Select Your Interests</h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['beach', 'nature', 'adventure', 'heritage', 'food', 'wellness', 'spiritual', 'romantic'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleInterest(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                          selectedInterests.includes(tag)
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : 'bg-white/20 text-slate-200 hover:bg-white/30'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <label className="text-xs text-slate-300 font-semibold block mb-1">Max Budget: ₹{quizBudget.toLocaleString()}</label>
                      <input type="range" min="5000" max="30000" step="1000" value={quizBudget} onChange={e => setQuizBudget(Number(e.target.value))} className="w-full accent-emerald-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-semibold block mb-1">Duration</label>
                      <select value={quizDays} onChange={e => setQuizDays(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold">
                        <option value={2}>2 Days Weekend</option>
                        <option value={3}>3 Days Classic</option>
                        <option value={5}>5 Days Vacation</option>
                      </select>
                    </div>
                    <button onClick={runMatcher} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20">
                      {loading ? 'Matching...' : 'Calculate Best Matches ✦'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* DESTINATIONS GRID */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Curated Destinations</h2>
                <p className="text-xs text-slate-500">PostgreSQL Verified with live UV index & holiday packages</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {destinations.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                  <div className="h-44 relative overflow-hidden">
                    <img src={d.image} alt={d.name} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                    <span className="absolute top-3 right-3 bg-black/75 text-amber-400 text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                      ★ {d.rating}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{d.state}, {d.country}</span>
                      <h3 className="font-bold text-lg text-slate-900">{d.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.tagline}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <small className="text-[10px] text-slate-400 block">Tour Package</small>
                        <b className="text-sm text-slate-900">₹{d.budget?.toLocaleString()}</b>
                      </div>
                      <button onClick={() => generatePlan(d.name)} className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
                        Plan Trip ✦
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SMART MATCHER RESULTS TAB */}
        {tab === 'matcher' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">🎯 Personalized Destination Matches</h2>
                <p className="text-xs text-slate-500">Calculated based on your interests, ₹{quizBudget.toLocaleString()} budget, and {quizDays} days duration.</p>
              </div>
              <button onClick={() => setTab('discover')} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                Back to Explore
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((r, idx) => (
                <div key={r.id} className={`bg-white rounded-2xl border ${idx === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'} overflow-hidden shadow-sm flex flex-col`}>
                  <div className="h-48 relative">
                    <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full shadow">
                      ✦ {r.match_score}% MATCH
                    </span>
                    <span className="absolute top-3 left-3 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      #{idx + 1} Best Fit
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900">{r.name}</h3>
                      <p className="text-xs text-slate-500 mb-3">{r.tagline}</p>
                      
                      <div className="space-y-1 mb-4">
                        {r.recommendation_reasons?.map((reason, i) => (
                          <div key={i} className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                            <span>✓</span> {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <small className="text-[10px] text-slate-400 block">Est. Cost ({quizDays} Days)</small>
                        <b className="text-sm text-slate-900">₹{Math.round(r.budget * (quizDays / Math.max(1, r.days))).toLocaleString()}</b>
                      </div>
                      <button onClick={() => generatePlan(r.name)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm">
                        Generate Itinerary ✦
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ATTRACTIONS TAB */}
        {tab === 'attractions' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">📍 Top Nearby Attractions</h2>
              <p className="text-xs text-slate-500">Historical monuments, viewpoints, and nature sights stored in PostgreSQL.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {attractions.map(a => (
                <div key={a.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <img src={a.image} alt={a.name} className="w-full h-44 object-cover" />
                  <div className="p-5">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">{a.category}</span>
                    <h3 className="font-bold text-base text-slate-900 mt-2">{a.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                    <div className="mt-3 text-xs text-slate-600">
                      <b>Entry:</b> {a.entry_fee > 0 ? `₹${a.entry_fee}` : 'Free Entry'} · <b>Best time:</b> {a.best_time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DINING TAB */}
        {tab === 'dining' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">🍽️ Regional Dining & Culinary Guide</h2>
              <p className="text-xs text-slate-500">Curated authentic eateries, signature dishes, and dietary options.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {restaurants.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <img src={r.image} alt={r.name} className="w-full h-44 object-cover" />
                  <div className="p-5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{r.cuisine}</span>
                      <span className="text-xs font-bold text-slate-600">{r.price_tier}</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mt-2">{r.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{r.address}</p>
                    <div className="mt-3 text-xs text-slate-700">
                      <small className="text-slate-400 block">Must-try dishes:</small>
                      <i>{r.signature_dishes?.join(', ')}</i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI PLANNER TAB */}
        {tab === 'planner' && (
          <div>
            {plan ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6 border-b border-slate-100 pb-6">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      AI GENERATED ITINERARY
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">{plan.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">{plan.weather_advisory}</p>
                  </div>
                  <div className="text-right">
                    <small className="text-xs text-slate-400 block">Estimated Total Budget</small>
                    <b className="text-2xl font-black text-slate-900">₹{plan.estimated_cost?.toLocaleString()}</b>
                  </div>
                </div>

                {/* ITEMISED BUDGET */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-8">
                  <div>
                    <small className="text-[10px] text-slate-400 block">🏨 Accommodation</small>
                    <b className="text-sm font-bold text-slate-800">₹{plan.budget_breakdown?.accommodation?.toLocaleString()}</b>
                  </div>
                  <div>
                    <small className="text-[10px] text-slate-400 block">🍽️ Dining & Food</small>
                    <b className="text-sm font-bold text-slate-800">₹{plan.budget_breakdown?.food_and_dining?.toLocaleString()}</b>
                  </div>
                  <div>
                    <small className="text-[10px] text-slate-400 block">🎟️ Sights & Entries</small>
                    <b className="text-sm font-bold text-slate-800">₹{plan.budget_breakdown?.activities_and_entries?.toLocaleString()}</b>
                  </div>
                  <div>
                    <small className="text-[10px] text-slate-400 block">🚗 Local Transit</small>
                    <b className="text-sm font-bold text-slate-800">₹{plan.budget_breakdown?.local_transit?.toLocaleString()}</b>
                  </div>
                </div>

                {/* DAILY TIMELINE */}
                <div className="space-y-6">
                  {plan.plan?.map(d => (
                    <div key={d.day} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                      <h4 className="font-bold text-lg text-slate-900 mb-4">{d.title}</h4>
                      <div className="space-y-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-emerald-700 mr-2">🌅 Morning ({d.morning.time}):</span>
                          <b>{d.morning.attraction}</b> — {d.morning.description}
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-rose-700 mr-2">🍴 Lunch ({d.lunch.time}):</span>
                          <b>{d.lunch.restaurant}</b> ({d.lunch.cuisine}) — Must try: {d.lunch.signature_dishes?.join(', ')}
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-amber-700 mr-2">☀️ Afternoon ({d.afternoon.time}):</span>
                          <b>{d.afternoon.attraction}</b> — {d.afternoon.description}
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-indigo-700 mr-2">🌙 Dinner ({d.dinner.time}):</span>
                          <b>{d.dinner.restaurant}</b> ({d.dinner.cuisine})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No Itinerary Generated Yet</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">Choose a destination from Explore or run the Smart Matcher to create a customized day-by-day plan.</p>
                <button onClick={() => setTab('discover')} className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl">
                  Go to Explore
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Wanderly Enterprise Global Travel OS · React 18 · TypeScript · Node.js · Express · PostgreSQL · Redis · Docker
      </footer>
    </div>
  );
}
