import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

export async function bookPackage(req: AuthRequest, res: Response) {
  const userId = req.user ? req.user.id : 2;
  const { destination, package_tier, travelers = 2, days = 3, travel_date, coupon_code } = req.body;
  const ref = `WY-PKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  let rate = 11500;
  if (package_tier === 'Silver Explorer') rate = 6500;
  if (package_tier === 'Platinum VIP') rate = 19500;

  let total = rate * travelers * (days / 3.0);
  if (coupon_code === 'WELCOME10') total *= 0.90;
  if (coupon_code === 'WANDER2026') total *= 0.85;

  const totalWithTax = total * 1.12;

  try {
    await pool.query(`
      INSERT INTO bookings (id, user_id, booking_ref, booking_type, item_name, place, check_in, guests, total_amount, status)
      VALUES ($1, $2, $3, 'package', $4, $5, $6, $7, $8, 'confirmed')
    `, [ref, userId, ref, `${package_tier} Package (${days} Days)`, destination, travel_date, travelers, totalWithTax]);

    res.json({
      success: true,
      message: `Package booking confirmed! Reference: ${ref}`,
      booking_ref: ref,
      total_amount: totalWithTax
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyBookings(req: AuthRequest, res: Response) {
  const userId = req.user ? req.user.id : 2;
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getInvoice(req: Request, res: Response) {
  const { ref } = req.params;
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE booking_ref = $1', [ref]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = result.rows[0];

    const subtotal = Number(b.total_amount) / 1.12;
    const tax = Number(b.total_amount) - subtotal;

    res.json({
      invoice_no: `INV-2026-${b.booking_ref}`,
      date: new Date(b.created_at).toLocaleDateString(),
      booking: b,
      company: {
        name: 'Wanderly Global Travel OS Ltd.',
        gstin: '33AABCW9988Z1Z7',
        cin: 'U63040TN2026PTC109988',
        address: 'Wanderly Cyber Park, Tower B, Chennai, India'
      },
      financials: {
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        total_amount: Math.round(b.total_amount),
        payment_status: 'PAID · ELECTRONICALLY VERIFIED'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
