import React from 'react';
import { useCart } from '../hooks/useCart';
import { CartSummary } from '../components/CartSummary';

export function CartPage() {
  const { items, isEmpty, removeItem, updateQuantity, clearCart } = useCart();

  if (isEmpty) {
    return <div className="cart-page"><h1>Your Cart</h1><p>Your cart is empty.</p></div>;
  }

  return (
    <div className="cart-page">
      <h1>Your Cart</h1>
      {items.map((item) => (
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
