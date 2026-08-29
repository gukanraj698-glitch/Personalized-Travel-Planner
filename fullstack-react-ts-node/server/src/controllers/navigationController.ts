import { Request, Response } from 'express';
import { getDestinationNavigation } from '../services/navigationService.js';

export async function getNavigationData(req: Request, res: Response) {
  const { slug } = req.params;
  try {
    const data = await getDestinationNavigation(slug);
    if (!data) return res.status(404).json({ error: 'Navigation data not found for destination' });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
