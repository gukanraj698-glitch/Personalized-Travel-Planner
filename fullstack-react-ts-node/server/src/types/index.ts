export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'traveller';
  avatar_url?: string;
  tier: string;
  loyalty_points: number;
  created_at?: string;
}

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
  hotels?: Hotel[];
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
  is_featured: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  place: string;
  rating: number;
  reviews_count: number;
  price_per_night: number;
  image: string;
  features: string[];
  address: string;
  lat: number;
  lng: number;
}

export interface RecommendationResult extends Destination {
  match_score: number;
  recommendation_reasons: string[];
}
