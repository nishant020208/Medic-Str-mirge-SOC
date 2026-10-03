import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getShipping: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return { items: [...state.items, { product, quantity }] };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },
      getTax: () => {
        return Math.round(get().getSubtotal() * 0.08 * 100) / 100;
      },
      getShipping: () => {
        return get().items.length > 0 ? 5.0 : 0;
      },
      getTotal: () => {
        const sub = get().getSubtotal();
        if (sub === 0) return 0;
        return Math.round((sub + get().getTax() + get().getShipping()) * 100) / 100;
      },
    }),
    {
      name: 'medistore_cart',
    }
  )
);
