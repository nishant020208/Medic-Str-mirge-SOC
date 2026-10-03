export type ProductCategory =
  | 'Pain Relief'
  | 'Cold & Flu'
  | 'Digestive'
  | 'Vitamins'
  | 'First Aid'
  | 'Herbal';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  rx: boolean;
  batchId: string;
  description: string;
  dosage: string;
  illustration: string; // SVG icon type or name
  rating?: number;
  reviewsCount?: number;
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  role: 'customer' | 'pharmacist';
  address?: string; // Web3 wallet address if connected
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  batchId: string;
}

export interface Order {
  id: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'Pending' | 'Dispensed' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'Credit Card (Demo)' | 'Wallet (Sepolia Mock)';
  createdAt: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface BatchVerificationResult {
  batchId: string;
  hash: string;
  isRegistered: boolean;
  timestamp?: string;
  txHash?: string;
  blockNumber?: number;
  network: string;
  contractAddress?: string;
}
