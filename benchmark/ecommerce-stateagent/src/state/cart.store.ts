import { defineStore, z, getDefaultActor } from 'state-agent';
import type { CartItem, Product } from '../types';

export const cart = defineStore({
  name: 'cart',
  schema: z.object({
    items: z.array(z.any()),
  }),
  initial: {
    items: [] as CartItem[],
  },
  when: {
    isEmpty: (s) => s.items.length === 0,
    hasItems: (s) => s.items.length > 0,
    qualifiesForFreeShipping: (s) => {
      const subtotal = (s.items as CartItem[]).reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      return subtotal > 100;
    },
  },
  gates: {
    canCheckout: (s) => s.items.length > 0,
  },
  computed: {
    itemCount: (s) => (s.items as CartItem[]).reduce((sum, i) => sum + i.quantity, 0),
    subtotal: (s) => (s.items as CartItem[]).reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    tax: (s) => {
      const subtotal = (s.items as CartItem[]).reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      return Math.round(subtotal * 0.08 * 100) / 100;
    },
    shipping: (s) => {
      const subtotal = (s.items as CartItem[]).reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      return subtotal > 100 ? 0 : 9.99;
    },
    total: (s) => {
      const subtotal = (s.items as CartItem[]).reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const shipping = subtotal > 100 ? 0 : 9.99;
      return Math.round((subtotal + tax + shipping) * 100) / 100;
    },
  },
  dependencies: {
    reads: ['products'],
    gatedBy: ['auth'],
    triggers: [],
  },
});

export function addItem(product: Product): void {
  const actor = getDefaultActor();
  cart.store.update((draft) => {
    const existing = (draft.items as CartItem[]).find((i) => i.product.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      draft.items.push({ product, quantity: 1 });
    }
  }, actor);
}

export function removeItem(productId: string): void {
  const actor = getDefaultActor();
  cart.store.update((draft) => {
    draft.items = (draft.items as CartItem[]).filter((i) => i.product.id !== productId);
  }, actor);
}

export function updateQuantity(productId: string, quantity: number): void {
  const actor = getDefaultActor();
  cart.store.update((draft) => {
    if (quantity <= 0) {
      draft.items = (draft.items as CartItem[]).filter((i) => i.product.id !== productId);
    } else {
      const item = (draft.items as CartItem[]).find((i) => i.product.id === productId);
      if (item) item.quantity = quantity;
    }
  }, actor);
}

export function clearCart(): void {
  const actor = getDefaultActor();
  cart.store.update((draft) => {
    draft.items = [];
  }, actor);
}
