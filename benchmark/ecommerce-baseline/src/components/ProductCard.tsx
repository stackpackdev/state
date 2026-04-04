import React from 'react';
import type { Product } from '../types';

interface Props {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: Props) {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <span>${product.price.toFixed(2)}</span>
      <button disabled={!product.inStock} onClick={() => onAddToCart(product)}>
        {product.inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  );
}
