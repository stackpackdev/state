import React, { useState } from 'react';
import { AuthProvider, useAuth } from './state/AuthContext';
import { ProductProvider } from './state/ProductContext';
import { CartProvider } from './state/CartContext';
import { OrderProvider } from './state/OrderContext';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';

type Page = 'catalog' | 'cart' | 'checkout';

function AppContent() {
  const { state, logout } = useAuth();
  const [page, setPage] = useState<Page>('catalog');

  if (!state.isAuthenticated) {
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
        <span>Welcome, {state.user?.name}</span>
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
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <OrderProvider>
            <AppContent />
          </OrderProvider>
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
