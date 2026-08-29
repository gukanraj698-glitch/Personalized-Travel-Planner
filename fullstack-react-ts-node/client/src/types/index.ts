export interface Destination {
  id: number;
  name: string;
  state: string;
  country: string;
  slug: string;
  tagline: string;
  description: string;
  image: string;
  rating: number;
  budget: number;
  days: number;
  interest_tags: string[];
  highlights: string[];
  lat: number;
  lng: number;
  best_season: string;
  temperature: string;
  air_quality: string;
  humidity: string;
  uv_index: string;
  package_price_silver: number;
  package_price_gold: number;
  package_price_platinum: number;
  attractions?: Attraction[];
  restaurants?: Restaurant[];
}

export interface Attraction {
  id: number;
  destination_slug: string;
  name: string;
  category: string;
  rating: number;
  reviews_count: number;
  entry_fee: number;
  duration: string;
  best_time: string;
  description: string;
  image: string;
  gallery: string[];
  lat: number;
  lng: number;
  highlights: string[];
  insider_tip: string;
  address: string;
  nearby_restaurants?: Restaurant[];
}

export interface Restaurant {
  id: number;
  destination_slug: string;
  name: string;
  cuisine: string;
  price_tier: string;
  avg_cost_for_two: number;
  rating: number;
  reviews_count: number;
  address: string;
  image: string;
  signature_dishes: string[];
  dietary_options: string[];
  description: string;
  lat: number;
  lng: number;
  opening_hours: string;
  phone: string;
}

export interface RecommendationResult extends Destination {
  match_score: number;
  recommendation_reasons: string[];
}

export interface ItineraryPlan {
  title: string;
  destination: string;
  destination_slug: string;
  days: number;
  travel_style: string;
  budget_tier: string;
  companion: string;
  pace: string;
  recommended_stay: {
    name: string;
    price_per_night: number;
  };
  estimated_cost: number;
  budget_breakdown: {
    accommodation: number;
    food_and_dining: number;
    activities_and_entries: number;
    local_transit: number;
  };
  packing_checklist: string[];
  weather_advisory: string;
  plan: Array<{
    day: number;
    title: string;
    morning: { time: string; attraction: string; category: string; description: string; insider_tip: string; maps_url: string; };
    lunch: { time: string; restaurant: string; cuisine: string; price_tier: string; signature_dishes: string[]; maps_url: string; };
    afternoon: { time: string; attraction: string; category: string; description: string; maps_url: string; };
    evening: { time: string; activity: string; tip: string; };
    dinner: { time: string; restaurant: string; cuisine: string; signature_dishes: string[]; maps_url: string; };
  }>;
}
