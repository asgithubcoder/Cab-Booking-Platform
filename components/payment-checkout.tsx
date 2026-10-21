"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { Check, CreditCard, LoaderCircle } from "lucide-react";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function CardForm({ clientSecret, onPaid, onCancel }: { clientSecret: string; onPaid: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true); setError("");
    const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card: elements.getElement(CardElement)! } });
    if (result.error) { setError(result.error.message ?? "Payment could not be completed"); setBusy(false); return; }
    onPaid(); setBusy(false);
  }
  return <div className="checkout-overlay"><div className="checkout-modal"><button className="checkout-close" onClick={onCancel} aria-label="Close payment">×</button><div className="checkout-icon"><CreditCard size={20}/></div><h2>Secure your ride</h2><p>Your payment details are encrypted and handled by Stripe.</p><div className="card-input"><CardElement options={{ hidePostalCode: true, style: { base: { fontSize: "14px", color: "#26322b", "::placeholder": { color: "#9aa19b" } } }}}/></div>{error && <div className="checkout-error">{error}</div>}<button className="book-button" disabled={!stripe || busy} onClick={pay}>{busy ? <><LoaderCircle className="spin" size={16}/> Processing…</> : <>Pay securely <Check size={16}/></>}</button><button className="checkout-cancel" onClick={onCancel}>Back to booking</button></div></div>;
}

export default function PaymentCheckout(props: { clientSecret: string; onPaid: () => void; onCancel: () => void }) {
  if (!stripePromise) return <div className="checkout-overlay"><div className="checkout-modal"><h2>Payment setup needed</h2><p>Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local to accept card payments.</p><button className="book-button" onClick={props.onCancel}>Close</button></div></div>;
  return <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}><CardForm {...props}/></Elements>;
}
