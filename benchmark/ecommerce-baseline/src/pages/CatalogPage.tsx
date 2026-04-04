import React from 'react';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { ProductCard } from '../components/ProductCard';
import { SearchBar } from '../components/SearchBar';

export function CatalogPage() {
  const { products, filters, isLoading, filteredCount, totalProducts, setFilters, resetFilters } = useProducts();
  const { addItem } = useCart();

  return (
    <div className="catalog-page">
      <h1>Products ({filteredCount}/{totalProducts})</h1>
      <SearchBar filters={filters} onFilterChange={setFilters} onReset={resetFilters} />
      {isLoading && <p>Loading products...</p>}
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAddToCart={addItem} />
        ))}
      </div>
    </div>
  );
}
