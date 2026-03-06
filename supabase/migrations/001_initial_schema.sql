-- ============================================================
-- Tastestack — Initial Schema
-- Run this in your Supabase SQL Editor (or via CLI migrations)
-- ============================================================

-- ── inspirations ───────────────────────────────────────────
create table if not exists public.inspirations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  source_url   text,
  source_domain text not null,
  source_type  text not null default 'website',
  image_url    text,
  tags         text[] not null default '{}',
  notes        text not null default '',
  analysis     jsonb not null default '{}',
  saved_at     timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.inspirations enable row level security;

create policy "Users view own inspirations"
  on public.inspirations for select
  using (auth.uid() = user_id);

create policy "Users insert own inspirations"
  on public.inspirations for insert
  with check (auth.uid() = user_id);

create policy "Users update own inspirations"
  on public.inspirations for update
  using (auth.uid() = user_id);

create policy "Users delete own inspirations"
  on public.inspirations for delete
  using (auth.uid() = user_id);

-- Index for fast user queries
create index if not exists inspirations_user_id_idx on public.inspirations (user_id);

-- ── brand_dna ───────────────────────────────────────────────
create table if not exists public.brand_dna (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.brand_dna enable row level security;

create policy "Users view own brand DNA"
  on public.brand_dna for select
  using (auth.uid() = user_id);

create policy "Users insert own brand DNA"
  on public.brand_dna for insert
  with check (auth.uid() = user_id);

create policy "Users update own brand DNA"
  on public.brand_dna for update
  using (auth.uid() = user_id);
