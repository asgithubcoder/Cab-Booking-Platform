"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CarFront, Check, CreditCard, LoaderCircle, Navigation, ShieldCheck } from "lucide-react";
import PaymentCheckout from "@/components/payment-checkout";

declare global { interface Window { Clerk?: { session?: { getToken: () => Promise<string | null> } } } }
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Booking = { id: string; pickup: string; dropoff: string; fare: string | number; ride_type: string; status: string };

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await window.Clerk?.session?.getToken();
        if (!token) throw new Error("Sign in to continue to payment.");
        const [historyResponse, intentResponse] = await Promise.all([
          fetch(`${apiUrl}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/payments/intent`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ bookingId }) }),
        ]);
        const historyResult = await historyResponse.json();
        const intentResult = await intentResponse.json();
        if (!historyResponse.ok) throw new Error(historyResult.error ?? "Could not verify your booking.");
        if (!intentResponse.ok) throw new Error(intentResult.error ?? "Could not start secure checkout.");
        const currentBooking = (historyResult.bookings as Booking[]).find((item) => item.id === bookingId);
        if (!currentBooking) throw new Error("This booking was not found on your account.");
        if (!cancelled) {
          setBooking(currentBooking);
          if (intentResult.paid) setPaid(true);
          else if (intentResult.clientSecret) setClientSecret(intentResult.clientSecret);
          else throw new Error("Stripe did not return a payment session. Check Stripe setup and retry.");
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  return <main className="account-page"><header className="account-header"><Link href="/" className="account-brand"><span className="brand-mark"><Navigation size={17} fill="currentColor"/></span>drift<span>.</span></Link><Link href="/" className="account-back"><ArrowLeft size={15}/> Back to booking</Link></header><section className="account-content payment-page-content"><span className="section-kicker">SECURE CHECKOUT</span>{paid ? <div className="payment-complete"><div className="payment-complete-icon"><Check size={22}/></div><h1 className="account-title">You’re all<br/><em>set.</em></h1><p className="account-lede">Payment complete. Your ride request is confirmed.</p><Link href="/dashboard" className="account-action">Go to dashboard <ArrowRight size={15}/></Link></div> : <><h1 className="account-title">One last<br/><em>thing.</em></h1><p className="account-lede">Review your ride and securely complete payment.</p>{loading ? <div className="account-empty"><LoaderCircle className="spin" size={22}/> Preparing secure checkout…</div> : error ? <div className="account-message">{error}<Link href="/" className="payment-retry">Return to booking</Link></div> : booking && <><div className="checkout-summary"><div className="checkout-summary-title"><span><CarFront size={18}/></span><div><strong>{booking.ride_type} ride</strong><small>Booking {booking.id.slice(0, 8)}</small></div><b>${Number(booking.fare).toFixed(2)}</b></div><div className="checkout-route"><span className="history-pickup"/>{booking.pickup}<i/><span className="history-drop"/>{booking.dropoff}</div></div><div className="payment-trust"><ShieldCheck size={15}/> Secure payment processed by Stripe</div>{clientSecret && <PaymentCheckout clientSecret={clientSecret} onCancel={() => router.push("/")} onPaid={() => setPaid(true)}/>}</>}</>}</section><footer className="payment-footer"><CreditCard size={14}/> Your card details never touch our servers.</footer></main>;
}
