import React from 'react';
import { useStore, useComputed, useWhen, useGate } from 'state-agent/react';
import { checkout, setShipping, setPayment, setStep, goBack, submitOrder, resetOrder } from '../state/checkout.flow';
import { cart, clearCart } from '../state/cart.store';

export function CheckoutPage() {
  const state = useStore(checkout.store);
  const isSubmitting = useWhen(checkout.store, 'isSubmitting');
  const isConfirmed = useWhen(checkout.store, 'isConfirmed');
  const canSubmit = useComputed(checkout.store, 'canSubmit') as boolean;
  const shippingErrors = useComputed(checkout.store, 'shippingErrors') as Record<string, string>;
  const paymentErrors = useComputed(checkout.store, 'paymentErrors') as Record<string, string>;
  const total = useComputed(cart.store, 'total') as number;

  if (isConfirmed && state.orderId) {
    return (
      <div className="checkout-page">
        <h1>Order Confirmed!</h1>
        <p>Order ID: {state.orderId}</p>
        <button onClick={() => { resetOrder(); clearCart(); }}>Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout - {state.currentStep}</h1>
      {state.error && <p className="error">{state.error}</p>}

      {state.currentStep === 'shipping' && (
        <form onSubmit={(e) => { e.preventDefault(); if (!Object.keys(shippingErrors).length) setStep('payment'); }}>
          <input placeholder="Full Name" value={state.shipping.fullName} onChange={(e) => setShipping({ fullName: e.target.value })} />
          {shippingErrors.fullName && <span className="error">{shippingErrors.fullName}</span>}
          <input placeholder="Address" value={state.shipping.address} onChange={(e) => setShipping({ address: e.target.value })} />
          {shippingErrors.address && <span className="error">{shippingErrors.address}</span>}
          <input placeholder="City" value={state.shipping.city} onChange={(e) => setShipping({ city: e.target.value })} />
          {shippingErrors.city && <span className="error">{shippingErrors.city}</span>}
          <input placeholder="ZIP Code" value={state.shipping.zipCode} onChange={(e) => setShipping({ zipCode: e.target.value })} />
          {shippingErrors.zipCode && <span className="error">{shippingErrors.zipCode}</span>}
          <input placeholder="Country" value={state.shipping.country} onChange={(e) => setShipping({ country: e.target.value })} />
          {shippingErrors.country && <span className="error">{shippingErrors.country}</span>}
          <button type="submit">Continue to Payment</button>
        </form>
      )}

      {state.currentStep === 'payment' && (
        <form onSubmit={(e) => { e.preventDefault(); if (!Object.keys(paymentErrors).length) setStep('review'); }}>
          <input placeholder="Card Number" value={state.payment.cardNumber} onChange={(e) => setPayment({ cardNumber: e.target.value })} />
          {paymentErrors.cardNumber && <span className="error">{paymentErrors.cardNumber}</span>}
          <input placeholder="MM/YY" value={state.payment.expiryDate} onChange={(e) => setPayment({ expiryDate: e.target.value })} />
          {paymentErrors.expiryDate && <span className="error">{paymentErrors.expiryDate}</span>}
          <input placeholder="CVV" value={state.payment.cvv} onChange={(e) => setPayment({ cvv: e.target.value })} />
          {paymentErrors.cvv && <span className="error">{paymentErrors.cvv}</span>}
          <input placeholder="Name on Card" value={state.payment.nameOnCard} onChange={(e) => setPayment({ nameOnCard: e.target.value })} />
          {paymentErrors.nameOnCard && <span className="error">{paymentErrors.nameOnCard}</span>}
          <button type="button" onClick={goBack}>Back</button>
          <button type="submit">Review Order</button>
        </form>
      )}

      {state.currentStep === 'review' && (
        <div>
          <h2>Order Review</h2>
          <p>Ship to: {state.shipping.fullName}, {state.shipping.address}, {state.shipping.city} {state.shipping.zipCode}</p>
          <p>Card: ****{state.payment.cardNumber.slice(-4)}</p>
          <p>Total: ${total.toFixed(2)}</p>
          <button onClick={goBack}>Back</button>
          <button disabled={!canSubmit} onClick={() => submitOrder(total)}>
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}
