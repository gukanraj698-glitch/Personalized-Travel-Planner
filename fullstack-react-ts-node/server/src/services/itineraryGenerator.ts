import { pool } from '../config/db.js';

export async function generateCustomItinerary(params: {
  destination: string;
  days: number;
  travel_style: string;
  budget_tier: string;
  companion?: string;
  pace?: string;
}) {
  const { destination, days, travel_style, budget_tier, companion = 'Couple', pace = 'Balanced' } = params;
  const slug = destination.toLowerCase().trim().replace(/\s+/g, '-');

  const [attRes, restRes, hotelRes] = await Promise.all([
    pool.query('SELECT * FROM attractions WHERE destination_slug = $1', [slug]),
    pool.query('SELECT * FROM restaurants WHERE destination_slug = $1', [slug]),
    pool.query('SELECT * FROM hotels WHERE LOWER(place) LIKE $1 LIMIT 1', [`%${destination.toLowerCase()}%`])
  ]);

  const attractions = attRes.rows;
  const restaurants = restRes.rows;
  const recommendedHotel = hotelRes.rows[0] || {
    name: `${destination} Boutique Resort`,
    price_per_night: budget_tier === 'Luxury' ? 12000 : budget_tier === 'Budget' ? 2500 : 5500
  };

  const dailyPlans = [];
  for (let d = 1; d <= days; d++) {
    const morningSight = attractions[(d - 1) * 2 % Math.max(1, attractions.length)] || {
      name: `${destination} Landmark`,
      category: 'Scenic Viewpoint',
      description: 'Morning panoramic views and walking paths.',
      insider_tip: 'Visit early for sunrise.',
      lat: 11.94, lng: 79.80
    };

    const afternoonSight = attractions[((d - 1) * 2 + 1) % Math.max(1, attractions.length)] || {
      name: `${destination} Cultural Center`,
      category: 'Heritage & Art',
      description: 'Explore historical exhibitions and artisanal shops.',
      lat: 11.93, lng: 79.81
    };

    const lunchSpot = restaurants[(d - 1) % Math.max(1, restaurants.length)] || {
      name: 'The Heritage Courtyard',
      cuisine: 'Regional Delicacies',
      price_tier: '₹₹',
      signature_dishes: ['Regional Thali'],
      lat: 11.94, lng: 79.82
    };

    const dinnerSpot = restaurants[d % Math.max(1, restaurants.length)] || {
      name: 'Skyline Terrace Dining',
      cuisine: 'Gourmet Grills',
      signature_dishes: ['Chef Special Grill'],
      lat: 11.95, lng: 79.83
    };

    dailyPlans.push({
      day: d,
      title: `Day ${d}: ${morningSight.name} & ${afternoonSight.name}`,
      morning: {
        time: '08:30 AM - 11:30 AM',
        attraction: morningSight.name,
        category: morningSight.category,
        description: morningSight.description,
        insider_tip: morningSight.insider_tip || 'Carry camera & water bottle',
        maps_url: `https://www.google.com/maps/search/?api=1&query=${morningSight.lat},${morningSight.lng}`
      },
      lunch: {
        time: '12:30 PM - 02:00 PM',
        restaurant: lunchSpot.name,
        cuisine: lunchSpot.cuisine,
        price_tier: lunchSpot.price_tier,
        signature_dishes: lunchSpot.signature_dishes,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${lunchSpot.lat},${lunchSpot.lng}`
      },
      afternoon: {
        time: '02:30 PM - 05:00 PM',
        attraction: afternoonSight.name,
        category: afternoonSight.category,
        description: afternoonSight.description,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${afternoonSight.lat},${afternoonSight.lng}`
      },
      evening: {
        time: '05:30 PM - 07:30 PM',
        activity: 'Golden Hour Sunset Promenade Walk & Artisan Handicrafts',
        tip: 'Vibrant local street musicians and boutique souvenir shopping.'
      },
      dinner: {
        time: '08:00 PM - 10:00 PM',
        restaurant: dinnerSpot.name,
        cuisine: dinnerSpot.cuisine,
        signature_dishes: dinnerSpot.signature_dishes,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${dinnerSpot.lat},${dinnerSpot.lng}`
      }
    });
  }

  const mult = budget_tier === 'Luxury' ? 2.2 : budget_tier === 'Budget' ? 0.6 : 1.0;
  const stayCost = recommendedHotel.price_per_night * days;
  const foodCost = Math.round(1800 * mult * days);
  const actCost = Math.round(900 * mult * days);
  const transitCost = Math.round(1200 * mult * days);
  const totalCost = stayCost + foodCost + actCost + transitCost;

  return {
    title: `${days}-Day ${travel_style} Journey in ${destination}`,
    destination,
    destination_slug: slug,
    days,
    travel_style,
    budget_tier,
    companion,
    pace,
    recommended_stay: recommendedHotel,
    estimated_cost: totalCost,
    budget_breakdown: {
      accommodation: stayCost,
      food_and_dining: foodCost,
      activities_and_entries: actCost,
      local_transit: transitCost
    },
    packing_checklist: [
      'Comfortable walking shoes',
      'UV Sunglasses & SPF 50+ Sunscreen',
      'Light breathable cottons + evening layer',
      'Universal power adapter & power bank',
      'Government ID proof & digital vouchers'
    ],
    weather_advisory: 'Pleasant ambient season (24°C - 28°C) with clean air quality.',
    plan: dailyPlans
  };
}
