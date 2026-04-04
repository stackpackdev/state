import React from 'react';
import { useGate, useComputed } from 'state-agent/react';
import { Gated } from 'state-agent/react';
import { AppStoreProvider } from './state/provider';
import { auth, logout } from './state/auth.store';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';

type Page = 'catalog' | 'cart' | 'checkout';

function AppContent() {
  const isAuthenticated = useGate(auth.store, 'isAuthenticated');
  const userName = useComputed(auth.store, 'userName') as string;
  const [page, setPage] = React.useState<Page>('catalog');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app">
      <header>
        <nav>
          <button onClick={() => setPage('catalog')}>Catalog</button>
          <button onClick={() => setPage('cart')}>Cart</button>
          <button onClick={() => setPage('checkout')}>Checkout</button>
        </nav>
        <span>Welcome, {userName}</span>
        <button onClick={logout}>Logout</button>
      </header>
      <main>
        {page === 'catalog' && <CatalogPage />}
        {page === 'cart' && <CartPage />}
        {page === 'checkout' && <CheckoutPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}
