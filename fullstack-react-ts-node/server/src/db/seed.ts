import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('password123', 10);

    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role, tier, loyalty_points)
      VALUES 
        ('admin@wanderly.com', $1, 'Wanderly Administrator', 'admin', 'Platinum', 12500),
        ('traveller@wanderly.com', $2, 'Aryan Sharma', 'traveller', 'Gold', 3450)
      ON CONFLICT (email) DO NOTHING;
    `, [adminHash, userHash]);

    await client.query(`
      INSERT INTO coupons (code, discount_percent, min_spend, description)
      VALUES
        ('WELCOME10', 10, 4000, '10% instant discount for new travelers'),
        ('WANDER2026', 15, 8000, '15% off on all-inclusive holiday packages'),
        ('LUXURY20', 20, 15000, '20% off on 5-Star luxury resort stays')
      ON CONFLICT (code) DO NOTHING;
    `);

    console.log('[DB] Core seeds initialized');
  } finally {
    client.release();
  }
}
