-- ============================================================
-- Tastestack — Migration 002: Folders + Multiple Brand DNAs
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ── folders ────────────────────────────────────────────────
create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#A78BFA',
  created_at  timestamptz not null default now()
);

alter table public.folders enable row level security;

create policy "Users view own folders"
  on public.folders for select
  using (auth.uid() = user_id);

create policy "Users insert own folders"
  on public.folders for insert
  with check (auth.uid() = user_id);

create policy "Users update own folders"
  on public.folders for update
  using (auth.uid() = user_id);

create policy "Users delete own folders"
  on public.folders for delete
  using (auth.uid() = user_id);

create index if not exists folders_user_id_idx on public.folders (user_id);

-- ── Add folder_id to inspirations ──────────────────────────
-- When a folder is deleted, set folder_id to NULL (contents are kept)
alter table public.inspirations
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists inspirations_folder_id_idx on public.inspirations (folder_id);

-- ── Rework brand_dna for multiple records per user ─────────
-- Drop the unique constraint so users can have many DNA profiles
alter table public.brand_dna
  drop constraint if exists brand_dna_user_id_key;

-- Add a name and is_active flag
alter table public.brand_dna
  add column if not exists name text not null default 'Brand DNA';

alter table public.brand_dna
  add column if not exists is_active boolean not null default true;

-- Index for fast lookups
create index if not exists brand_dna_user_id_idx on public.brand_dna (user_id);

-- Drop old single-row policies and recreate for multi-row access
drop policy if exists "Users view own brand DNA" on public.brand_dna;
drop policy if exists "Users insert own brand DNA" on public.brand_dna;
drop policy if exists "Users update own brand DNA" on public.brand_dna;

create policy "Users view own brand DNA"
  on public.brand_dna for select
  using (auth.uid() = user_id);

create policy "Users insert own brand DNA"
  on public.brand_dna for insert
  with check (auth.uid() = user_id);

create policy "Users update own brand DNA"
  on public.brand_dna for update
  using (auth.uid() = user_id);

create policy "Users delete own brand DNA"
  on public.brand_dna for delete
  using (auth.uid() = user_id);
