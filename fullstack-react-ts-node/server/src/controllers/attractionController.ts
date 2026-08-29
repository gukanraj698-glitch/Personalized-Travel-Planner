import { Request, Response } from 'express';
import { pool } from '../config/db.js';

export async function getAttractions(req: Request, res: Response) {
  const { destination, category, search } = req.query;
  try {
    let query = 'SELECT * FROM attractions WHERE 1=1';
    const params: any[] = [];

    if (destination) {
      params.push(destination);
      query += ` AND destination_slug = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}))`;
    }

    query += ' ORDER BY rating DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAttractionById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM attractions WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Attraction not found' });
    const att = result.rows[0];

    const nearbyRest = await pool.query('SELECT * FROM restaurants WHERE destination_slug = $1 LIMIT 3', [att.destination_slug]);
    att.nearby_restaurants = nearbyRest.rows;

    res.json(att);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
