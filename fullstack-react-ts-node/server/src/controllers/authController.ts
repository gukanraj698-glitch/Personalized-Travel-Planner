import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'wanderly_jwt_production_secret_key_2026';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tier: user.tier,
        loyalty_points: user.loyalty_points,
        avatar_url: user.avatar_url
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function register(req: Request, res: Response) {
  const { email, password, full_name, phone } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, tier, loyalty_points
    `, [email, hash, full_name, phone]);

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT id, email, full_name, role, tier, loyalty_points, avatar_url FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
