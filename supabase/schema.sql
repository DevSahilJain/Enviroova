-- ECOLOOP Supabase schema
-- Run this once in the Supabase SQL editor to create the tables.

-- Campus energy, water and waste meter readings (per building, hourly)
create table if not exists public.meter_readings (
  id bigint generated always as identity primary key,
  building_id text not null,
  reading_type text not null check (reading_type in ('electricity', 'water', 'waste')),
  recorded_at timestamptz not null,
  kwh numeric(12,4),
  m3 numeric(12,4),
  kg numeric(12,4),
  created_at timestamptz not null default now()
);

create index if not exists idx_meter_readings_building
  on public.meter_readings (building_id, reading_type, recorded_at desc);

-- Sustainability scenarios saved by the optimizer
create table if not exists public.sustainability_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  problem text not null,
  budget numeric(12,2) not null default 0,
  selected_interventions jsonb not null default '[]'::jsonb,
  total_savings_kwh numeric(14,4) not null default 0,
  total_cost numeric(12,2) not null default 0,
  remaining_budget numeric(12,2) not null default 0,
  payback_years numeric(8,2),
  is_simulated boolean not null default true,
  created_at timestamptz not null default now()
);

-- Optimizer result records
create table if not exists public.optimizer_results (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.sustainability_scenarios (id) on delete set null,
  problem text not null,
  budget numeric(12,2) not null,
  recommended_intervention_id text not null,
  explanation text not null,
  total_savings_kwh numeric(14,4) not null default 0,
  total_cost numeric(12,2) not null default 0,
  is_simulated boolean not null default true,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (read-only for anon, full access for service role)
alter table public.meter_readings enable row level security;
alter table public.sustainability_scenarios enable row level security;
alter table public.optimizer_results enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'anon read meter readings') then
    create policy "anon read meter readings"
      on public.meter_readings for select
      to anon
      using (true);
  end if;
  if not exists (select 1 from pg_policy where polname = 'anon read scenarios') then
    create policy "anon read scenarios"
      on public.sustainability_scenarios for select
      to anon
      using (true);
  end if;
  if not exists (select 1 from pg_policy where polname = 'anon read optimizer results') then
    create policy "anon read optimizer results"
      on public.optimizer_results for select
      to anon
      using (true);
  end if;
end
$$;