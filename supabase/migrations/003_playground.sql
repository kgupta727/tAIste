-- ============================================================
-- Tastestack — Migration 003: Playground Canvas Persistence
-- Run this in your Supabase SQL Editor after 002_folders_multi_dna.sql
-- ============================================================

create table if not exists public.playground_canvases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  items       jsonb not null default '[]',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.playground_canvases enable row level security;

create policy "Users view own playground"
  on public.playground_canvases for select
  using (auth.uid() = user_id);

create policy "Users insert own playground"
  on public.playground_canvases for insert
  with check (auth.uid() = user_id);

create policy "Users update own playground"
  on public.playground_canvases for update
  using (auth.uid() = user_id);

create policy "Users delete own playground"
  on public.playground_canvases for delete
  using (auth.uid() = user_id);

create index if not exists playground_canvases_user_id_idx on public.playground_canvases (user_id);
