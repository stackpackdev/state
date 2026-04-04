import React from 'react';
import { useValue } from 'state-agent/react';
import { products, setFilters, resetFilters } from '../state/products.store';
import type { ProductCategory } from '../types';

const CATEGORIES: Array<ProductCategory | 'all'> = ['all', 'electronics', 'clothing', 'books', 'home', 'sports'];

export function SearchBar() {
  const filters = useValue(products.store, 'filters');

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search products..."
        value={filters.query}
        onChange={(e) => setFilters({ query: e.target.value })}
      />
      <select
        value={filters.category}
        onChange={(e) => setFilters({ category: e.target.value as ProductCategory | 'all' })}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => setFilters({ inStockOnly: e.target.checked })}
        />
        In stock only
      </label>
      <button onClick={resetFilters}>Reset</button>
    </div>
  );
}
