import { Request, Response, NextFunction } from 'express';
import { Cache } from '../config/redis.js';

export function rateLimiter(limit: number = 60, windowSecs: number = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `ratelimit:${ip}`;
    
    try {
      const current = await Cache.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= limit) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      await Cache.set(key, (count + 1).toString(), windowSecs);
      next();
    } catch {
      next();
    }
  };
}
