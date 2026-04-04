import { useMemo } from 'react';
import { useCartContext } from '../state/CartContext';

export function useCart() {
  const { state, addItem, removeItem, updateQuantity, clearCart } = useCartContext();

  const itemCount = useMemo(
    () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    [state.items]
  );

  const subtotal = useMemo(
    () => state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [state.items]
  );

  const tax = useMemo(
    () => Math.round(subtotal * 0.08 * 100) / 100,
    [subtotal]
  );

  const shipping = useMemo(
    () => (subtotal > 100 ? 0 : 9.99),
    [subtotal]
  );

  const total = useMemo(
    () => Math.round((subtotal + tax + shipping) * 100) / 100,
    [subtotal, tax, shipping]
  );

  const isEmpty = useMemo(
    () => state.items.length === 0,
    [state.items]
  );

  return {
    items: state.items,
    itemCount,
    subtotal,
    tax,
    shipping,
    total,
    isEmpty,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
