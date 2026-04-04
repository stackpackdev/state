import React from 'react';
import { useCart } from '../hooks/useCart';

export function CartSummary() {
  const { itemCount, subtotal, tax, shipping, total } = useCart();

  return (
    <div className="cart-summary">
      <p>Items: {itemCount}</p>
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
      <p>Tax: ${tax.toFixed(2)}</p>
      <p>Shipping: {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</p>
      <p><strong>Total: ${total.toFixed(2)}</strong></p>
    </div>
  );
}
