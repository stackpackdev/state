import React from 'react';
import { MultiStoreProvider } from 'state-agent/react';
import { auth } from './auth.store';
import { products } from './products.store';
import { cart } from './cart.store';
import { checkout } from './checkout.flow';

const allStores = [
  auth.store,
  products.store,
  cart.store,
  checkout.store,
];

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  return (
    // @ts-expect-error React 18/19 JSX type mismatch with state-agent built against React 19
    <MultiStoreProvider stores={allStores}>
      {children}
    </MultiStoreProvider>
  );
}
