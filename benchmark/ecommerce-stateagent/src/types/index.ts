// ── Auth ──

export interface User {
  id: string;
  name: string;
  email: string;
}

// ── Products ──

export type ProductCategory = 'electronics' | 'clothing' | 'books' | 'home' | 'sports';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  inStock: boolean;
  imageUrl: string;
  rating: number;
}

export interface ProductFilters {
  query: string;
  category: ProductCategory | 'all';
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
}

// ── Cart ──

export interface CartItem {
  product: Product;
  quantity: number;
}

// ── Checkout / Order ──

export type CheckoutStep = 'shipping' | 'payment' | 'review' | 'confirmation';

export interface ShippingInfo {
  fullName: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  nameOnCard: string;
}
