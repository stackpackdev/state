import React from 'react';
import { useComputed } from 'state-agent/react';
import { cart } from '../state/cart.store';

export function CartSummary() {
  const itemCount = useComputed(cart.store, 'itemCount') as number;
  const subtotal = useComputed(cart.store, 'subtotal') as number;
  const tax = useComputed(cart.store, 'tax') as number;
  const shipping = useComputed(cart.store, 'shipping') as number;
  const total = useComputed(cart.store, 'total') as number;

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
