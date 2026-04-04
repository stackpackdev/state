import { useState, useCallback, useMemo } from 'react';
import { useOrderContext, validateShipping, validatePayment } from '../state/OrderContext';
import type { ShippingInfo, PaymentInfo, ValidationErrors } from '../types';

export function useCheckout() {
  const { state, setStep, setShipping, setPayment, submitOrder, resetOrder } = useOrderContext();
  const [shippingErrors, setShippingErrors] = useState<ValidationErrors>({});
  const [paymentErrors, setPaymentErrors] = useState<ValidationErrors>({});

  const validateAndAdvanceShipping = useCallback(() => {
    const errors = validateShipping(state.shipping);
    setShippingErrors(errors);
    if (Object.keys(errors).length === 0) {
      setStep('payment');
      return true;
    }
    return false;
  }, [state.shipping, setStep]);

  const validateAndAdvancePayment = useCallback(() => {
    const errors = validatePayment(state.payment);
    setPaymentErrors(errors);
    if (Object.keys(errors).length === 0) {
      setStep('review');
      return true;
    }
    return false;
  }, [state.payment, setStep]);

  const handleSubmit = useCallback(async (cartTotal: number) => {
    await submitOrder(cartTotal);
  }, [submitOrder]);

  const goBack = useCallback(() => {
    switch (state.currentStep) {
      case 'payment':
        setStep('shipping');
        break;
      case 'review':
        setStep('payment');
        break;
      default:
        break;
    }
  }, [state.currentStep, setStep]);

  const isShippingValid = useMemo(
    () => Object.keys(validateShipping(state.shipping)).length === 0,
    [state.shipping]
  );

  const isPaymentValid = useMemo(
    () => Object.keys(validatePayment(state.payment)).length === 0,
    [state.payment]
  );

  const canSubmit = useMemo(
    () => isShippingValid && isPaymentValid && !state.isSubmitting,
    [isShippingValid, isPaymentValid, state.isSubmitting]
  );

  return {
    currentStep: state.currentStep,
    shipping: state.shipping,
    payment: state.payment,
    isSubmitting: state.isSubmitting,
    orderId: state.orderId,
    error: state.error,
    shippingErrors,
    paymentErrors,
    isShippingValid,
    isPaymentValid,
    canSubmit,
    setShipping,
    setPayment,
    validateAndAdvanceShipping,
    validateAndAdvancePayment,
    handleSubmit,
    goBack,
    resetOrder,
  };
}
