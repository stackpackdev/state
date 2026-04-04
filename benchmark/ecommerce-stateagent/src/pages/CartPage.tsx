import React from 'react';
import { useStore, useWhen } from 'state-agent/react';
import { cart, removeItem, updateQuantity, clearCart } from '../state/cart.store';
import { CartSummary } from '../components/CartSummary';
import type { CartItem } from '../types';

export function CartPage() {
  const state = useStore(cart.store);
  const isEmpty = useWhen(cart.store, 'isEmpty');

  if (isEmpty) {
    return <div className="cart-page"><h1>Your Cart</h1><p>Your cart is empty.</p></div>;
  }

  return (
    <div className="cart-page">
      <h1>Your Cart</h1>
      {(state.items as CartItem[]).map((item) => (
        <div key={item.product.id} className="cart-item">
          <span>{item.product.name}</span>
          <span>${item.product.price.toFixed(2)}</span>
          <input
            type="number"
            min={0}
            value={item.quantity}
            onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value, 10))}
          />
          <button onClick={() => removeItem(item.product.id)}>Remove</button>
        </div>
      ))}
      <CartSummary />
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}
