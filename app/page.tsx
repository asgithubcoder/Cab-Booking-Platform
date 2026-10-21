"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, CarFront, Check, ChevronDown, Clock3, CreditCard, LocateFixed, MapPin, Menu, Navigation, Plus, ShieldCheck, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import AuthControls from "@/components/auth-controls";

declare global { interface Window { Clerk?: { session?: { getToken: () => Promise<string | null> } } } }

type Ride = { id: string; name: string; detail: string; time: string; price: number; icon: "car" | "comfort" | "xl"; tag?: string };
type Coordinates = { latitude: number; longitude: number; accuracy: number };
const rides: Ride[] = [
  { id: "drift", name: "Drift", detail: "A little room to breathe", time: "3 min away", price: 18.40, icon: "car" },
  { id: "comfort", name: "Comfort", detail: "Newer cars, top-rated drivers", time: "5 min away", price: 24.80, icon: "comfort", tag: "POPULAR" },
  { id: "xl", name: "Drift XL", detail: "Room for the whole crew", time: "7 min away", price: 36.20, icon: "xl" },
];
const locations = ["Brooklyn, NY", "Manhattan, NY", "Queens, NY", "Jersey City, NJ", "Williamsburg, Brooklyn"];

function MapIllustration({ coordinates, tracking }: { coordinates: Coordinates | null; tracking: boolean }) {
  return <div className="map-canvas" aria-label="Map showing a route from Brooklyn to Manhattan">
    <div className="map-grid" />
    <svg className="map-streets" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M-40 164 C135 182 246 132 379 166S625 220 844 158M-22 260 C142 281 258 246 401 274S630 304 842 253M-16 368 C138 381 265 347 410 382S641 421 835 365M-29 471 C123 492 261 452 405 484S651 530 837 471M-21 577 C132 594 268 556 411 590S653 633 846 578M-32 686 C134 701 275 665 414 699S648 740 844 682M-34 798 C145 813 265 774 416 810S649 850 837 796" />
      <path d="M96 -20 C114 131 83 247 117 374S165 629 129 928M215 -18 C237 143 196 264 239 391S283 651 248 918M335 -14 C357 151 315 271 356 396S400 661 367 926M469 -14 C488 140 449 267 489 398S533 658 501 923M592 -19 C614 143 571 268 611 397S653 658 621 923M724 -12 C742 147 704 270 743 400S786 663 752 925" />
      <path className="park" d="M489 72h123v77H489zM183 505h84v105h-84zM640 734h93v52h-93z" />
      <path className="water" d="M-25 902 C40 793 18 681 78 564S55 313 138 180 157 38 216-20L-20-20zM842 294 C765 334 760 431 803 501s1 141-42 175 2 111 70 115z" />
      <path className="route-halo" d="M584 656 C547 596 538 563 485 534S412 490 383 429 324 388 299 328 266 293 229 266" />
      <path className="route-line" d="M584 656 C547 596 538 563 485 534S412 490 383 429 324 388 299 328 266 293 229 266" />
    </svg>
    <div className="map-label label-brooklyn">BROOKLYN</div><div className="map-label label-manhattan">MANHATTAN</div>
    <div className="map-label label-williamsburg">WILLIAMSBURG</div><div className="map-label label-soho">SOHO</div>
    {coordinates && <div className={`live-location-badge ${tracking ? "" : "location-paused"}`}><span/>{tracking ? "GPS live" : "GPS pickup"} · {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}</div>}
    <div className="map-marker pickup-marker"><span /></div><div className="map-marker drop-marker"><span /></div>
    <div className="map-neighborhood neighborhood-one" /><div className="map-neighborhood neighborhood-two" />
    <button className="map-control locate" aria-label="Center map"><LocateFixed size={18} /></button>
    <button className="map-control zoom-in" aria-label="Zoom in"><Plus size={18} /></button>
    <button className="map-control zoom-out" aria-label="Zoom out"><span>−</span></button>
    <div className="map-attribution">Map data © OpenStreetMap contributors</div>
  </div>;
}

function VehicleIcon({ kind }: { kind: Ride["icon"] }) {
  return <div className={`vehicle-icon vehicle-${kind}`}><CarFront size={kind === "xl" ? 37 : 34} strokeWidth={1.5} /><span className="vehicle-wheel wheel-a"/><span className="vehicle-wheel wheel-b"/></div>;
}

