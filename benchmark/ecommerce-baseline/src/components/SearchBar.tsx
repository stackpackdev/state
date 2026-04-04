import React from 'react';
import type { ProductFilters, ProductCategory } from '../types';

interface Props {
  filters: ProductFilters;
  onFilterChange: (filters: Partial<ProductFilters>) => void;
  onReset: () => void;
}

const CATEGORIES: Array<ProductCategory | 'all'> = ['all', 'electronics', 'clothing', 'books', 'home', 'sports'];

export function SearchBar({ filters, onFilterChange, onReset }: Props) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search products..."
        value={filters.query}
        onChange={(e) => onFilterChange({ query: e.target.value })}
      />
      <select
        value={filters.category}
        onChange={(e) => onFilterChange({ category: e.target.value as ProductCategory | 'all' })}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => onFilterChange({ inStockOnly: e.target.checked })}
        />
        In stock only
      </label>
      <button onClick={onReset}>Reset</button>
    </div>
  );
}
