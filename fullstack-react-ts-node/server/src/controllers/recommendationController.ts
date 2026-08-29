import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { calculateRecommendations } from '../services/recommendationEngine.js';

export async function getRecommendations(req: Request, res: Response) {
  const { interests, budget, days, companion, pace } = req.body;
  try {
    const result = await pool.query('SELECT * FROM destinations');
    const ranked = calculateRecommendations(
      result.rows,
      interests || [],
      budget || 15000,
      days || 3,
      companion || 'couple',
      pace || 'balanced'
    );
    res.json({ recommendations: ranked });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
