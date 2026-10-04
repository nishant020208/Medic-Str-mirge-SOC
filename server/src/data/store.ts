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

  public reset() {
    this.memoryFallback.resetSync();
    this.nonces.clear();
    if (this.adapter !== this.memoryFallback) {
      this.adapter.reset().catch((err) => {
        console.warn('[Database] Reset error:', err.message);
      });
    }
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

  // Fast Ephemeral Nonces (stored with TTL for SIWE auth)
  public createNonce(domain: string): string {
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min expiry
    this.nonces.set(nonce, { nonce, domain, expiresAt });
    return nonce;
  }

  public verifyAndConsumeNonce(nonce: string): boolean {
    const entry = this.nonces.get(nonce);
    if (!entry) return false;
    this.nonces.delete(nonce);
    if (Date.now() > entry.expiresAt) return false;
    return true;
  }
}

export const store = new UnifiedStore();

/**
 * Initializes database connection if environment variables are provided.
 * Fallbacks gracefully to high-performance in-memory store if unset or on error.
 */
export async function initDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || process.env.database_url;
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;

  if (dbUrl) {
    try {
      const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
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
