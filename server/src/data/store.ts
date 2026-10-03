import {
  SEED_PRODUCTS,
  SEED_USERS,
  SEED_ORDERS,
  ProductData,
  UserData,
  OrderData,
} from './seedData.js';

class InMemoryStore {
  public products: ProductData[] = [];
  public users: UserData[] = [];
  public orders: OrderData[] = [];
  public nonces: Map<string, { nonce: string; domain: string; expiresAt: number }> =
    new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.products = JSON.parse(JSON.stringify(SEED_PRODUCTS));
    this.users = JSON.parse(JSON.stringify(SEED_USERS));
    this.orders = JSON.parse(JSON.stringify(SEED_ORDERS));
    this.nonces.clear();
  }

  // Product methods
  public getProducts(filters?: {
    q?: string;
    category?: string;
    rx?: boolean;
    inStock?: boolean;
    sort?: string;
  }): ProductData[] {
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
      if (filters.sort === 'price-asc') {
        result.sort((a, b) => a.price - b.price);
      } else if (filters.sort === 'price-desc') {
        result.sort((a, b) => b.price - a.price);
      } else if (filters.sort === 'name') {
        result.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filters.sort === 'featured') {
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      }
    }

    return result;
  }

  public getProductById(id: string): ProductData | undefined {
    return this.products.find((p) => p.id === id);
  }

  public updateProductStock(id: string, stock: number): ProductData | null {
    const p = this.getProductById(id);
    if (!p) return null;
    p.stock = stock;
    return p;
  }

  // User methods
  public findUserByEmail(email: string): UserData | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): UserData | undefined {
    return this.users.find((u) => u.id === id);
  }

  public createUser(email: string, passwordHash: string, role: 'customer' | 'pharmacist' = 'customer'): UserData {
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

  public findOrCreateWalletUser(address: string): UserData {
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

  // Order methods
  public getOrders(): OrderData[] {
    return [...this.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getOrderById(id: string): OrderData | undefined {
    return this.orders.find((o) => o.id === id);
  }

  public createOrder(order: Omit<OrderData, 'id' | 'createdAt'>): OrderData {
    const newOrder: OrderData = {
      ...order,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);

    // Decrement product stock
    for (const item of newOrder.items) {
      const prod = this.getProductById(item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    }

    return newOrder;
  }

  public updateOrderStatus(id: string, status: OrderData['status']): OrderData | null {
    const order = this.getOrderById(id);
    if (!order) return null;
    order.status = status;
    return order;
  }

  // Nonce storage
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

export const store = new InMemoryStore();
