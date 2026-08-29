import { Request, Response } from 'express';
import { pool } from '../config/db.js';

export async function getRestaurants(req: Request, res: Response) {
  const { destination, dietary, price_tier, search } = req.query;
  try {
    let query = 'SELECT * FROM restaurants WHERE 1=1';
    const params: any[] = [];

    if (destination) {
      params.push(destination);
      query += ` AND destination_slug = $${params.length}`;
    }

    if (dietary && dietary !== 'all') {
      params.push(dietary);
      query += ` AND $${params.length} = ANY(dietary_options)`;
    }

    if (price_tier && price_tier !== 'all') {
      params.push(price_tier);
      query += ` AND price_tier = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(cuisine) LIKE LOWER($${params.length}))`;
    }

    query += ' ORDER BY rating DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRestaurantById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
