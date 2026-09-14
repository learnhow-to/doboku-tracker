import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { query } from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

// System health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dbCheck = await query('SELECT 1 as alive');
    res.json({
      status: 'healthy',
      database: dbCheck.rows.length > 0 ? 'connected' : 'disconnected',
      storageDriver: config.storage.driver,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Development/Test login endpoint (strictly forbidden in production)
router.post('/dev-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (config.nodeEnv === 'production') {
      res.status(403).json({ error: 'Dev login is strictly forbidden in production mode.' });
      return;
    }

    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required (e.g. usr-admin, usr-foreman, usr-worker-1, usr-office)' });
      return;
    }

    const userRes = await query(
      `SELECT u.*, om.role as org_role, om.organization_id, om.is_active
       FROM users u
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      res.status(403).json({ error: 'Account access has been revoked.' });
      return;
    }

    // Sign a JWT token using the configured secret (mimicking Supabase Auth JWT)
    const token = jwt.sign(
      {
        sub: user.auth_id,
        email: user.email,
        role: 'authenticated',
      },
      config.supabase.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        authId: user.auth_id,
        email: user.email,
        displayName: user.display_name,
        organizationId: user.organization_id,
        orgRole: user.org_role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get profile of authenticated user
router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({
    user: req.user,
  });
});

export default router;
