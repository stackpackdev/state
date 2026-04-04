import React from 'react';
import { useCheckout } from '../hooks/useCheckout';
import { useCart } from '../hooks/useCart';

export function CheckoutPage() {
  const {
    currentStep,
    shipping,
    payment,
    isSubmitting,
    orderId,
    error,
    shippingErrors,
    paymentErrors,
    canSubmit,
    setShipping,
    setPayment,
    validateAndAdvanceShipping,
    validateAndAdvancePayment,
    handleSubmit,
    goBack,
    resetOrder,
  } = useCheckout();
  const { total, clearCart } = useCart();

  if (currentStep === 'confirmation' && orderId) {
    return (
      <div className="checkout-page">
        <h1>Order Confirmed!</h1>
        <p>Order ID: {orderId}</p>
        <button onClick={() => { resetOrder(); clearCart(); }}>Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout - {currentStep}</h1>
      {error && <p className="error">{error}</p>}

      {currentStep === 'shipping' && (
        <form onSubmit={(e) => { e.preventDefault(); validateAndAdvanceShipping(); }}>
          <input placeholder="Full Name" value={shipping.fullName} onChange={(e) => setShipping({ fullName: e.target.value })} />
          {shippingErrors.fullName && <span className="error">{shippingErrors.fullName}</span>}
          <input placeholder="Address" value={shipping.address} onChange={(e) => setShipping({ address: e.target.value })} />
          {shippingErrors.address && <span className="error">{shippingErrors.address}</span>}
          <input placeholder="City" value={shipping.city} onChange={(e) => setShipping({ city: e.target.value })} />
          {shippingErrors.city && <span className="error">{shippingErrors.city}</span>}
          <input placeholder="ZIP Code" value={shipping.zipCode} onChange={(e) => setShipping({ zipCode: e.target.value })} />
          {shippingErrors.zipCode && <span className="error">{shippingErrors.zipCode}</span>}
          <input placeholder="Country" value={shipping.country} onChange={(e) => setShipping({ country: e.target.value })} />
          {shippingErrors.country && <span className="error">{shippingErrors.country}</span>}
          <button type="submit">Continue to Payment</button>
        </form>
      )}

      {currentStep === 'payment' && (
        <form onSubmit={(e) => { e.preventDefault(); validateAndAdvancePayment(); }}>
          <input placeholder="Card Number" value={payment.cardNumber} onChange={(e) => setPayment({ cardNumber: e.target.value })} />
          {paymentErrors.cardNumber && <span className="error">{paymentErrors.cardNumber}</span>}
          <input placeholder="MM/YY" value={payment.expiryDate} onChange={(e) => setPayment({ expiryDate: e.target.value })} />
          {paymentErrors.expiryDate && <span className="error">{paymentErrors.expiryDate}</span>}
          <input placeholder="CVV" value={payment.cvv} onChange={(e) => setPayment({ cvv: e.target.value })} />
          {paymentErrors.cvv && <span className="error">{paymentErrors.cvv}</span>}
          <input placeholder="Name on Card" value={payment.nameOnCard} onChange={(e) => setPayment({ nameOnCard: e.target.value })} />
          {paymentErrors.nameOnCard && <span className="error">{paymentErrors.nameOnCard}</span>}
          <button type="button" onClick={goBack}>Back</button>
          <button type="submit">Review Order</button>
        </form>
      )}

      {currentStep === 'review' && (
        <div>
          <h2>Order Review</h2>
          <p>Ship to: {shipping.fullName}, {shipping.address}, {shipping.city} {shipping.zipCode}</p>
          <p>Card: ****{payment.cardNumber.slice(-4)}</p>
          <p>Total: ${total.toFixed(2)}</p>
          <button onClick={goBack}>Back</button>
          <button disabled={!canSubmit} onClick={() => handleSubmit(total)}>
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}
