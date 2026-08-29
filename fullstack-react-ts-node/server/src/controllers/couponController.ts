import { Request, Response } from 'express';
import { pool } from '../config/db.js';

export async function validateCoupon(req: Request, res: Response) {
  const { code, subtotal } = req.body;
  try {
    const result = await pool.query('SELECT * FROM coupons WHERE code = $1', [code?.toUpperCase()]);
    if (result.rows.length === 0) {
      return res.json({ valid: false, message: 'Invalid promo code' });
    }

    const coupon = result.rows[0];
    if (subtotal < Number(coupon.min_spend)) {
      return res.json({
        valid: false,
        message: `Minimum spend of ₹${Number(coupon.min_spend).toLocaleString()} required for this code.`
      });
    }

    const discountAmount = (subtotal * coupon.discount_percent) / 100;
    res.json({
      valid: true,
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      discount_amount: discountAmount,
      message: `Coupon applied: ${coupon.discount_percent}% off (-₹${Math.round(discountAmount).toLocaleString()})`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
