import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ethers } from 'ethers';
import { store } from '../data/store.js';
import { loginRateLimiter } from '../middleware/security.js';
// Import mirage hook
// @ts-ignore - mirage.js is a plain JS stub to be swapped in security testing
import mirage from '../../mirage.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['customer', 'pharmacist']).optional(),
});

const walletAuthSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string(),
  signature: z.string(),
  nonce: z.string(),
});

// GET /api/auth/me
authRouter.get('/me', async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    return res.status(401).json({ user: null });
  }

  const user = await store.findUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ user: null });
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      address: user.address,
      createdAt: user.createdAt,
    },
  });
});

// POST /api/auth/login (with rate limiting and Mirage hooks)
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    mirage.loginFailed(req, req.body?.email || 'unknown');
    return res.status(400).json({ error: 'Invalid scroll credentials format' });
  }

  const { email, password } = result.data;
  const user = await store.findUserByEmail(email);

  if (!user || !user.passwordHash) {
    mirage.loginFailed(req, email);
    return res.status(401).json({ error: 'Invalid sanctum email or passphrase' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    mirage.loginFailed(req, email);
    return res.status(401).json({ error: 'Invalid sanctum email or passphrase' });
  }

  // Session establishment
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.email = user.email;

  // Mirage success hook
  mirage.loginSucceeded(req, email);

  return res.json({
    message: 'Sanctum entry granted',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      address: user.address,
      createdAt: user.createdAt,
    },
  });
});

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid registration parameters' });
  }

  const { email, password, role = 'customer' } = result.data;

  const existing = await store.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already consecrated in temple records' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await store.createUser(email, passwordHash, role);

  req.session.userId = newUser.id;
  req.session.role = newUser.role;
  req.session.email = newUser.email;

  mirage.loginSucceeded(req, email);

  return res.status(201).json({
    message: 'Identity consecrated',
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    },
  });
});

// GET /api/auth/nonce
authRouter.get('/nonce', (req: Request, res: Response) => {
  const domain = req.headers.host || 'medistore.oracle';
  const nonce = store.createNonce(domain);
  return res.json({ nonce, domain });
});

// POST /api/auth/wallet (Sign-In with Ethereum / Mock)
authRouter.post('/wallet', loginRateLimiter, async (req: Request, res: Response) => {
  const parseResult = walletAuthSchema.safeParse(req.body);
  if (!parseResult.success) {
    mirage.loginFailed(req, req.body?.address?.toLowerCase() || 'unknown-wallet');
    return res.status(400).json({ error: 'Invalid wallet proof payload' });
  }

  const { address, message, signature, nonce } = parseResult.data;
  const lowerAddress = address.toLowerCase();

  // Nonce check
  const isNonceValid = store.verifyAndConsumeNonce(nonce);
  if (!isNonceValid) {
    mirage.loginFailed(req, lowerAddress);
    return res.status(401).json({ error: 'Authentication nonce expired or already consumed' });
  }

  // Cryptographic verification
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== lowerAddress) {
      mirage.loginFailed(req, lowerAddress);
      return res.status(401).json({ error: 'Cryptographic signature mismatch' });
    }
  } catch (err) {
    mirage.loginFailed(req, lowerAddress);
    return res.status(401).json({ error: 'Invalid cryptographic signature format' });
  }

  // Create or find wallet user
  const user = await store.findOrCreateWalletUser(lowerAddress);

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.email = user.email;

  mirage.loginSucceeded(req, lowerAddress);

  return res.json({
    message: 'Wallet signature confirmed',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      address: user.address,
      createdAt: user.createdAt,
    },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to purge session' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Sanctum veil closed' });
  });
});
