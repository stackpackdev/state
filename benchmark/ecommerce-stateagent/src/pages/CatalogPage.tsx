import React from 'react';
import { useComputed, useWhen } from 'state-agent/react';
import { products } from '../state/products.store';
import { addItem } from '../state/cart.store';
import { ProductCard } from '../components/ProductCard';
import { SearchBar } from '../components/SearchBar';
import type { Product } from '../types';

export function CatalogPage() {
  const filteredProducts = useComputed(products.store, 'filteredProducts') as Product[];
  const filteredCount = useComputed(products.store, 'filteredCount') as number;
  const totalProducts = useComputed(products.store, 'totalProducts') as number;
  const isLoading = useWhen(products.store, 'isLoading');

  return (
    <div className="catalog-page">
      <h1>Products ({filteredCount}/{totalProducts})</h1>
      <SearchBar />
      {isLoading && <p>Loading products...</p>}
      <div className="product-grid">
        {filteredProducts.map((p) => (
          <ProductCard key={p.id} product={p} onAddToCart={addItem} />
        ))}
      </div>
    </div>
  );
}