export default function Home() {
  const router = useRouter();
  const locationWatch = useRef<number | null>(null);
  const [pickup, setPickup] = useState("Brooklyn, NY");
  const [dropoff, setDropoff] = useState("SoHo, Manhattan");
  const [selected, setSelected] = useState("comfort");
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [apiRides, setApiRides] = useState<Ride[]>(rides);
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  useEffect(() => {
    fetch(`${apiUrl}/api/rides`).then(async (response) => {
      if (!response.ok) throw new Error("Could not load ride options");
      const payload = await response.json();
      setApiRides((current) => current.map((ride) => {
        const live = payload.rides?.find((item: { id: string; estimate: number; etaMinutes: number }) => item.id === ride.id);
        return live ? { ...ride, price: live.estimate, time: `${live.etaMinutes} min away` } : ride;
      }));
    }).catch(() => setApiError("API is offline. Start the app with npm run dev to connect booking services."));
  }, [apiUrl]);
  const token = async () => window.Clerk?.session?.getToken() ?? null;
  useEffect(() => () => { if (locationWatch.current !== null) navigator.geolocation?.clearWatch(locationWatch.current); }, []);
  function toggleLocationTracking() {
    if (tracking) {
      if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current);
      locationWatch.current = null; setTracking(false); setLocationMessage("Live location tracking stopped."); return;
    }
    if (!navigator.geolocation) { setLocationMessage("This browser does not support location tracking."); return; }
    setLocationMessage("Waiting for location permission…");
    setTracking(true);
    locationWatch.current = navigator.geolocation.watchPosition((position) => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
      setCoordinates(next); setPickup("Current location"); setTracking(true);
      setLocationMessage(`Location updated · accurate to about ${Math.round(next.accuracy)} m`);
    }, (error) => {
      setTracking(false);
      setLocationMessage(error.code === error.PERMISSION_DENIED ? "Location permission was denied. Enable it in your browser settings to use GPS pickup." : "Could not read your location. Check your device location settings and try again.");
      if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current);
      locationWatch.current = null;
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  }
  function changePickup(value: string) {
    setPickup(value); setCoordinates(null); setLocationMessage("");
    if (locationWatch.current !== null) navigator.geolocation?.clearWatch(locationWatch.current);
    locationWatch.current = null; setTracking(false);
  }
  async function requestRide() {
    setBusy(true); setApiError("");
    try {
      if (schedule && !scheduledAt) throw new Error("Choose a pickup date and time first.");
      const sessionToken = await token();
      if (!sessionToken) throw new Error("Sign in is required to request a ride. Configure Clerk keys in .env.local.");
      const response = await fetch(`${apiUrl}/api/bookings`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ pickup, dropoff, rideType: selected, distanceMiles: 4.2, passengers: 1, ...(coordinates ? { pickupLatitude: coordinates.latitude, pickupLongitude: coordinates.longitude } : {}), ...(schedule ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create your booking");
      router.push(`/payments/${result.booking.id}`);
    } catch (error) { setApiError(error instanceof Error ? error.message : "Unable to request this ride"); }
    finally { setBusy(false); }
  }
  const activeRide = apiRides.find((ride) => ride.id === selected) ?? apiRides[1];
  const suggestions = (value: string) => value.length > 2 ? locations.filter((place) => place.toLowerCase().includes(value.toLowerCase().split(",")[0])).slice(0, 3) : [];

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-row"><div className="brand-mark"><Navigation size={19} fill="currentColor" /></div><span className="brand-name">drift<span>.</span></span><AuthControls/><button className="icon-button mobile-menu" aria-label="Open menu"><Menu size={20}/></button><button className="icon-button desktop-more" aria-label="More options"><SlidersHorizontal size={18}/></button></div>
      <div className="sidebar-scroll">
        <div className="eyebrow"><span className="live-dot"/> YOUR NEXT ADVENTURE</div>
        <h1>Where to<br/><span>today?</span></h1>
        <p className="intro">Good things happen when you get moving.</p>
        <div className="trip-form">
          <div className="route-rail"><span className="rail-start"/><span className="rail-line"/><span className="rail-end"/></div>
          <div className="location-fields">
          <label className="location-field"><span className="field-caption">PICKUP</span><input aria-label="Pickup location" value={pickup} onChange={(e) => changePickup(e.target.value)} /><button type="button" className={`field-action ${tracking ? "tracking-active" : ""}`} aria-label={tracking ? "Stop live location tracking" : "Use and track current location"} title={tracking ? "Stop live location tracking" : "Use and track current location"} onClick={toggleLocationTracking}><LocateFixed size={17}/></button>{suggestions(pickup).length > 0 && <div className="suggestions">{suggestions(pickup).map((item) => <button key={item} onClick={() => changePickup(item)}><MapPin size={14}/>{item}</button>)}</div>}</label>
            <button className="swap-locations" aria-label="Swap pickup and destination" onClick={() => {setPickup(dropoff);setDropoff(pickup)}}><ArrowDown size={15}/></button>
            <label className="location-field"><span className="field-caption">DROP-OFF</span><input aria-label="Drop-off location" value={dropoff} onChange={(e) => setDropoff(e.target.value)} /><button className="field-action" aria-label="Choose destination"><MapPin size={17}/></button>{suggestions(dropoff).length > 0 && <div className="suggestions">{suggestions(dropoff).map((item) => <button key={item} onClick={() => setDropoff(item)}><MapPin size={14}/>{item}</button>)}</div>}</label>
          </div>
        </div>
        {locationMessage && <p className={`location-message ${tracking ? "location-message-live" : ""}`}>{locationMessage}</p>}
        <div className="trip-options"><button onClick={() => setSchedule(!schedule)} className={schedule ? "option-active" : ""}><Clock3 size={16}/><span>{schedule ? "Schedule" : "Now"}</span><ChevronDown size={14}/></button><span className="option-divider"/><button onClick={() => setSchedule(!schedule)}><Users size={16}/><span>1 rider</span><ChevronDown size={14}/></button><button className="options-filter" aria-label="More trip options"><SlidersHorizontal size={17}/></button></div>
        {schedule && <div className="schedule-panel"><CalendarDays size={17}/><span>Pick-up time</span><input aria-label="Pickup date and time" type="datetime-local" value={scheduledAt} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} onChange={(event) => setScheduledAt(event.target.value)}/></div>}
        <div className="section-heading"><div><span className="section-kicker">MADE FOR THIS RIDE</span><h2>Choose your ride</h2></div><button className="all-options">Options <ArrowRight size={14}/></button></div>
        <div className="ride-list">{apiRides.map((ride) => <button key={ride.id} onClick={() => setSelected(ride.id)} className={`ride-card ${selected === ride.id ? "ride-selected" : ""}`}><VehicleIcon kind={ride.icon}/><div className="ride-info"><div className="ride-name-row"><span className="ride-name">{ride.name}</span>{ride.tag && <span className="popular-tag">{ride.tag}</span>}</div><span className="ride-detail">{ride.detail}</span><span className="ride-time"><span/> {ride.time}</span></div><div className="ride-price"><span>${ride.price.toFixed(2)}</span><span>upfront</span></div>{selected === ride.id && <div className="selected-check"><Check size={12}/></div>}</button>)}</div>
        <div className="payment-card"><div className="payment-symbol"><CreditCard size={17}/></div><div><span className="payment-caption">PAYMENT</span><span className="payment-value">Card · Stripe checkout</span></div><button aria-label="Secure card checkout"><ArrowUpRight size={16}/></button></div>
        <div className="booking-footer"><div className="estimate"><div><span className="estimate-label">YOUR ESTIMATE</span><span className="estimate-value">${activeRide.price.toFixed(2)}<span> USD</span></span></div><div className="arrival"><span>ARRIVES IN</span><strong>{activeRide.time}</strong></div></div><button className="book-button" onClick={requestRide} disabled={busy}>{busy ? "Requesting…" : <>Continue to payment<ArrowRight size={16}/></>}</button>{apiError && <p className="api-error">{apiError}</p>}<p className="secure-note"><ShieldCheck size={13}/> Secure checkout <span>·</span> Free cancellation</p></div>
      </div>
      <div className="sidebar-bottom"><div className="profile-button"><div className="avatar">D</div><div className="profile-copy"><strong>Your account</strong><span>Rider and driver tools</span></div></div><div className="account-links"><a href="/rides">My rides <ArrowUpRight size={14}/></a><a href="/driver">Driver portal <ArrowUpRight size={14}/></a></div></div>
    </aside>
    <section className="map-panel"><MapIllustration coordinates={coordinates} tracking={tracking}/><div className="map-topbar"><button className="back-button"><ArrowLeft size={16}/><span>Back</span></button><div className="map-trip-badge"><span className="badge-dot"/><span>YOUR ROUTE</span><span className="badge-separator">·</span><strong>4.2 mi</strong><span className="badge-separator">·</span><strong>18 min</strong></div><button className="share-button"><span>Share trip</span><ArrowUpRight size={15}/></button></div><div className="map-bottom-left"><div className="weather-card"><div className="weather-icon">☀</div><div><strong>72°</strong><span>Perfect ride weather</span></div></div><div className="map-note"><Sparkles size={14}/><span>Usually faster than driving</span></div></div><div className="map-bottom-right"><div className="map-legend"><span><i className="legend-pickup"/>Pickup</span><span><i className="legend-drop"/>Destination</span><span><i className="legend-route"/>Your route</span></div><div className="map-brand"><span className="brand-mark small"><Navigation size={13} fill="currentColor"/></span> drift<span>.</span></div></div></section>
    <div className="mobile-bookbar"><div><span>YOUR ESTIMATE</span><strong>${activeRide.price.toFixed(2)}</strong></div><button onClick={requestRide} disabled={busy}>{busy ? "Requesting…" : "Continue to payment"}<ArrowRight size={16}/></button></div>
  </main>;
}
