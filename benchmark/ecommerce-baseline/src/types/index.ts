// ── Auth ──

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' };

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

export interface ProductState {
  products: Product[];
  filters: ProductFilters;
  isLoading: boolean;
  error: string | null;
}

export type ProductAction =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<ProductFilters> }
  | { type: 'RESET_FILTERS' };

// ── Cart ──

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
}

export type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' };

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

export interface OrderState {
  currentStep: CheckoutStep;
  shipping: ShippingInfo;
  payment: PaymentInfo;
  isSubmitting: boolean;
  orderId: string | null;
  error: string | null;
}

export type OrderAction =
  | { type: 'SET_STEP'; payload: CheckoutStep }
  | { type: 'SET_SHIPPING'; payload: Partial<ShippingInfo> }
  | { type: 'SET_PAYMENT'; payload: Partial<PaymentInfo> }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; payload: string }
  | { type: 'SUBMIT_FAILURE'; payload: string }
  | { type: 'RESET_ORDER' };

// ── Validation ──

export interface ValidationErrors {
  [field: string]: string | undefined;
}
