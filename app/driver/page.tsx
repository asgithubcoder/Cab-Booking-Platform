"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, Navigation, RefreshCw, Users } from "lucide-react";

declare global { interface Window { Clerk?: { session?: { getToken: () => Promise<string | null> } } } }
type Booking = { id: string; pickup: string; dropoff: string; ride_type: string; fare: number | string; distance_miles: number; passengers: number; created_at: string; scheduled_at?: string | null };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DriverPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState("");
  const loadBookings = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = await window.Clerk?.session?.getToken();
      if (!token) throw new Error("Sign in with an active driver account to view ride requests.");
      const response = await fetch(`${apiUrl}/api/driver/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load ride requests");
      setBookings(result.bookings ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load requests"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadBookings(); }, [loadBookings]);
  async function accept(id: string) {
    setAccepting(id); setError("");
    try {
      const token = await window.Clerk?.session?.getToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`${apiUrl}/api/driver/bookings/${id}/accept`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not accept this ride");
      setBookings((current) => current.filter((booking) => booking.id !== id));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not accept ride"); }
    finally { setAccepting(""); }
  }
  return <main className="account-page"><header className="account-header"><Link href="/" className="account-brand"><span className="brand-mark"><Navigation size={17} fill="currentColor"/></span>drift<span>.</span></Link><Link href="/" className="account-back"><ArrowLeft size={15}/> Rider booking</Link></header><section className="account-content driver-content"><div className="driver-heading"><div><span className="section-kicker">DRIVER PORTAL</span><h1 className="account-title">Your next<br/><em>good trip.</em></h1><p className="account-lede">Open requests near you, ready when you are.</p></div><button className="refresh-button" onClick={() => void loadBookings()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>{error && <div className="account-message">{error}</div>}{loading ? <div className="account-empty">Finding open requests…</div> : !error && bookings.length === 0 ? <div className="account-empty"><Check size={24}/><h2>You’re all caught up</h2><p>New ride requests will show up here.</p></div> : <div className="booking-history">{bookings.map((booking) => <article className="history-card driver-card" key={booking.id}><div className="history-top"><span className="status-pill status-requested">New request</span><span className="history-date">{booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : "Request now"}</span><strong>${Number(booking.fare).toFixed(2)}</strong></div><div className="history-route"><div><span className="history-pickup"/><p>{booking.pickup}</p></div><i/><div><span className="history-drop"/><p>{booking.dropoff}</p></div></div><div className="history-bottom"><span><Navigation size={12}/> {booking.distance_miles} mi · {booking.ride_type}</span><span><Users size={12}/> {booking.passengers}</span></div><button className="accept-button" onClick={() => void accept(booking.id)} disabled={accepting === booking.id}>{accepting === booking.id ? "Accepting…" : <>Accept this ride <ArrowRight size={15}/></>}</button></article>)}</div>}</section></main>;
}
