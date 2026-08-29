import { pool } from '../config/db.js';

export async function getDestinationNavigation(slug: string) {
  const [destRes, hotelRes, attRes, restRes] = await Promise.all([
    pool.query('SELECT * FROM destinations WHERE slug = $1', [slug]),
    pool.query('SELECT * FROM hotels WHERE LOWER(place) LIKE $1', [`%${slug}%`]),
    pool.query('SELECT * FROM attractions WHERE destination_slug = $1', [slug]),
    pool.query('SELECT * FROM restaurants WHERE destination_slug = $1', [slug])
  ]);

  const dest = destRes.rows[0];
  if (!dest) return null;

  const attractions = attRes.rows;
  const restaurants = restRes.rows;
  const hotels = hotelRes.rows;

  const dailyRoutes = [
    {
      day: 1,
      title: 'Heritage & Colonial Highlights',
      estimated_distance_km: 14.5,
      estimated_travel_time: '45 mins transit',
      waypoints: attractions.slice(0, 3).map((a, i) => ({
        step: i + 1,
        title: a.name,
        time: i === 0 ? '09:00 AM' : i === 1 ? '01:30 PM' : '05:30 PM',
        lat: Number(a.lat),
        lng: Number(a.lng),
        notes: a.category
      }))
    },
    {
      day: 2,
      title: 'Scenic Nature, Waterways & Sunset Views',
      estimated_distance_km: 18.2,
      estimated_travel_time: '55 mins transit',
      waypoints: attractions.slice(2, 5).map((a, i) => ({
        step: i + 1,
        title: a.name,
        time: i === 0 ? '08:30 AM' : i === 1 ? '02:00 PM' : '05:45 PM',
        lat: Number(a.lat),
        lng: Number(a.lng),
        notes: a.category
      }))
    }
  ];

  return {
    destination: dest,
    hotels,
    attractions,
    restaurants,
    daily_routes: dailyRoutes
  };
}
