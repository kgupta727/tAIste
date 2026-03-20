-- ============================================================
-- Tastestack — Migration 005: Playground Canvas Snapshots
-- Run this in your Supabase SQL Editor after 004_playground_sections.sql
-- ============================================================

create table if not exists public.playground_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null default 'Untitled',
  template_id text,
  items       jsonb not null default '[]',
  sections    jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

alter table public.playground_snapshots enable row level security;

create policy "Users view own snapshots"
  on public.playground_snapshots for select
  using (auth.uid() = user_id);

create policy "Users insert own snapshots"
  on public.playground_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users delete own snapshots"
  on public.playground_snapshots for delete
  using (auth.uid() = user_id);

create index if not exists playground_snapshots_user_id_idx
  on public.playground_snapshots (user_id, created_at desc);
