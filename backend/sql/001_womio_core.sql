-- WOMIO core schema (PostgreSQL 14+)
-- Goal: module-friendly structure for future features.

create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null,
  password_hash text,
  birth_date date,
  locale text not null default 'tr',
  status text not null default 'active' check (status in ('active', 'blocked', 'deleted')),
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references app_users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  min_app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists module_settings (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, setting_key)
);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null unique,
  description text not null default '',
  is_enabled boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shopping_products (
  id uuid primary key default gen_random_uuid(),
  external_ref text,
  name text not null,
  brand text,
  category text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shopping_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shopping_products(id) on delete cascade,
  store_name text not null,
  price numeric(12,2) not null,
  old_price numeric(12,2),
  currency text not null default 'TRY',
  product_url text,
  delivery_note text,
  source text not null default 'provider',
  fetched_at timestamptz not null default now()
);

create index if not exists idx_shopping_prices_product_id on shopping_prices(product_id);
create index if not exists idx_shopping_prices_fetched_at on shopping_prices(fetched_at desc);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at on admin_audit_logs(created_at desc);

insert into roles (code, title)
values
  ('super_admin', 'Super Admin'),
  ('admin', 'Admin'),
  ('moderator', 'Moderator'),
  ('member', 'Member')
on conflict (code) do nothing;

insert into modules (key, title, is_active, sort_order)
values
  ('health', 'Saglik', true, 10),
  ('shopping', 'Akilli Alisveris', true, 20),
  ('services', 'Hizmet ve Is', true, 30),
  ('astrology', 'Astroloji', true, 40)
on conflict (key) do nothing;

insert into feature_flags (flag_key, description, is_enabled)
values
  ('download_page_enabled', 'Web download page visibility', true),
  ('shopping_live_provider_enabled', 'Real provider integration for shopping search', false)
on conflict (flag_key) do nothing;
