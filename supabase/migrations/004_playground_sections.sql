-- ============================================================
-- Tastestack — Migration 004: Playground Canvas Sections
-- Run this in your Supabase SQL Editor after 003_playground.sql
-- ============================================================

-- Add sections column to store CanvasSection[] alongside items
alter table public.playground_canvases
  add column if not exists sections jsonb not null default '[]';
