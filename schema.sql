create extension if not exists pgcrypto;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text,
  phone text,
  matter text not null,
  ai_result text,
  estimated_value integer default 950,
  status text default 'new'
);

alter table leads enable row level security;
