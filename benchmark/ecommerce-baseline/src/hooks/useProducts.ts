import { useMemo } from 'react';
import { useProductContext } from '../state/ProductContext';
import type { Product, ProductFilters } from '../types';

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((p) => {
    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    // Category filter
    if (filters.category !== 'all' && p.category !== filters.category) return false;
    // Price range
    if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
    // Stock filter
    if (filters.inStockOnly && !p.inStock) return false;
    return true;
  });
}

export function useProducts() {
  const { state, fetchProducts, setFilters, resetFilters } = useProductContext();

  const filteredProducts = useMemo(
    () => applyFilters(state.products, state.filters),
    [state.products, state.filters]
  );

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of state.products) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [state.products]);

  const priceRange = useMemo(() => {
    if (state.products.length === 0) return { min: 0, max: 0 };
    const prices = state.products.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [state.products]);

  const averageRating = useMemo(() => {
    if (state.products.length === 0) return 0;
    const total = state.products.reduce((sum, p) => sum + p.rating, 0);
    return Math.round((total / state.products.length) * 10) / 10;
  }, [state.products]);

  return {
    products: filteredProducts,
    allProducts: state.products,
    filters: state.filters,
    isLoading: state.isLoading,
    error: state.error,
    categoryCount,
    priceRange,
    averageRating,
    totalProducts: state.products.length,
    filteredCount: filteredProducts.length,
    fetchProducts,
    setFilters,
    resetFilters,
  };
}
