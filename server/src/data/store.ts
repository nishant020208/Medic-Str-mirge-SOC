import {
  StorageAdapter,
  PostgresAdapter,
  MongoAdapter,
  MemoryAdapter,
  WhitelistEntry,
} from './db.js';
import { ProductData, UserData, OrderData } from './seedData.js';

class UnifiedStore {
  private adapter: StorageAdapter;
  private memoryFallback: MemoryAdapter;
  private nonces: Map<string, { nonce: string; domain: string; expiresAt: number }> =
    new Map();

  constructor() {
    this.memoryFallback = new MemoryAdapter();
    this.adapter = this.memoryFallback;
  }

  // Getters for seed scripts and backwards compatibility
  public get products(): ProductData[] {
    return this.memoryFallback.products;
  }

  public get users(): UserData[] {
    return this.memoryFallback.users;
  }

  public get orders(): OrderData[] {
    return this.memoryFallback.orders;
  }

  public get storageType(): 'postgres' | 'mongodb' | 'memory' {
    return this.adapter.type;
  }

  public async setAdapter(newAdapter: StorageAdapter) {
    this.adapter = newAdapter;
  }

  public reset(): Promise<void> {
    this.memoryFallback.resetSync();
    this.nonces.clear();
    if (this.adapter !== this.memoryFallback) {
      // Attach a catch so un-awaited callers can never trigger an unhandled
      // rejection, and return the same promise so scripts can await the wipe.
      return this.adapter.reset().catch((err) => {
        console.warn('[Database] Reset error:', err.message);
      });
    }
    return Promise.resolve();
  }

  // Product methods
  public async getProducts(filters?: {
    q?: string;
    category?: string;
    rx?: boolean;
    inStock?: boolean;
    sort?: string;
  }): Promise<ProductData[]> {
    return await this.adapter.getProducts(filters);
  }

  public async getProductById(id: string): Promise<ProductData | undefined> {
    return await this.adapter.getProductById(id);
  }

  public async updateProductStock(id: string, stock: number): Promise<ProductData | null> {
    const updated = await this.adapter.updateProductStock(id, stock);
    if (this.adapter !== this.memoryFallback) {
      this.memoryFallback.updateProductStock(id, stock);
    }
    return updated;
  }

  // User methods
  public async findUserByEmail(email: string): Promise<UserData | undefined> {
    return await this.adapter.findUserByEmail(email);
  }

  public async findUserById(id: string): Promise<UserData | undefined> {
    return await this.adapter.findUserById(id);
  }

  public async createUser(
    email: string,
    passwordHash: string,
    role: 'customer' | 'pharmacist' = 'customer'
  ): Promise<UserData> {
    const created = await this.adapter.createUser(email, passwordHash, role);
    if (this.adapter !== this.memoryFallback) {
      this.memoryFallback.users.push(created);
    }
    return created;
  }

  public async findOrCreateWalletUser(address: string): Promise<UserData> {
    const user = await this.adapter.findOrCreateWalletUser(address);
    if (this.adapter !== this.memoryFallback) {
      const existing = this.memoryFallback.users.find(
        (u) => u.address?.toLowerCase() === address.toLowerCase()
      );
      if (!existing) this.memoryFallback.users.push(user);
    }
    return user;
  }

  // Order methods
  public async getOrders(): Promise<OrderData[]> {
    return await this.adapter.getOrders();
  }

  public async getOrderById(id: string): Promise<OrderData | undefined> {
    return await this.adapter.getOrderById(id);
  }

  public async createOrder(order: Omit<OrderData, 'id' | 'createdAt'>): Promise<OrderData> {
    const created = await this.adapter.createOrder(order);
    if (this.adapter !== this.memoryFallback) {
      this.memoryFallback.orders.unshift(created);
    }
    return created;
  }

  public async updateOrderStatus(
    id: string,
    status: OrderData['status']
  ): Promise<OrderData | null> {
    const updated = await this.adapter.updateOrderStatus(id, status);
    if (this.adapter !== this.memoryFallback) {
      this.memoryFallback.updateOrderStatus(id, status);
    }
    return updated;
  }

  // Whitelist methods
  public async getWhitelist(): Promise<WhitelistEntry[]> {
    return await this.adapter.getWhitelist();
  }

  public async addToWhitelist(
    email: string,
    role: 'customer' | 'pharmacist' = 'customer',
    addedBy = 'pharmacist@medistore.test'
  ): Promise<WhitelistEntry> {
    const entry = await this.adapter.addToWhitelist(email, role, addedBy);
    if (this.adapter !== this.memoryFallback) {
      await this.memoryFallback.addToWhitelist(email, role, addedBy);
    }
    return entry;
  }

