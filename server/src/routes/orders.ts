import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { requirePharmacist } from '../middleware/auth.js';
import type { OrderData } from '../data/seedData.js';

export const ordersRouter = Router();

const createOrderSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(2),
  items: z
    .array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
        batchId: z.string(),
      })
    )
    .min(1),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  total: z.number().positive(),
  paymentMethod: z.enum([
    'Credit Card',
    'Credit Card (Demo)',
    'Wallet (Sepolia Mock)',
    'Web3 Wallet',
  ]),
  shippingAddress: z.object({
    fullName: z.string().min(2),
    street: z.string().min(3),
    city: z.string().min(2),
    state: z.string().min(2),
    zipCode: z.string().min(3),
    country: z.string().min(2),
  }),
});

// GET /api/orders
ordersRouter.get('/', async (req: Request, res: Response) => {
  const userRole = req.session?.role;
  const userId = req.session?.userId;
  const allOrders = await store.getOrders();

  // Pharmacist can view all orders
  if (userRole === 'pharmacist') {
    return res.json({ orders: allOrders });
  }

  // Customer views their own orders, or empty list
  if (userId) {
    const userOrders = allOrders.filter((o) => o.userId === userId);
    return res.json({ orders: userOrders });
  }

  return res.json({ orders: [] });
});

// GET /api/orders/:id
ordersRouter.get('/:id', async (req: Request, res: Response) => {
  const order = await store.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found in sacred annals' });
  }
  return res.json({ order });
});

// POST /api/orders
ordersRouter.post('/', async (req: Request, res: Response) => {
  const parseResult = createOrderSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid order structure', details: parseResult.error });
  }

  const userId = req.session?.userId || 'usr_guest_' + Math.random().toString(36).substring(2, 8);

  // createOrderSchema validated every field above, so the parsed data already carries
  // all OrderData fields except the store-assigned ones (id, userId, status, createdAt).
  // The assertion bridges Vercel's @vercel/node compiler, which widens the zod-inferred
  // fields to optional under its own cross-workspace compiler settings.
  const orderFields = parseResult.data as Omit<OrderData, 'id' | 'userId' | 'status' | 'createdAt'>;

  const newOrder = await store.createOrder({
    ...orderFields,
    userId,
    status: 'Pending',
  });

  return res.status(201).json({
    message: 'Offering consecrated into dispatch register',
    order: newOrder,
  });
});

// PATCH /api/orders/:id/status (Chief Pharmacist only)
const statusSchema = z.object({
  status: z.enum(['Pending', 'Dispensed', 'Shipped', 'Delivered', 'Cancelled']),
});

ordersRouter.patch('/:id/status', requirePharmacist, async (req: Request, res: Response) => {
  const parseResult = statusSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid consignment status' });
  }

  const updated = await store.updateOrderStatus(req.params.id, parseResult.data.status);
  if (!updated) {
    return res.status(404).json({ error: 'Order not found in sacred annals' });
  }

  return res.json({
    message: 'Consignment status altered',
    order: updated,
  });
});
