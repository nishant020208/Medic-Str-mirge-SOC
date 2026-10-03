import { Request, Response, NextFunction } from 'express';

// Augment express-session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: 'customer' | 'pharmacist';
    email?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Sanctum entry required. Please authenticate.' });
  }
  next();
}

export function requirePharmacist(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Sanctum entry required. Please authenticate.' });
  }
  if (req.session.role !== 'pharmacist') {
    return res.status(403).json({
      error: 'Forbidden: High Sanctum Pharmacist privileges required.',
    });
  }
  next();
}
