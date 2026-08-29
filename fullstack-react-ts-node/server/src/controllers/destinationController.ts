import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { Cache } from '../config/redis.js';

export async function getDestinations(req: Request, res: Response) {
  const { search, interest, budget, sort } = req.query;
  const cacheKey = `destinations:${search || ''}:${interest || ''}:${budget || ''}:${sort || ''}`;

  try {
    const cached = await Cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    let query = 'SELECT * FROM destinations WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(state) LIKE LOWER($${params.length}))`;
    }

    if (interest && interest !== 'all') {
      params.push(interest);
      query += ` AND $${params.length} = ANY(interest_tags)`;
    }

    if (budget) {
      params.push(parseInt(budget as string, 10));
      query += ` AND budget <= $${params.length}`;
    }

    if (sort === 'price_asc') query += ' ORDER BY budget ASC';
    else if (sort === 'price_desc') query += ' ORDER BY budget DESC';
    else if (sort === 'days') query += ' ORDER BY days ASC';
    else query += ' ORDER BY rating DESC';

    const result = await pool.query(query, params);
    await Cache.set(cacheKey, JSON.stringify(result.rows), 120);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getDestinationById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const destRes = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
    if (destRes.rows.length === 0) return res.status(404).json({ error: 'Destination not found' });
    const dest = destRes.rows[0];

    const [attRes, restRes, hotelRes] = await Promise.all([
      pool.query('SELECT * FROM attractions WHERE destination_slug = $1', [dest.slug]),
      pool.query('SELECT * FROM restaurants WHERE destination_slug = $1', [dest.slug]),
      pool.query('SELECT * FROM hotels WHERE LOWER(place) LIKE $1', [`%${dest.slug}%`])
    ]);

    dest.attractions = attRes.rows;
    dest.restaurants = restRes.rows;
    dest.hotels = hotelRes.rows;

    res.json(dest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
