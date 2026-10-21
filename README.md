# Drift — Full-stack Cab Booking Starter

Drift is a full-stack ride booking starter with a Next.js/React frontend, Express API, Clerk authentication, Supabase/Postgres storage, and Stripe card payments. The booking UI loads vehicle estimates from the API, authenticates riders with Clerk, saves ride requests to Supabase, then opens Stripe Elements to confirm payment. Drivers can list open requests and claim them through the protected driver API.

## Requirements

- Node.js 20 or newer
- A Clerk application
- A Supabase project
- A Stripe account (test mode is enough for local development)

## Setup

1. Copy `.env.example` to `.env.local` and fill in the Clerk, Supabase, and Stripe values.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Install dependencies and start both services:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). The API listens on [http://localhost:4000](http://localhost:4000).
5. In Stripe, forward `payment_intent.succeeded` and `payment_intent.payment_failed` to `http://localhost:4000/api/payments/webhook` and set the resulting signing secret as `STRIPE_WEBHOOK_SECRET`.

Sign-in and sign-up live at `/sign-in` and `/sign-up`; successful authentication opens `/dashboard`. A rider booking is saved first and then continues to `/payments/[bookingId]` for Stripe checkout. The pickup locate control requests browser geolocation, updates while tracking is enabled, and saves the latest GPS coordinates with the booking. Browser location access requires localhost or HTTPS and the user's permission.

Clerk needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Supabase needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Stripe needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`. The service-role and Stripe secret keys must remain server-side.

## API

- `GET /api/health` — API and integration readiness
- `GET /api/rides` — vehicle classes and fare estimates
- `GET /api/bookings` — authenticated rider booking history
- `POST /api/bookings` — authenticated ride request
- `POST /api/payments/intent` — create the payment for a rider-owned booking
- `POST /api/payments/webhook` — update payment status from signed Stripe events
- `GET /api/driver/bookings` — list open rides for an active driver
- `POST /api/driver/bookings/:id/accept` — atomically claim an open ride

Driver profiles are provisioned by an administrator in Supabase (`driver_profiles`); the profile must have `is_active = true`. Do not expose the Supabase service-role key to browser code. The API uses it only after Clerk verifies the caller.

## Current scope

This starter implements rider booking, payment collection, booking history API, and driver request claiming. Production dispatch, driver GPS/live maps, cancellation/refund handling, trip status progression, and account/admin screens need to be connected to the chosen mapping and operations providers.
