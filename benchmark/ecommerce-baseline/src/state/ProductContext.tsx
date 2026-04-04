import React, { createContext, useReducer, useCallback, useContext } from 'react';
import type { Product, ProductState, ProductAction, ProductFilters, ProductCategory } from '../types';

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

const DEFAULT_FILTERS: ProductFilters = {
  query: '',
  category: 'all',
  minPrice: 0,
  maxPrice: 1000,
  inStockOnly: false,
};

const initialState: ProductState = {
  products: [],
  filters: DEFAULT_FILTERS,
  isLoading: false,
  error: null,
};

function productReducer(state: ProductState, action: ProductAction): ProductState {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, isLoading: false, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: DEFAULT_FILTERS };
    default:
      return state;
  }
}

interface ProductContextValue {
  state: ProductState;
  fetchProducts: () => Promise<void>;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
}

export const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(productReducer, initialState);

  const fetchProducts = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    // Simulate 600ms network delay
    await new Promise((r) => setTimeout(r, 600));
    dispatch({ type: 'SET_PRODUCTS', payload: SEED_PRODUCTS });
  }, []);

  const setFilters = useCallback((filters: Partial<ProductFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  return (
    <ProductContext.Provider value={{ state, fetchProducts, setFilters, resetFilters }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProductContext(): ProductContextValue {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProductContext must be used within ProductProvider');
  return ctx;
}
