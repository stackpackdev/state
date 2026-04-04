import { defineStore, z, getDefaultActor } from 'state-agent';
import type { ShippingInfo, PaymentInfo, CheckoutStep } from '../types';

const INITIAL_SHIPPING: ShippingInfo = {
  fullName: '',
  address: '',
  city: '',
  zipCode: '',
  country: '',
};

const INITIAL_PAYMENT: PaymentInfo = {
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  nameOnCard: '',
};

export const checkout = defineStore({
  name: 'checkout',
  schema: z.object({
    currentStep: z.enum(['shipping', 'payment', 'review', 'confirmation']),
    shipping: z.object({
      fullName: z.string(),
      address: z.string(),
      city: z.string(),
      zipCode: z.string(),
      country: z.string(),
    }),
    payment: z.object({
      cardNumber: z.string(),
      expiryDate: z.string(),
      cvv: z.string(),
      nameOnCard: z.string(),
    }),
    isSubmitting: z.boolean(),
    orderId: z.union([z.string(), z.null()]),
    error: z.union([z.string(), z.null()]),
  }),
  initial: {
    currentStep: 'shipping' as CheckoutStep,
    shipping: INITIAL_SHIPPING,
    payment: INITIAL_PAYMENT,
    isSubmitting: false,
    orderId: null as string | null,
    error: null as string | null,
  },
  when: {
    isSubmitting: (s) => s.isSubmitting,
    hasError: (s) => s.error !== null,
    isConfirmed: (s) => s.orderId !== null,
  },
  gates: {
    canGoBack: (s) => s.currentStep !== 'shipping' && s.currentStep !== 'confirmation',
  },
  computed: {
    isShippingValid: (s) => {
      const sh = s.shipping;
      return sh.fullName.trim().length > 0
        && sh.address.trim().length > 0
        && sh.city.trim().length > 0
        && /^\d{5}(-\d{4})?$/.test(sh.zipCode)
        && sh.country.trim().length > 0;
    },
    isPaymentValid: (s) => {
      const pm = s.payment;
      return /^\d{16}$/.test(pm.cardNumber.replace(/\s/g, ''))
        && /^\d{2}\/\d{2}$/.test(pm.expiryDate)
        && /^\d{3,4}$/.test(pm.cvv)
        && pm.nameOnCard.trim().length > 0;
    },
    shippingErrors: (s) => {
      const sh = s.shipping;
      const errors: Record<string, string> = {};
      if (!sh.fullName.trim()) errors.fullName = 'Full name is required';
      if (!sh.address.trim()) errors.address = 'Address is required';
      if (!sh.city.trim()) errors.city = 'City is required';
      if (!sh.zipCode.trim()) errors.zipCode = 'ZIP code is required';
      else if (!/^\d{5}(-\d{4})?$/.test(sh.zipCode)) errors.zipCode = 'Invalid ZIP code format';
      if (!sh.country.trim()) errors.country = 'Country is required';
      return errors;
    },
    paymentErrors: (s) => {
      const pm = s.payment;
      const errors: Record<string, string> = {};
      if (!pm.cardNumber.trim()) errors.cardNumber = 'Card number is required';
      else if (!/^\d{16}$/.test(pm.cardNumber.replace(/\s/g, ''))) errors.cardNumber = 'Card number must be 16 digits';
      if (!pm.expiryDate.trim()) errors.expiryDate = 'Expiry date is required';
      else if (!/^\d{2}\/\d{2}$/.test(pm.expiryDate)) errors.expiryDate = 'Use MM/YY format';
      if (!pm.cvv.trim()) errors.cvv = 'CVV is required';
      else if (!/^\d{3,4}$/.test(pm.cvv)) errors.cvv = 'CVV must be 3-4 digits';
      if (!pm.nameOnCard.trim()) errors.nameOnCard = 'Name on card is required';
      return errors;
    },
    canSubmit: (s) => {
      const sh = s.shipping;
      const pm = s.payment;
      const shippingOk = sh.fullName.trim().length > 0 && sh.address.trim().length > 0
        && sh.city.trim().length > 0 && /^\d{5}(-\d{4})?$/.test(sh.zipCode) && sh.country.trim().length > 0;
      const paymentOk = /^\d{16}$/.test(pm.cardNumber.replace(/\s/g, ''))
        && /^\d{2}\/\d{2}$/.test(pm.expiryDate) && /^\d{3,4}$/.test(pm.cvv) && pm.nameOnCard.trim().length > 0;
      return shippingOk && paymentOk && !s.isSubmitting;
    },
  },
  dependencies: {
    reads: ['cart'],
    gatedBy: ['auth'],
    triggers: [],
  },
});

export function setShipping(data: Partial<ShippingInfo>): void {
  const actor = getDefaultActor();
  checkout.store.update((draft) => {
    Object.assign(draft.shipping, data);
  }, actor);
}

export function setPayment(data: Partial<PaymentInfo>): void {
  const actor = getDefaultActor();
  checkout.store.update((draft) => {
    Object.assign(draft.payment, data);
  }, actor);
}

export function setStep(step: CheckoutStep): void {
  const actor = getDefaultActor();
  checkout.store.update((draft) => {
    draft.currentStep = step;
    draft.error = null;
  }, actor);
}

export function goBack(): void {
  const state = checkout.store.getState();
  switch (state.currentStep) {
    case 'payment': setStep('shipping'); break;
    case 'review': setStep('payment'); break;
    default: break;
  }
}

export async function submitOrder(cartTotal: number): Promise<void> {
  const actor = getDefaultActor();
  checkout.store.update((draft) => {
    draft.isSubmitting = true;
    draft.error = null;
  }, actor);

  await new Promise((r) => setTimeout(r, 1000));

  if (Math.random() < 0.1) {
    checkout.store.update((draft) => {
      draft.isSubmitting = false;
      draft.error = 'Payment processing failed. Please try again.';
    }, actor);
    return;
  }

  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
  checkout.store.update((draft) => {
    draft.isSubmitting = false;
    draft.orderId = orderId;
    draft.currentStep = 'confirmation';
  }, actor);
}

export function resetOrder(): void {
  const actor = getDefaultActor();
  checkout.store.reset({
    currentStep: 'shipping',
    shipping: { ...INITIAL_SHIPPING },
    payment: { ...INITIAL_PAYMENT },
    isSubmitting: false,
    orderId: null,
    error: null,
  }, actor);
}