  public async removeFromWhitelist(email: string): Promise<boolean> {
    const res = await this.adapter.removeFromWhitelist(email);
    if (this.adapter !== this.memoryFallback) {
      await this.memoryFallback.removeFromWhitelist(email);
    }
    return res;
  }

  public async isWhitelisted(email: string): Promise<boolean> {
    return await this.adapter.isWhitelisted(email);
  }

  // Nonces (PostgreSQL backed, memory fallback in offline tests)
  public async createNonce(domain: string): Promise<string> {
    if (this.adapter.createNonce) {
      return await this.adapter.createNonce(domain);
    }
    return this.memoryFallback.createNonce(domain);
  }

  public async verifyAndConsumeNonce(nonce: string): Promise<boolean> {
    if (this.adapter.verifyAndConsumeNonce) {
      return await this.adapter.verifyAndConsumeNonce(nonce);
    }
    return this.memoryFallback.verifyAndConsumeNonce(nonce);
  }

  public async logOracle(prompt: string, reply: string, source: string): Promise<void> {
    if (this.adapter.logOracle) {
      await this.adapter.logOracle(prompt, reply, source);
    }
  }
}

export const store = new UnifiedStore();

/**
 * Tracks database initialization so request handlers can wait for the real
 * adapter instead of silently serving from the in-memory fallback.
 */
let readyPromise: Promise<void> = Promise.resolve();

export function whenStoreReady(): Promise<void> {
  // Bound how long any single request waits. Past this we serve from the
  // in-memory store rather than risk an upstream client timeout.
  return Promise.race([
    readyPromise,
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, READY_WAIT_MS);
      if (typeof t.unref === 'function') t.unref();
    }),
  ]);
}

/**
 * How long an API request may wait for the database before falling back to the
 * in-memory store. Deliberately short: a cold pooler connection can take ~5s, and a
 * request that blocks longer than the caller's timeout fails outright, which is
 * worse than briefly serving seed data from memory.
 */
const READY_WAIT_MS = 2_000;

/**
 * Starts database initialization in the background and records readiness.
 * Guarantees the returned promise settles, so a hanging connection can never
 * wedge a serverless invocation indefinitely.
 */
export function initDatabaseInBackground(timeoutMs = 20_000): Promise<void> {
  readyPromise = Promise.race([
    initDatabase(),
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        console.warn('[Database] Initialization timed out; continuing with current store.');
        resolve();
      }, timeoutMs);
      if (typeof t.unref === 'function') t.unref();
    }),
  ]).catch((err) => {
    console.warn('[Database] Initialization error:', err.message);
  });
  return readyPromise;
}

/**
 * Initializes database connection if environment variables are provided.
 * Fallbacks gracefully to high-performance in-memory store if unset or on error.
 */
export async function initDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || process.env.database_url;
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;

  if (dbUrl) {
    try {
      // Mask ALL userinfo: passwords may themselves contain '@'.
      const masked = dbUrl.replace(/^(.*:\/\/)[^/]*@/, '$1****@');
      console.log(`[Database] DATABASE_URL detected. Connecting to PostgreSQL (${masked})...`);
      const pgAdapter = new PostgresAdapter(dbUrl);
      await pgAdapter.initialize();
      await store.setAdapter(pgAdapter);
      console.log('✅ [Database] PostgreSQL connected successfully. Dispensary schema & data synchronized.');
      return;
    } catch (err: any) {
      console.warn(`⚠️ [Database] PostgreSQL connection failed: ${err.message}`);
      console.warn('⚠️ [Database] Falling back to In-Memory Dispensary Store to prevent downtime.');
    }
  } else if (mongoUri) {
    try {
      const masked = mongoUri.replace(/:([^:@]+)@/, ':****@');
      console.log(`[Database] MONGODB_URI detected. Connecting to MongoDB (${masked})...`);
      const mongoAdapter = new MongoAdapter(mongoUri);
      await mongoAdapter.initialize();
      await store.setAdapter(mongoAdapter);
      console.log('✅ [Database] MongoDB connected successfully. Collections & indices synchronized.');
      return;
    } catch (err: any) {
      console.warn(`⚠️ [Database] MongoDB connection failed: ${err.message}`);
      console.warn('⚠️ [Database] Falling back to In-Memory Dispensary Store to prevent downtime.');
    }
  } else {
    console.log('ℹ️ [Database] No DATABASE_URL or MONGODB_URI configured.');
    console.log('ℹ️ [Database] Running with zero-config In-Memory Dispensary Store. (Enter keys anytime to connect seamlessly)');
  }
}
