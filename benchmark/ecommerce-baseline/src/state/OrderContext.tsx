import React, { createContext, useReducer, useCallback, useContext } from 'react';
import type { OrderState, OrderAction, ShippingInfo, PaymentInfo, CheckoutStep, ValidationErrors } from '../types';

const initialShipping: ShippingInfo = {
  fullName: '',
  address: '',
  city: '',
  zipCode: '',
  country: '',
};

const initialPayment: PaymentInfo = {
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  nameOnCard: '',
};

const initialState: OrderState = {
  currentStep: 'shipping',
  shipping: initialShipping,
  payment: initialPayment,
  isSubmitting: false,
  orderId: null,
  error: null,
};

function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload, error: null };
    case 'SET_SHIPPING':
      return { ...state, shipping: { ...state.shipping, ...action.payload } };
    case 'SET_PAYMENT':
      return { ...state, payment: { ...state.payment, ...action.payload } };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, orderId: action.payload, currentStep: 'confirmation' };
    case 'SUBMIT_FAILURE':
      return { ...state, isSubmitting: false, error: action.payload };
    case 'RESET_ORDER':
      return initialState;
    default:
      return state;
  }
}

// ── Validation helpers ──

export function validateShipping(shipping: ShippingInfo): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!shipping.fullName.trim()) errors.fullName = 'Full name is required';
  if (!shipping.address.trim()) errors.address = 'Address is required';
  if (!shipping.city.trim()) errors.city = 'City is required';
  if (!shipping.zipCode.trim()) errors.zipCode = 'ZIP code is required';
  if (shipping.zipCode && !/^\d{5}(-\d{4})?$/.test(shipping.zipCode)) {
    errors.zipCode = 'Invalid ZIP code format';
  }
  if (!shipping.country.trim()) errors.country = 'Country is required';
  return errors;
}

export function validatePayment(payment: PaymentInfo): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!payment.cardNumber.trim()) errors.cardNumber = 'Card number is required';
  if (payment.cardNumber && !/^\d{16}$/.test(payment.cardNumber.replace(/\s/g, ''))) {
    errors.cardNumber = 'Card number must be 16 digits';
  }
  if (!payment.expiryDate.trim()) errors.expiryDate = 'Expiry date is required';
  if (payment.expiryDate && !/^\d{2}\/\d{2}$/.test(payment.expiryDate)) {
    errors.expiryDate = 'Use MM/YY format';
  }
  if (!payment.cvv.trim()) errors.cvv = 'CVV is required';
  if (payment.cvv && !/^\d{3,4}$/.test(payment.cvv)) {
    errors.cvv = 'CVV must be 3-4 digits';
  }
  if (!payment.nameOnCard.trim()) errors.nameOnCard = 'Name on card is required';
  return errors;
}

interface OrderContextValue {
  state: OrderState;
  setStep: (step: CheckoutStep) => void;
  setShipping: (data: Partial<ShippingInfo>) => void;
  setPayment: (data: Partial<PaymentInfo>) => void;
  submitOrder: (cartTotal: number) => Promise<void>;
  resetOrder: () => void;
}

export const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  const setStep = useCallback((step: CheckoutStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const setShipping = useCallback((data: Partial<ShippingInfo>) => {
    dispatch({ type: 'SET_SHIPPING', payload: data });
  }, []);

  const setPayment = useCallback((data: Partial<PaymentInfo>) => {
    dispatch({ type: 'SET_PAYMENT', payload: data });
  }, []);

  const submitOrder = useCallback(async (cartTotal: number) => {
    dispatch({ type: 'SUBMIT_START' });
    // Simulate 1s order submission
    await new Promise((r) => setTimeout(r, 1000));
    // 10% simulated failure rate
    if (Math.random() < 0.1) {
      dispatch({ type: 'SUBMIT_FAILURE', payload: 'Payment processing failed. Please try again.' });
      return;
    }
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    dispatch({ type: 'SUBMIT_SUCCESS', payload: orderId });
  }, []);

  const resetOrder = useCallback(() => {
    dispatch({ type: 'RESET_ORDER' });
  }, []);

  return (
    <OrderContext.Provider value={{ state, setStep, setShipping, setPayment, submitOrder, resetOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrderContext(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrderContext must be used within OrderProvider');
  return ctx;
}
