"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Clock3, MapPin, Navigation, ShieldCheck } from "lucide-react";

declare global { interface Window { Clerk?: { session?: { getToken: () => Promise<string | null> } } } }
type Booking = { id: string; pickup: string; dropoff: string; ride_type: string; fare: string | number; status: string; payment_status: string; created_at: string; scheduled_at?: string | null };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function RidesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try {
      const token = await window.Clerk?.session?.getToken();
      if (!token) throw new Error("Sign in with Clerk to see your trips.");
      const response = await fetch(`${apiUrl}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load your trips");
      setBookings(result.bookings ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load your trips"); }
    finally { setLoading(false); }
  })(); }, []);
  return <main className="account-page"><header className="account-header"><Link href="/" className="account-brand"><span className="brand-mark"><Navigation size={17} fill="currentColor"/></span>drift<span>.</span></Link><Link href="/" className="account-back"><ArrowLeft size={15}/> Book a ride</Link></header><section className="account-content"><span className="section-kicker">YOUR DRIFT ACCOUNT</span><h1 className="account-title">Every trip,<br/><em>in one place.</em></h1><p className="account-lede">Your rides, receipts, and upcoming plans.</p>{loading ? <div className="account-empty">Loading your trips…</div> : error ? <div className="account-message">{error}</div> : bookings.length === 0 ? <div className="account-empty"><Navigation size={24}/><h2>No rides yet</h2><p>Your next good thing is only a ride away.</p><Link href="/" className="account-action">Book your first ride <ArrowRight size={15}/></Link></div> : <div className="booking-history">{bookings.map((booking) => <article className="history-card" key={booking.id}><div className="history-top"><span className={`status-pill status-${booking.status}`}>{booking.status.replace("_", " ")}</span><span className="history-date">{new Date(booking.scheduled_at ?? booking.created_at).toLocaleString()}</span><strong>${Number(booking.fare).toFixed(2)}</strong></div><div className="history-route"><div><span className="history-pickup"/><p>{booking.pickup}</p></div><i/><div><span className="history-drop"/><p>{booking.dropoff}</p></div></div><div className="history-bottom"><span>{booking.ride_type} · {booking.payment_status}</span><span>Ride ID {booking.id.slice(0, 8)}</span></div></article>)}</div>}<div className="account-footnote"><ShieldCheck size={14}/> Your trip details are private to your account.</div></section></main>;
}
