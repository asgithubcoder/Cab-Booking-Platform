import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import cors from "cors";
import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const hasClerk = Boolean(process.env.CLERK_SECRET_KEY);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

app.use(cors({ origin: webOrigin, credentials: true }));
app.use(clerkMiddleware());
app.get("/api/health", (_req, res) => res.json({ status: "ok", services: { database: Boolean(db), payments: Boolean(stripe), authentication: hasClerk } }));

const rideTypes = [
  { id: "drift", name: "Drift", description: "A little room to breathe", baseFare: 3.5, perMile: 2.1, etaMinutes: 3, capacity: 3 },
  { id: "comfort", name: "Comfort", description: "Newer cars, top-rated drivers", baseFare: 5.2, perMile: 2.8, etaMinutes: 5, capacity: 3 },
  { id: "xl", name: "Drift XL", description: "Room for the whole crew", baseFare: 7.5, perMile: 3.6, etaMinutes: 7, capacity: 6 },
];
const priceFor = (type: typeof rideTypes[number], miles: number) => Math.round((type.baseFare + type.perMile * miles) * 100) / 100;

app.get("/api/rides", (_req, res) => res.json({ rides: rideTypes.map((ride) => ({ ...ride, estimate: priceFor(ride, 4.2) })) }));

const bookingSchema = z.object({
  pickup: z.string().trim().min(2).max(180),
  dropoff: z.string().trim().min(2).max(180),
  rideType: z.enum(["drift", "comfort", "xl"]),
  distanceMiles: z.number().positive().max(300).default(4.2),
  pickupLatitude: z.number().min(-90).max(90).optional(),
  pickupLongitude: z.number().min(-180).max(180).optional(),
  scheduledAt: z.string().datetime().optional(),
  passengers: z.number().int().min(1).max(6).default(1),
});

function authUserId(req: Request) {
  return getAuth(req).userId;
}
function requireDatabase(res: Response) {
  if (!db) { res.status(503).json({ error: "Database is not configured. Add Supabase credentials to .env.local." }); return false; }
  return true;
}
function requireStripe(res: Response) {
  if (!stripe) { res.status(503).json({ error: "Payments are not configured. Add STRIPE_SECRET_KEY to .env.local." }); return false; }
  return true;
}

app.get("/api/bookings", requireAuth(), async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const { data, error } = await db!.from("bookings").select("*").eq("user_id", authUserId(req)).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ bookings: data });
  } catch (error) { next(error); }
});

app.post("/api/bookings", express.json({ limit: "1mb" }), requireAuth(), async (req, res, next) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid booking details", details: parsed.error.flatten() }); return; }
    if (!requireDatabase(res)) return;
    const input = parsed.data;
    const ride = rideTypes.find((item) => item.id === input.rideType)!;
    const { data, error } = await db!.from("bookings").insert({
      user_id: authUserId(req), pickup: input.pickup, dropoff: input.dropoff,
      ride_type: ride.id, distance_miles: input.distanceMiles, fare: priceFor(ride, input.distanceMiles),
      pickup_latitude: input.pickupLatitude ?? null, pickup_longitude: input.pickupLongitude ?? null,
      passengers: input.passengers, scheduled_at: input.scheduledAt ?? null, status: "requested",
    }).select().single();
    if (error) throw error;
    res.status(201).json({ booking: data });
  } catch (error) { next(error); }
});

// Driver accounts are provisioned in Supabase by an administrator. A driver can
// see open requests and atomically claim one request at a time.
app.get("/api/driver/bookings", requireAuth(), async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const userId = authUserId(req);
    const { data: driver, error: driverError } = await db!.from("driver_profiles").select("id, is_active").eq("user_id", userId).single();
    if (driverError || !driver?.is_active) { res.status(403).json({ error: "An active driver profile is required" }); return; }
    const { data, error } = await db!.from("bookings").select("*").eq("status", "requested").eq("payment_status", "paid").order("created_at", { ascending: true }).limit(50);
    if (error) throw error;
    res.json({ bookings: data });
  } catch (error) { next(error); }
});

app.post("/api/driver/bookings/:id/accept", requireAuth(), async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const userId = authUserId(req);
    const { data: driver, error: driverError } = await db!.from("driver_profiles").select("id, is_active").eq("user_id", userId).single();
    if (driverError || !driver?.is_active) { res.status(403).json({ error: "An active driver profile is required" }); return; }
    const { data, error } = await db!.from("bookings").update({ status: "accepted", driver_id: driver.id }).eq("id", req.params.id).eq("status", "requested").select().single();
    if (error || !data) { res.status(409).json({ error: "This ride was already accepted or no longer exists" }); return; }
    res.json({ booking: data });
  } catch (error) { next(error); }
});

app.post("/api/payments/intent", express.json({ limit: "1mb" }), requireAuth(), async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    if (!requireStripe(res)) return;
    const body = z.object({ bookingId: z.string().uuid() }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "A valid bookingId is required" }); return; }
    const { data: booking, error } = await db!.from("bookings").select("id, fare, user_id, status, payment_intent_id").eq("id", body.data.bookingId).eq("user_id", authUserId(req)).single();
    if (error || !booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.payment_intent_id) {
      const existingIntent = await stripe!.paymentIntents.retrieve(booking.payment_intent_id);
      if (existingIntent.status === "succeeded") { res.json({ paid: true }); return; }
      if (existingIntent.client_secret) { res.json({ clientSecret: existingIntent.client_secret }); return; }
    }
    const intent = await stripe!.paymentIntents.create({ amount: Math.round(Number(booking.fare) * 100), currency: "usd", automatic_payment_methods: { enabled: true }, metadata: { bookingId: booking.id, userId: booking.user_id } });
    await db!.from("bookings").update({ payment_intent_id: intent.id }).eq("id", booking.id);
    res.json({ clientSecret: intent.client_secret });
  } catch (error) { next(error); }
});

// Stripe requires the raw request body for webhook signature verification.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET || !db) { res.status(503).send("Webhook is not configured"); return; }
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] as string, process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { res.status(400).send(`Webhook signature error: ${error instanceof Error ? error.message : "invalid signature"}`); return; }
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await db.from("bookings").update({ payment_status: "paid" }).eq("payment_intent_id", intent.id);
  } else if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await db.from("bookings").update({ payment_status: "failed" }).eq("payment_intent_id", intent.id);
  }
  res.json({ received: true });
});

app.use(express.json({ limit: "1mb" }));
app.use(((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Unexpected server error" });
}) as ErrorRequestHandler);

app.listen(port, () => console.log(`Drift API listening on http://localhost:${port}`));
