import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { requirePharmacist } from '../middleware/auth.js';

export const productsRouter = Router();

// GET /api/products
productsRouter.get('/', (req: Request, res: Response) => {
  const { q, category, rx, inStock, sort } = req.query;

  const products = store.getProducts({
    q: typeof q === 'string' ? q : undefined,
    category: typeof category === 'string' ? category : undefined,
    rx: rx === 'true' ? true : rx === 'false' ? false : undefined,
    inStock: inStock === 'true',
    sort: typeof sort === 'string' ? sort : undefined,
  });

  return res.json({
    count: products.length,
    products,
  });
});

// GET /api/products/:id
productsRouter.get('/:id', (req: Request, res: Response) => {
  const product = store.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Remedy not found in temple archives' });
  }

  // Find 3 related items in the same category
  const related = store
    .getProducts({ category: product.category })
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return res.json({ product, related });
});

// PATCH /api/products/:id/stock (Chief Pharmacist only)
const stockUpdateSchema = z.object({
  stock: z.number().int().min(0),
});

productsRouter.patch('/:id/stock', requirePharmacist, (req: Request, res: Response) => {
  const parseResult = stockUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid stock measurement' });
  }

  const updated = store.updateProductStock(req.params.id, parseResult.data.stock);
  if (!updated) {
    return res.status(404).json({ error: 'Remedy not found in temple archives' });
  }

  return res.json({
    message: 'Stock level inscribed into dispensary ledger',
    product: updated,
  });
});
