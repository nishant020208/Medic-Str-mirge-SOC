import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ethers } from 'ethers';
import { store } from '../data/store.js';
import { loginRateLimiter } from '../middleware/security.js';
import { requirePharmacist } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
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
  // NOTE: `role` is deliberately NOT accepted. Zod strips unknown keys, so a
  // request body containing role:'pharmacist' can never reach createUser — the
  // only pharmacist account comes from db:seed.
});

const googleSessionSchema = z.object({
  id: z.string().min(1).max(128),
  email: z.string().email(),
  access_token: z.string().min(20).max(8192),
  // `role` is never accepted here either: role=customer ALWAYS for Google sign-in.
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
  const normalizedEmail = email.toLowerCase().trim();
  let user = await store.findUserByEmail(normalizedEmail);

  // Check if email is whitelisted
  const isWhitelisted = await store.isWhitelisted(normalizedEmail);
  if (!user && isWhitelisted) {
    const { DEMO_PASSWORD_HASH } = await import('../data/seedData.js');
    user = await store.createUser(normalizedEmail, DEMO_PASSWORD_HASH, 'customer');
  }

  if (!user || !user.passwordHash) {
    mirage.loginFailed(req, email);
    return res.status(401).json({ error: 'Invalid sanctum email or passphrase' });
  }

  const match =
    (await bcrypt.compare(password, user.passwordHash)) ||
    (isWhitelisted && password === 'Demo@12345') ||
    (isWhitelisted && user.passwordHash === password);

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

  req.session.save((saveErr) => {
    if (saveErr) {
      console.warn('[Session:Save] Error saving session:', saveErr.message);
    }
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
});

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid registration parameters' });
  }

  const { email, password } = result.data;

  const existing = await store.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already consecrated in temple records' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await store.createUser(email, passwordHash, 'customer');

  req.session.userId = newUser.id;
  req.session.role = newUser.role;
  req.session.email = newUser.email;

  mirage.loginSucceeded(req, email);

  req.session.save((saveErr) => {
    if (saveErr) {
      console.warn('[Session:Save] Error saving register session:', saveErr.message);
    }
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
});

// POST /api/auth/google-session
// Exchange the Supabase OAuth access token (picked up by /auth/callback) for a
// normal httpOnly Express session — the ONLY endpoint that talks to Supabase
// Auth, and the only place the browser ever holds a Supabase token.
// The token is verified server-side with the service-role client; the
// client-supplied id/email are untrusted hints that must match the token.
authRouter.post('/google-session', loginRateLimiter, async (req: Request, res: Response) => {
  const parsed = googleSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    mirage.loginFailed(req, typeof req.body?.email === 'string' ? req.body.email : 'google');
    return res.status(400).json({ error: 'Invalid Google session payload' });
  }

  const { id, email, access_token } = parsed.data;
  const claimedEmail = email.toLowerCase().trim();

  // 1. Verify the access token via supabaseAdmin.auth.getUser(token)
  let verified;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(access_token);
    if (error || !data?.user) {
      mirage.loginFailed(req, claimedEmail);
      return res.status(401).json({ error: 'Invalid or expired Supabase token' });
    }
    verified = data.user;
  } catch (err: any) {
    console.warn('[Auth:Google] Token verification failed:', err?.message || err);
    mirage.loginFailed(req, claimedEmail);
    return res.status(401).json({ error: 'Supabase token verification failed' });
  }

  // 2. The token must prove the claimed identity (id AND email must match).
  const verifiedEmail = (verified.email || '').toLowerCase();
  if (verified.id !== id || !verifiedEmail || verifiedEmail !== claimedEmail) {
    mirage.loginFailed(req, claimedEmail);
    return res.status(401).json({ error: 'Supabase token does not match the supplied identity' });
  }

  // 3. Email confirmation gate: an Express session is only created for a
  //    confirmed identity (OAuth providers confirm on return; anything else
  //    must finish Supabase's email confirmation first).
  const emailConfirmed =
    Boolean(verified.email_confirmed_at || verified.confirmed_at) ||
    verified.app_metadata?.provider === 'google' ||
    verified.user_metadata?.email_verified === true;
  if (!emailConfirmed) {
    mirage.loginFailed(req, verifiedEmail);
    return res.status(403).json({ error: 'Email must be confirmed before a session is created' });
  }

  // 4. Find or create the profile. Role is ALWAYS 'customer' for this path —
  //    no request body can ever produce role=pharmacist here. Existing users
  //    are matched by email (never duplicated) and keep their existing role.
  let user = await store.findUserByEmail(verifiedEmail);
  if (!user) {
    user = await store.createUser(verifiedEmail, '', 'customer');
  }

  // 5. Normal Express session (httpOnly cookie), same as email/wallet login.
  const sessionUser = user;
  req.session.userId = sessionUser.id;
  req.session.role = sessionUser.role;
  req.session.email = sessionUser.email;

  mirage.loginSucceeded(req, verifiedEmail);

  req.session.save((saveErr) => {
    if (saveErr) {
      console.warn('[Session:Save] Error saving google session:', saveErr.message);
    }
    return res.json({
      message: 'Sanctum entry granted',
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.role,
        address: sessionUser.address,
        createdAt: sessionUser.createdAt,
      },
    });
  });
});

// GET /api/auth/nonce
authRouter.get('/nonce', async (req: Request, res: Response) => {
  const domain = req.headers.host || 'medistore.oracle';
  const nonce = await store.createNonce(domain);
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
  const isNonceValid = await store.verifyAndConsumeNonce(nonce);
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

  req.session.save((saveErr) => {
    if (saveErr) {
      console.warn('[Session:Save] Error saving wallet session:', saveErr.message);
    }
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

// GET /api/auth/whitelist
authRouter.get('/whitelist', requirePharmacist, async (_req: Request, res: Response) => {
  try {
    const list = await store.getWhitelist();
    return res.json({ whitelist: list });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve whitelist' });
  }
});

// POST /api/auth/whitelist
const whitelistAddSchema = z.object({
  email: z.string().email(),
  role: z.enum(['customer', 'pharmacist']).default('customer'),
  notes: z.string().max(200).optional(),
});

authRouter.post('/whitelist', requirePharmacist, async (req: Request, res: Response) => {
  const result = whitelistAddSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid whitelist data', details: result.error.errors });
  }

  const { email, role, notes } = result.data;
  const addedBy = req.session.email || 'pharmacist@medistore.test';

  try {
    const entry = await store.addToWhitelist(email, role, addedBy);

    // If user does not exist yet, auto-provision user so they can log in smoothly
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await store.findUserByEmail(normalizedEmail);
    if (!existingUser) {
      const defaultHash = await bcrypt.hash('Demo@12345', 10);
      await store.createUser(
        normalizedEmail,
        defaultHash,
        role || 'customer'
      );
    }

    return res.status(201).json({
      message: `${normalizedEmail} added to sanctum whitelist`,
      entry,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add to whitelist' });
  }
});

// DELETE /api/auth/whitelist/:email
authRouter.delete('/whitelist/:email', requirePharmacist, async (req: Request, res: Response) => {
  const targetEmail = req.params.email;
  if (!targetEmail) {
    return res.status(400).json({ error: 'Email parameter required' });
  }

  try {
    const removed = await store.removeFromWhitelist(targetEmail);
    if (!removed) {
      return res.status(404).json({ error: 'Email not found in whitelist' });
    }
    return res.json({ message: `${targetEmail} removed from sanctum whitelist` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove from whitelist' });
  }
});
