import pg from 'pg';
import { MongoClient, Db } from 'mongodb';
import {
  SEED_PRODUCTS,
  SEED_USERS,
  SEED_ORDERS,
  ProductData,
  UserData,
  OrderData,
} from './seedData.js';

const { Pool } = pg;

export interface WhitelistEntry {
  email: string;
  role: 'customer' | 'pharmacist';
  addedBy: string;
  createdAt: string;
}

export const DEFAULT_WHITELIST: WhitelistEntry[] = [
  {
    email: 'pharmacist@medistore.test',
    role: 'pharmacist',
    addedBy: 'Asclepeion Genesis',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    email: 'customer@medistore.test',
    role: 'customer',
    addedBy: 'Asclepeion Genesis',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    email: 'apprentice@medistore.test',
    role: 'customer',
    addedBy: 'Asclepeion Genesis',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export interface StorageAdapter {
  type: 'postgres' | 'mongodb' | 'memory';
  getProducts(filters?: {
    q?: string;
    category?: string;
    rx?: boolean;
    inStock?: boolean;
    sort?: string;
  }): Promise<ProductData[]>;
  getProductById(id: string): Promise<ProductData | undefined>;
  updateProductStock(id: string, stock: number): Promise<ProductData | null>;
  findUserByEmail(email: string): Promise<UserData | undefined>;
  findUserById(id: string): Promise<UserData | undefined>;
  createUser(email: string, passwordHash: string, role?: 'customer' | 'pharmacist'): Promise<UserData>;
  findOrCreateWalletUser(address: string): Promise<UserData>;
  getOrders(): Promise<OrderData[]>;
  getOrderById(id: string): Promise<OrderData | undefined>;
  createOrder(order: Omit<OrderData, 'id' | 'createdAt'>): Promise<OrderData>;
  updateOrderStatus(id: string, status: OrderData['status']): Promise<OrderData | null>;
  getWhitelist(): Promise<WhitelistEntry[]>;
  addToWhitelist(email: string, role?: 'customer' | 'pharmacist', addedBy?: string): Promise<WhitelistEntry>;
  removeFromWhitelist(email: string): Promise<boolean>;
  isWhitelisted(email: string): Promise<boolean>;
  reset(): Promise<void>;
}

// ---------------------------------------------------------------------------
// 1. PostgreSQL Adapter
// ---------------------------------------------------------------------------
export class PostgresAdapter implements StorageAdapter {
  public type: 'postgres' = 'postgres';
  private pool: pg.Pool;

  constructor(connectionString: string) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    this.pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }

  public async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // 1. Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          role TEXT NOT NULL,
          address TEXT,
          created_at TEXT NOT NULL
        );
      `);

      // 2. Products Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          price NUMERIC NOT NULL,
          stock INT NOT NULL,
          rx BOOLEAN NOT NULL DEFAULT false,
          batch_id TEXT NOT NULL,
          dosage TEXT NOT NULL,
          illustration TEXT NOT NULL,
          featured BOOLEAN NOT NULL DEFAULT false
        );
      `);

      // 3. Orders Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          items JSONB NOT NULL,
          subtotal NUMERIC NOT NULL,
          tax NUMERIC NOT NULL,
          shipping NUMERIC NOT NULL,
          total NUMERIC NOT NULL,
          payment_method TEXT NOT NULL,
          shipping_address JSONB NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      // Auto-seed if empty
      const prodCount = await client.query('SELECT COUNT(*) FROM products');
      if (parseInt(prodCount.rows[0].count, 10) === 0) {
        console.log('[Database:Postgres] Seeding initial products...');
        for (const p of SEED_PRODUCTS) {
          await client.query(
            `INSERT INTO products (id, name, description, category, price, stock, rx, batch_id, dosage, illustration, featured)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              p.id,
              p.name,
              p.description,
              p.category,
              p.price,
              p.stock,
              p.rx,
              p.batchId,
              p.dosage,
              p.illustration,
              p.featured || false,
            ]
          );
        }
      }

      const userCount = await client.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count, 10) === 0) {
        console.log('[Database:Postgres] Seeding initial users...');
        for (const u of SEED_USERS) {
          await client.query(
            `INSERT INTO users (id, email, password_hash, role, address, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [u.id, u.email, u.passwordHash, u.role, u.address || null, u.createdAt]
          );
        }
      }

      const orderCount = await client.query('SELECT COUNT(*) FROM orders');
      if (parseInt(orderCount.rows[0].count, 10) === 0) {
        console.log('[Database:Postgres] Seeding initial orders...');
        for (const o of SEED_ORDERS) {
          await client.query(
            `INSERT INTO orders (id, user_id, customer_email, customer_name, items, subtotal, tax, shipping, total, payment_method, shipping_address, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              o.id,
              o.userId,
              o.customerEmail,
              o.customerName,
              JSON.stringify(o.items),
              o.subtotal,
              o.tax,
              o.shipping,
              o.total,
              o.paymentMethod,
              JSON.stringify(o.shippingAddress),
              o.status,
              o.createdAt,
            ]
          );
        }
      }

      // 4. Whitelist Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS whitelist (
          email TEXT PRIMARY KEY,
          role TEXT NOT NULL DEFAULT 'customer',
          added_by TEXT NOT NULL DEFAULT 'pharmacist@medistore.test',
          created_at TEXT NOT NULL
        );
      `);

      const wlCount = await client.query('SELECT COUNT(*) FROM whitelist');
      if (parseInt(wlCount.rows[0].count, 10) === 0) {
        console.log('[Database:Postgres] Seeding initial whitelist...');
        for (const w of DEFAULT_WHITELIST) {
          await client.query(
            `INSERT INTO whitelist (email, role, added_by, created_at)
             VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
            [w.email, w.role, w.addedBy, w.createdAt]
          );
        }
      }
    } finally {
      client.release();
    }
  }

  public async getProducts(filters?: {
    q?: string;
    category?: string;
    rx?: boolean;
    inStock?: boolean;
    sort?: string;
  }): Promise<ProductData[]> {
    const res = await this.pool.query('SELECT * FROM products');
    let products: ProductData[] = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category as ProductData['category'],
      price: parseFloat(r.price),
      stock: parseInt(r.stock, 10),
      rx: Boolean(r.rx),
      batchId: r.batch_id,
      dosage: r.dosage,
      illustration: r.illustration,
      featured: Boolean(r.featured),
    }));

    if (filters?.q) {
      const q = filters.q.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.batchId.toLowerCase().includes(q)
      );
    }

    if (filters?.category && filters.category !== 'All') {
      products = products.filter((p) => p.category === filters.category);
    }

    if (filters?.rx !== undefined) {
      products = products.filter((p) => p.rx === filters.rx);
    }

    if (filters?.inStock) {
      products = products.filter((p) => p.stock > 0);
    }

    if (filters?.sort) {
      if (filters.sort === 'price-asc') products.sort((a, b) => a.price - b.price);
      else if (filters.sort === 'price-desc') products.sort((a, b) => b.price - a.price);
      else if (filters.sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name));
      else if (filters.sort === 'featured') products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return products;
  }

  public async getProductById(id: string): Promise<ProductData | undefined> {
    const res = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category as ProductData['category'],
      price: parseFloat(r.price),
      stock: parseInt(r.stock, 10),
      rx: Boolean(r.rx),
      batchId: r.batch_id,
      dosage: r.dosage,
      illustration: r.illustration,
      featured: Boolean(r.featured),
    };
  }

  public async updateProductStock(id: string, stock: number): Promise<ProductData | null> {
    const res = await this.pool.query(
      'UPDATE products SET stock = $1 WHERE id = $2 RETURNING *',
      [stock, id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category as ProductData['category'],
      price: parseFloat(r.price),
      stock: parseInt(r.stock, 10),
      rx: Boolean(r.rx),
      batchId: r.batch_id,
      dosage: r.dosage,
      illustration: r.illustration,
      featured: Boolean(r.featured),
    };
  }

  public async findUserByEmail(email: string): Promise<UserData | undefined> {
    const res = await this.pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role as 'customer' | 'pharmacist',
      address: r.address || undefined,
      createdAt: r.created_at,
    };
  }

  public async findUserById(id: string): Promise<UserData | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role as 'customer' | 'pharmacist',
      address: r.address || undefined,
      createdAt: r.created_at,
    };
  }

  public async createUser(
    email: string,
    passwordHash: string,
    role: 'customer' | 'pharmacist' = 'customer'
  ): Promise<UserData> {
    const id = `usr_${Math.random().toString(36).substring(2, 10)}`;
    const createdAt = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO users (id, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, email, passwordHash, role, createdAt]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      createdAt: r.created_at,
    };
  }

  public async findOrCreateWalletUser(address: string): Promise<UserData> {
    const lower = address.toLowerCase();
    const existing = await this.pool.query(
      'SELECT * FROM users WHERE LOWER(address) = LOWER($1)',
      [lower]
    );
    if (existing.rows.length > 0) {
      const r = existing.rows[0];
      return {
        id: r.id,
        email: r.email,
        passwordHash: r.password_hash,
        role: r.role,
        address: r.address,
        createdAt: r.created_at,
      };
    }

    const id = `usr_w3_${lower.slice(2, 10)}`;
    const email = `${lower.slice(0, 6)}...${lower.slice(-4)}@ethereum.sepolia`;
    const createdAt = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO users (id, email, password_hash, role, address, created_at)
       VALUES ($1, $2, '', 'customer', $3, $4) RETURNING *`,
      [id, email, lower, createdAt]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      address: r.address,
      createdAt: r.created_at,
    };
  }

  public async getOrders(): Promise<OrderData[]> {
    const res = await this.pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      customerEmail: r.customer_email,
      customerName: r.customer_name,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: parseFloat(r.subtotal),
      tax: parseFloat(r.tax),
      shipping: parseFloat(r.shipping),
      total: parseFloat(r.total),
      paymentMethod: r.payment_method,
      shippingAddress: typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  public async getOrderById(id: string): Promise<OrderData | undefined> {
    const res = await this.pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      customerEmail: r.customer_email,
      customerName: r.customer_name,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: parseFloat(r.subtotal),
      tax: parseFloat(r.tax),
      shipping: parseFloat(r.shipping),
      total: parseFloat(r.total),
      paymentMethod: r.payment_method,
      shippingAddress: typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address,
      status: r.status,
      createdAt: r.created_at,
    };
  }

  public async createOrder(order: Omit<OrderData, 'id' | 'createdAt'>): Promise<OrderData> {
    const id = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO orders (id, user_id, customer_email, customer_name, items, subtotal, tax, shipping, total, payment_method, shipping_address, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        id,
        order.userId,
        order.customerEmail,
        order.customerName,
        JSON.stringify(order.items),
        order.subtotal,
        order.tax,
        order.shipping,
        order.total,
        order.paymentMethod,
        JSON.stringify(order.shippingAddress),
        order.status,
        createdAt,
      ]
    );

    // Decrement stock
    for (const item of order.items) {
      await this.pool.query(
        'UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2',
        [item.quantity, item.productId]
      );
    }

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      customerEmail: r.customer_email,
      customerName: r.customer_name,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: parseFloat(r.subtotal),
      tax: parseFloat(r.tax),
      shipping: parseFloat(r.shipping),
      total: parseFloat(r.total),
      paymentMethod: r.payment_method,
      shippingAddress: typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address,
      status: r.status,
      createdAt: r.created_at,
    };
  }

  public async updateOrderStatus(id: string, status: OrderData['status']): Promise<OrderData | null> {
    const res = await this.pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      customerEmail: r.customer_email,
      customerName: r.customer_name,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: parseFloat(r.subtotal),
      tax: parseFloat(r.tax),
      shipping: parseFloat(r.shipping),
      total: parseFloat(r.total),
      paymentMethod: r.payment_method,
      shippingAddress: typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address,
      status: r.status,
      createdAt: r.created_at,
    };
  }

  public async getWhitelist(): Promise<WhitelistEntry[]> {
    const res = await this.pool.query(
      'SELECT email, role, added_by, created_at FROM whitelist ORDER BY created_at DESC'
    );
    return res.rows.map((r) => ({
      email: r.email,
      role: r.role as 'customer' | 'pharmacist',
      addedBy: r.added_by,
      createdAt: r.created_at,
    }));
  }

  public async addToWhitelist(
    email: string,
    role: 'customer' | 'pharmacist' = 'customer',
    addedBy = 'pharmacist@medistore.test'
  ): Promise<WhitelistEntry> {
    const normalized = email.toLowerCase().trim();
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO whitelist (email, role, added_by, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role`,
      [normalized, role, addedBy, now]
    );

    // Auto-create or ensure user exists in users table with Demo@12345 password
    const existing = await this.findUserByEmail(normalized);
    if (!existing) {
      const { DEMO_PASSWORD_HASH } = await import('./seedData.js');
      await this.createUser(normalized, DEMO_PASSWORD_HASH, role);
    }

    return { email: normalized, role, addedBy, createdAt: now };
  }

  public async removeFromWhitelist(email: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM whitelist WHERE LOWER(email) = LOWER($1)', [
      email.toLowerCase().trim(),
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  public async isWhitelisted(email: string): Promise<boolean> {
    const res = await this.pool.query('SELECT 1 FROM whitelist WHERE LOWER(email) = LOWER($1)', [
      email.toLowerCase().trim(),
    ]);
    return res.rows.length > 0;
  }

  public async reset(): Promise<void> {
    await this.pool.query('DELETE FROM orders');
    await this.pool.query('DELETE FROM users');
    await this.pool.query('DELETE FROM products');
    await this.pool.query('DELETE FROM whitelist');
    await this.initialize();
  }
}

// ---------------------------------------------------------------------------
// 2. MongoDB Adapter
// ---------------------------------------------------------------------------
export class MongoAdapter implements StorageAdapter {
  public type: 'mongodb' = 'mongodb';
  private client: MongoClient;
  private db!: Db;

  constructor(connectionUri: string) {
    this.client = new MongoClient(connectionUri);
  }

  public async initialize(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db();

    const usersCol = this.db.collection('users');
    const productsCol = this.db.collection('products');
    const ordersCol = this.db.collection('orders');

    await usersCol.createIndex({ email: 1 }, { unique: true, sparse: true });
    await usersCol.createIndex({ address: 1 }, { sparse: true });
    await productsCol.createIndex({ id: 1 }, { unique: true });
    await ordersCol.createIndex({ id: 1 }, { unique: true });

    // Seed if empty
    const prodCount = await productsCol.countDocuments();
    if (prodCount === 0) {
      console.log('[Database:MongoDB] Seeding initial products...');
      await productsCol.insertMany(JSON.parse(JSON.stringify(SEED_PRODUCTS)));
    }

    const userCount = await usersCol.countDocuments();
    if (userCount === 0) {
      console.log('[Database:MongoDB] Seeding initial users...');
      await usersCol.insertMany(JSON.parse(JSON.stringify(SEED_USERS)));
    }

    const orderCount = await ordersCol.countDocuments();
    if (orderCount === 0) {
      console.log('[Database:MongoDB] Seeding initial orders...');
      await ordersCol.insertMany(JSON.parse(JSON.stringify(SEED_ORDERS)));
    }
  }

  public async getProducts(filters?: {
    q?: string;
    category?: string;
    rx?: boolean;
    inStock?: boolean;
    sort?: string;
  }): Promise<ProductData[]> {
    const products = (await this.db
      .collection<ProductData>('products')
      .find({}, { projection: { _id: 0 } })
      .toArray()) as ProductData[];

    let result = products;
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.batchId.toLowerCase().includes(q)
      );
    }
    if (filters?.category && filters.category !== 'All') {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters?.rx !== undefined) {
      result = result.filter((p) => p.rx === filters.rx);
    }
    if (filters?.inStock) {
      result = result.filter((p) => p.stock > 0);
    }
    if (filters?.sort) {
      if (filters.sort === 'price-asc') result.sort((a, b) => a.price - b.price);
      else if (filters.sort === 'price-desc') result.sort((a, b) => b.price - a.price);
      else if (filters.sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
      else if (filters.sort === 'featured') result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return result;
  }

  public async getProductById(id: string): Promise<ProductData | undefined> {
    const prod = await this.db
      .collection<ProductData>('products')
      .findOne({ id }, { projection: { _id: 0 } });
    return prod || undefined;
  }

  public async updateProductStock(id: string, stock: number): Promise<ProductData | null> {
    const res = await this.db
      .collection<ProductData>('products')
      .findOneAndUpdate(
        { id },
        { $set: { stock } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
    return res || null;
  }

  public async findUserByEmail(email: string): Promise<UserData | undefined> {
    const user = await this.db
      .collection<UserData>('users')
      .findOne(
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        { projection: { _id: 0 } }
      );
    return user || undefined;
  }

  public async findUserById(id: string): Promise<UserData | undefined> {
    const user = await this.db
      .collection<UserData>('users')
      .findOne({ id }, { projection: { _id: 0 } });
    return user || undefined;
  }

  public async createUser(
    email: string,
    passwordHash: string,
    role: 'customer' | 'pharmacist' = 'customer'
  ): Promise<UserData> {
    const user: UserData = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };
    await this.db.collection('users').insertOne({ ...user });
    return user;
  }

  public async findOrCreateWalletUser(address: string): Promise<UserData> {
    const lower = address.toLowerCase();
    const existing = await this.db
      .collection<UserData>('users')
      .findOne(
        { address: { $regex: new RegExp(`^${lower}$`, 'i') } },
        { projection: { _id: 0 } }
      );
    if (existing) return existing;

    const user: UserData = {
      id: `usr_w3_${lower.slice(2, 10)}`,
      email: `${lower.slice(0, 6)}...${lower.slice(-4)}@ethereum.sepolia`,
      passwordHash: '',
      role: 'customer',
      address: lower,
      createdAt: new Date().toISOString(),
    };
    await this.db.collection('users').insertOne({ ...user });
    return user;
  }

  public async getOrders(): Promise<OrderData[]> {
    return (await this.db
      .collection<OrderData>('orders')
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray()) as OrderData[];
  }

  public async getOrderById(id: string): Promise<OrderData | undefined> {
    const order = await this.db
      .collection<OrderData>('orders')
      .findOne({ id }, { projection: { _id: 0 } });
    return order || undefined;
  }

  public async createOrder(order: Omit<OrderData, 'id' | 'createdAt'>): Promise<OrderData> {
    const newOrder: OrderData = {
      ...order,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    await this.db.collection('orders').insertOne({ ...newOrder });

    for (const item of newOrder.items) {
      await this.db
        .collection('products')
        .updateOne({ id: item.productId }, { $inc: { stock: -item.quantity } });
    }

    return newOrder;
  }

  public async updateOrderStatus(id: string, status: OrderData['status']): Promise<OrderData | null> {
    const res = await this.db
      .collection<OrderData>('orders')
      .findOneAndUpdate(
        { id },
        { $set: { status } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
    return res || null;
  }

  public async getWhitelist(): Promise<WhitelistEntry[]> {
    return (await this.db
      .collection<WhitelistEntry>('whitelist')
      .find({}, { projection: { _id: 0 } })
      .toArray()) as WhitelistEntry[];
  }

  public async addToWhitelist(
    email: string,
    role: 'customer' | 'pharmacist' = 'customer',
    addedBy = 'pharmacist@medistore.test'
  ): Promise<WhitelistEntry> {
    const normalized = email.toLowerCase().trim();
    const entry: WhitelistEntry = {
      email: normalized,
      role,
      addedBy,
      createdAt: new Date().toISOString(),
    };
    await this.db.collection('whitelist').updateOne(
      { email: normalized },
      { $set: entry },
      { upsert: true }
    );
    const existing = await this.findUserByEmail(normalized);
    if (!existing) {
      const { DEMO_PASSWORD_HASH } = await import('./seedData.js');
      await this.createUser(normalized, DEMO_PASSWORD_HASH, role);
    }
    return entry;
  }

  public async removeFromWhitelist(email: string): Promise<boolean> {
    const res = await this.db.collection('whitelist').deleteOne({ email: email.toLowerCase().trim() });
    return (res.deletedCount || 0) > 0;
  }

  public async isWhitelisted(email: string): Promise<boolean> {
    const count = await this.db.collection('whitelist').countDocuments({ email: email.toLowerCase().trim() });
    return count > 0;
  }

  public async reset(): Promise<void> {
    await this.db.collection('orders').deleteMany({});
    await this.db.collection('users').deleteMany({});
    await this.db.collection('products').deleteMany({});
    await this.db.collection('whitelist').deleteMany({});
    await this.initialize();
  }
}

// ---------------------------------------------------------------------------
// 3. In-Memory Adapter (Zero-Config Fallback)
// ---------------------------------------------------------------------------
export class MemoryAdapter implements StorageAdapter {
  public type: 'memory' = 'memory';
  public products: ProductData[] = [];
  public users: UserData[] = [];
  public orders: OrderData[] = [];
  public whitelist: WhitelistEntry[] = [];

  constructor() {
    this.resetSync();
  }

  public resetSync() {
    this.products = JSON.parse(JSON.stringify(SEED_PRODUCTS));
    this.users = JSON.parse(JSON.stringify(SEED_USERS));
    this.orders = JSON.parse(JSON.stringify(SEED_ORDERS));
    this.whitelist = JSON.parse(JSON.stringify(DEFAULT_WHITELIST));
  }

  public async reset(): Promise<void> {
    this.resetSync();
  }

  public async getProducts(filters?: {
    q?: string;
    category?: string;
    rx?: boolean;
    inStock?: boolean;
    sort?: string;
  }): Promise<ProductData[]> {
    let result = [...this.products];
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.batchId.toLowerCase().includes(q)
      );
    }
    if (filters?.category && filters.category !== 'All') {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters?.rx !== undefined) {
      result = result.filter((p) => p.rx === filters.rx);
    }
    if (filters?.inStock) {
      result = result.filter((p) => p.stock > 0);
    }
    if (filters?.sort) {
      if (filters.sort === 'price-asc') result.sort((a, b) => a.price - b.price);
      else if (filters.sort === 'price-desc') result.sort((a, b) => b.price - a.price);
      else if (filters.sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
      else if (filters.sort === 'featured') result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return result;
  }

  public async getProductById(id: string): Promise<ProductData | undefined> {
    return this.products.find((p) => p.id === id);
  }

  public async updateProductStock(id: string, stock: number): Promise<ProductData | null> {
    const p = this.products.find((item) => item.id === id);
    if (!p) return null;
    p.stock = stock;
    return p;
  }

  public async findUserByEmail(email: string): Promise<UserData | undefined> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public async findUserById(id: string): Promise<UserData | undefined> {
    return this.users.find((u) => u.id === id);
  }

  public async createUser(
    email: string,
    passwordHash: string,
    role: 'customer' | 'pharmacist' = 'customer'
  ): Promise<UserData> {
    const user: UserData = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  public async findOrCreateWalletUser(address: string): Promise<UserData> {
    const lower = address.toLowerCase();
    const existing = this.users.find((u) => u.address?.toLowerCase() === lower);
    if (existing) return existing;

    const user: UserData = {
      id: `usr_w3_${lower.slice(2, 10)}`,
      email: `${lower.slice(0, 6)}...${lower.slice(-4)}@ethereum.sepolia`,
      passwordHash: '',
      role: 'customer',
      address: lower,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  public async getOrders(): Promise<OrderData[]> {
    return [...this.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getOrderById(id: string): Promise<OrderData | undefined> {
    return this.orders.find((o) => o.id === id);
  }

  public async createOrder(order: Omit<OrderData, 'id' | 'createdAt'>): Promise<OrderData> {
    const newOrder: OrderData = {
      ...order,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);

    for (const item of newOrder.items) {
      const prod = this.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    }

    return newOrder;
  }

  public async updateOrderStatus(id: string, status: OrderData['status']): Promise<OrderData | null> {
    const order = this.orders.find((o) => o.id === id);
    if (!order) return null;
    order.status = status;
    return order;
  }

  public async getWhitelist(): Promise<WhitelistEntry[]> {
    return [...this.whitelist];
  }

  public async addToWhitelist(
    email: string,
    role: 'customer' | 'pharmacist' = 'customer',
    addedBy = 'pharmacist@medistore.test'
  ): Promise<WhitelistEntry> {
    const normalized = email.toLowerCase().trim();
    const now = new Date().toISOString();
    let entry = this.whitelist.find((w) => w.email.toLowerCase() === normalized);
    if (entry) {
      entry.role = role;
    } else {
      entry = { email: normalized, role, addedBy, createdAt: now };
      this.whitelist.push(entry);
    }
    const existing = await this.findUserByEmail(normalized);
    if (!existing) {
      const { DEMO_PASSWORD_HASH } = await import('./seedData.js');
      await this.createUser(normalized, DEMO_PASSWORD_HASH, role);
    }
    return entry;
  }

  public async removeFromWhitelist(email: string): Promise<boolean> {
    const idx = this.whitelist.findIndex((w) => w.email.toLowerCase() === email.toLowerCase().trim());
    if (idx !== -1) {
      this.whitelist.splice(idx, 1);
      return true;
    }
    return false;
  }

  public async isWhitelisted(email: string): Promise<boolean> {
    return this.whitelist.some((w) => w.email.toLowerCase() === email.toLowerCase().trim());
  }
}
