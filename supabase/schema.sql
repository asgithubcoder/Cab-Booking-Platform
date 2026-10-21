create extension if not exists pgcrypto;

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  display_name text not null,
  vehicle_description text,
  license_plate text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  driver_id uuid references public.driver_profiles(id),
  pickup text not null,
  pickup_latitude double precision,
  pickup_longitude double precision,
  dropoff text not null,
  ride_type text not null check (ride_type in ('drift', 'comfort', 'xl')),
  distance_miles numeric(7,2) not null check (distance_miles > 0),
  fare numeric(8,2) not null check (fare >= 0),
  passengers integer not null default 1 check (passengers between 1 and 6),
  status text not null default 'requested' check (status in ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_intent_id text unique,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installs can safely rerun this schema to add GPS pickup fields.
alter table public.bookings add column if not exists pickup_latitude double precision;
alter table public.bookings add column if not exists pickup_longitude double precision;
create index if not exists bookings_user_created_idx on public.bookings (user_id, created_at desc);
create index if not exists bookings_open_requests_idx on public.bookings (status, created_at) where status = 'requested';

-- Express uses the Supabase service role only after verifying the Clerk session.
-- Keep row level security enabled so browser clients cannot bypass the API.
alter table public.bookings enable row level security;
alter table public.driver_profiles enable row level security;
