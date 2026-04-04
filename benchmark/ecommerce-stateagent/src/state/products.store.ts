import { defineStore, z, getDefaultActor } from 'state-agent';
import type { Product, ProductCategory } from '../types';

// ── Seed data ──

const SEED_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Wireless Headphones', description: 'Noise-cancelling over-ear headphones', price: 149.99, category: 'electronics', inStock: true, imageUrl: '/headphones.jpg', rating: 4.5 },
  { id: 'p2', name: 'Running Shoes', description: 'Lightweight trail running shoes', price: 89.99, category: 'sports', inStock: true, imageUrl: '/shoes.jpg', rating: 4.2 },
  { id: 'p3', name: 'TypeScript Handbook', description: 'Complete guide to TypeScript', price: 39.99, category: 'books', inStock: true, imageUrl: '/ts-book.jpg', rating: 4.8 },
  { id: 'p4', name: 'Cotton T-Shirt', description: 'Premium organic cotton crew neck', price: 29.99, category: 'clothing', inStock: true, imageUrl: '/tshirt.jpg', rating: 4.0 },
  { id: 'p5', name: 'Smart Watch', description: 'Fitness tracker with GPS', price: 249.99, category: 'electronics', inStock: false, imageUrl: '/watch.jpg', rating: 4.3 },
  { id: 'p6', name: 'Yoga Mat', description: 'Non-slip exercise mat', price: 34.99, category: 'sports', inStock: true, imageUrl: '/yoga.jpg', rating: 4.6 },
  { id: 'p7', name: 'Desk Lamp', description: 'LED desk lamp with dimmer', price: 44.99, category: 'home', inStock: true, imageUrl: '/lamp.jpg', rating: 4.1 },
  { id: 'p8', name: 'React Patterns Book', description: 'Advanced React design patterns', price: 49.99, category: 'books', inStock: true, imageUrl: '/react-book.jpg', rating: 4.7 },
  { id: 'p9', name: 'Winter Jacket', description: 'Waterproof insulated jacket', price: 199.99, category: 'clothing', inStock: false, imageUrl: '/jacket.jpg', rating: 4.4 },
  { id: 'p10', name: 'Bluetooth Speaker', description: 'Portable waterproof speaker', price: 79.99, category: 'electronics', inStock: true, imageUrl: '/speaker.jpg', rating: 4.3 },
];

export const products = defineStore({
  name: 'products',
  schema: z.object({
    products: z.array(z.any()),
    filters: z.object({
      query: z.string(),
      category: z.string(),
      minPrice: z.number(),
      maxPrice: z.number(),
      inStockOnly: z.boolean(),
    }),
    isLoading: z.boolean(),
    error: z.union([z.string(), z.null()]),
  }),
  initial: {
    products: [] as Product[],
    filters: {
      query: '',
      category: 'all' as ProductCategory | 'all',
      minPrice: 0,
      maxPrice: 1000,
      inStockOnly: false,
    },
    isLoading: false,
    error: null as string | null,
  },
  when: {
    isLoading: (s) => s.isLoading,
    hasError: (s) => s.error !== null,
    isEmpty: (s) => s.products.length === 0,
  },
  gates: {
    hasProducts: (s) => s.products.length > 0,
  },
  computed: {
    filteredProducts: (s) => {
      return (s.products as Product[]).filter((p) => {
        if (s.filters.query) {
          const q = s.filters.query.toLowerCase();
          if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
        }
        if (s.filters.category !== 'all' && p.category !== s.filters.category) return false;
        if (p.price < s.filters.minPrice || p.price > s.filters.maxPrice) return false;
        if (s.filters.inStockOnly && !p.inStock) return false;
        return true;
      });
    },
    filteredCount: (s) => {
      return (s.products as Product[]).filter((p) => {
        if (s.filters.query) {
          const q = s.filters.query.toLowerCase();
          if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
        }
        if (s.filters.category !== 'all' && p.category !== s.filters.category) return false;
        if (p.price < s.filters.minPrice || p.price > s.filters.maxPrice) return false;
        if (s.filters.inStockOnly && !p.inStock) return false;
        return true;
      }).length;
    },
    totalProducts: (s) => s.products.length,
    categoryCount: (s) => {
      const counts: Record<string, number> = {};
      for (const p of s.products as Product[]) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
      return counts;
    },
    priceRange: (s) => {
      const ps = s.products as Product[];
      if (ps.length === 0) return { min: 0, max: 0 };
      const prices = ps.map((p) => p.price);
      return { min: Math.min(...prices), max: Math.max(...prices) };
    },
    averageRating: (s) => {
      const ps = s.products as Product[];
      if (ps.length === 0) return 0;
      const total = ps.reduce((sum, p) => sum + p.rating, 0);
      return Math.round((total / ps.length) * 10) / 10;
    },
  },
  dependencies: {
    reads: [],
    gatedBy: ['auth'],
    triggers: [],
  },
});

export async function fetchProducts(): Promise<void> {
  const actor = getDefaultActor();
  products.store.update((draft) => {
    draft.isLoading = true;
  }, actor);

  await new Promise((r) => setTimeout(r, 600));

  products.store.update((draft) => {
    draft.products = SEED_PRODUCTS;
    draft.isLoading = false;
    draft.error = null;
  }, actor);
}

export function setFilters(filters: Partial<{ query: string; category: ProductCategory | 'all'; minPrice: number; maxPrice: number; inStockOnly: boolean }>): void {
  const actor = getDefaultActor();
  products.store.update((draft) => {
    Object.assign(draft.filters, filters);
  }, actor);
}

export function resetFilters(): void {
  const actor = getDefaultActor();
  products.store.update((draft) => {
    draft.filters = { query: '', category: 'all', minPrice: 0, maxPrice: 1000, inStockOnly: false };
  }, actor);
}
