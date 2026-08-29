import { Request, Response } from 'express';
import { generateCustomItinerary } from '../services/itineraryGenerator.js';
import { pool } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

export async function generateItinerary(req: Request, res: Response) {
  try {
    const plan = await generateCustomItinerary(req.body);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function saveItinerary(req: AuthRequest, res: Response) {
  const userId = req.user ? req.user.id : 2;
  const { title, destination, days, travel_style, budget_tier, estimated_cost, plan } = req.body;
  const id = `ITIN-${Date.now().toString(36).toUpperCase()}`;

  try {
    await pool.query(`
      INSERT INTO itineraries (id, user_id, title, destination, days, travel_style, budget_tier, total_estimated_cost, plan_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, userId, title, destination, days, travel_style, budget_tier, estimated_cost, JSON.stringify(plan)]);

    res.json({ success: true, message: 'Itinerary saved to database.', itinerary_id: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyItineraries(req: AuthRequest, res: Response) {
  const userId = req.user ? req.user.id : 2;
  try {
    const result = await pool.query('SELECT * FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
