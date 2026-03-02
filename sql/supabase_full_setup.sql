-- ShoesX Full Supabase Setup
-- Run this in Supabase SQL Editor.
-- This script is idempotent (safe to re-run).

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Helper functions
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_order_id()
returns text
language plpgsql
as $$
declare
  token text;
  suffix text;
begin
  token := upper(to_hex(extract(epoch from now())::bigint));
  suffix := upper(substr(md5(random()::text), 1, 4));
  return 'SX-' || token || '-' || suffix;
end;
$$;

-- ------------------------------------------------------------
-- users_profile
-- ------------------------------------------------------------

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  role text not null default 'user',
  disabled boolean not null default false,
  preferred_theme text,
  measurements jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users_profile
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists role text not null default 'user',
  add column if not exists disabled boolean not null default false,
  add column if not exists preferred_theme text,
  add column if not exists measurements jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_profile_role_check'
  ) then
    alter table public.users_profile
      add constraint users_profile_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_profile_preferred_theme_check'
  ) then
    alter table public.users_profile
      add constraint users_profile_preferred_theme_check
      check (preferred_theme is null or preferred_theme in ('light', 'dark'));
  end if;
end $$;

create index if not exists idx_users_profile_role on public.users_profile(role);
create index if not exists idx_users_profile_email on public.users_profile(lower(email));

-- Admin check helper.
-- Uses role from users_profile when available, and also allows the fixed admin email.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text;
  uid uuid;
begin
  uid := auth.uid();
  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if jwt_email = 'admin@gmail.com' then
    return true;
  end if;

  if uid is null then
    return false;
  end if;

  return exists (
    select 1
    from public.users_profile up
    where up.id = uid
      and up.role = 'admin'
      and coalesce(up.disabled, false) = false
  );
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Prevent role/disabled self-escalation from non-admin users.
create or replace function public.protect_users_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.disabled := old.disabled;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_users_profile_protect on public.users_profile;
create trigger trg_users_profile_protect
before update on public.users_profile
for each row
execute function public.protect_users_profile_fields();

-- Auto-create profile row for new auth users.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profile (id, email, username, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1), 'user'),
    case when lower(coalesce(new.email, '')) = 'admin@gmail.com' then 'admin' else 'user' end,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

-- Backfill users_profile for existing auth users.
insert into public.users_profile (id, email, username, role, created_at, updated_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'username', split_part(coalesce(u.email, ''), '@', 1), 'user'),
  case when lower(coalesce(u.email, '')) = 'admin@gmail.com' then 'admin' else 'user' end,
  now(),
  now()
from auth.users u
on conflict (id) do update
set email = excluded.email,
    updated_at = now();

alter table public.users_profile enable row level security;

drop policy if exists "users_profile_select_own" on public.users_profile;
create policy "users_profile_select_own"
on public.users_profile
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users_profile_insert_own" on public.users_profile;
create policy "users_profile_insert_own"
on public.users_profile
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users_profile_update_own" on public.users_profile;
create policy "users_profile_update_own"
on public.users_profile
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "users_profile_admin_select_all" on public.users_profile;
create policy "users_profile_admin_select_all"
on public.users_profile
for select
to authenticated
using (public.is_admin());

drop policy if exists "users_profile_admin_update_all" on public.users_profile;
create policy "users_profile_admin_update_all"
on public.users_profile
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users_profile_admin_insert_all" on public.users_profile;
create policy "users_profile_admin_insert_all"
on public.users_profile
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "users_profile_admin_delete_all" on public.users_profile;
create policy "users_profile_admin_delete_all"
on public.users_profile
for delete
to authenticated
using (public.is_admin());

-- ------------------------------------------------------------
-- user_measurements (fallback table)
-- ------------------------------------------------------------

create table if not exists public.user_measurements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text,
  length numeric(6,2),
  width numeric(6,2),
  preferred_fit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_measurements
  add column if not exists gender text,
  add column if not exists length numeric(6,2),
  add column if not exists width numeric(6,2),
  add column if not exists preferred_fit text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_user_measurements_updated_at on public.user_measurements;
create trigger trg_user_measurements_updated_at
before update on public.user_measurements
for each row
execute function public.set_updated_at();

alter table public.user_measurements enable row level security;

drop policy if exists "user_measurements_select_own" on public.user_measurements;
create policy "user_measurements_select_own"
on public.user_measurements
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_measurements_insert_own" on public.user_measurements;
create policy "user_measurements_insert_own"
on public.user_measurements
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_measurements_update_own" on public.user_measurements;
create policy "user_measurements_update_own"
on public.user_measurements
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- user_favourites
-- ------------------------------------------------------------

create table if not exists public.user_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.user_favourites
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists product_id text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_user_favourites_user_id on public.user_favourites(user_id);
create index if not exists idx_user_favourites_product_id on public.user_favourites(product_id);

alter table public.user_favourites enable row level security;

drop policy if exists "user_favourites_select_own" on public.user_favourites;
create policy "user_favourites_select_own"
on public.user_favourites
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_favourites_insert_own" on public.user_favourites;
create policy "user_favourites_insert_own"
on public.user_favourites
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_favourites_delete_own" on public.user_favourites;
create policy "user_favourites_delete_own"
on public.user_favourites
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- cart_items
-- ------------------------------------------------------------

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  size text not null default 'UK 8',
  qty integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, size)
);

alter table public.cart_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists product_id text,
  add column if not exists size text not null default 'UK 8',
  add column if not exists qty integer not null default 1,
  add column if not exists unit_price numeric(12,2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_qty_check'
  ) then
    alter table public.cart_items
      add constraint cart_items_qty_check
      check (qty > 0);
  end if;
end $$;

create index if not exists idx_cart_items_user_id on public.cart_items(user_id);
create index if not exists idx_cart_items_product_id on public.cart_items(product_id);

drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row
execute function public.set_updated_at();

alter table public.cart_items enable row level security;

drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own"
on public.cart_items
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own"
on public.cart_items
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own"
on public.cart_items
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own"
on public.cart_items
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- size_history
-- ------------------------------------------------------------

create table if not exists public.size_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text,
  product_name text,
  size text,
  color text,
  created_at timestamptz not null default now()
);

alter table public.size_history
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists product_id text,
  add column if not exists product_name text,
  add column if not exists size text,
  add column if not exists color text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_size_history_user_created on public.size_history(user_id, created_at desc);

alter table public.size_history enable row level security;

drop policy if exists "size_history_select_own" on public.size_history;
create policy "size_history_select_own"
on public.size_history
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "size_history_insert_own" on public.size_history;
create policy "size_history_insert_own"
on public.size_history
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "size_history_delete_own" on public.size_history;
create policy "size_history_delete_own"
on public.size_history
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text default '',
  short_description text default '',
  price numeric(12,2) not null default 0,
  category text not null default 'Sport',
  sizes text,
  size_options text[] default '{}',
  colors text[] default '{}',
  image text not null,
  images text[] default '{}',
  card_image text,
  model_url text,
  badge text,
  logistics text[] default '{}',
  fit_score integer default 90,
  ai_fit integer default 90,
  rating numeric(3,1) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists name text,
  add column if not exists description text default '',
  add column if not exists short_description text default '',
  add column if not exists price numeric(12,2) not null default 0,
  add column if not exists category text not null default 'Sport',
  add column if not exists sizes text,
  add column if not exists size_options text[] default '{}',
  add column if not exists colors text[] default '{}',
  add column if not exists image text,
  add column if not exists images text[] default '{}',
  add column if not exists card_image text,
  add column if not exists model_url text,
  add column if not exists badge text,
  add column if not exists logistics text[] default '{}',
  add column if not exists fit_score integer default 90,
  add column if not exists ai_fit integer default 90,
  add column if not exists rating numeric(3,1) default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_created_at on public.products(created_at desc);

update public.products
set images = array[image]
where (images is null or array_length(images, 1) is null or array_length(images, 1) = 0)
  and coalesce(trim(image), '') <> '';

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "products_admin_manage" on public.products;
create policy "products_admin_manage"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- storage: product-images bucket
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique default public.generate_order_id(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  status text not null default 'Order Placed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists order_id text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists total numeric(12,2) not null default 0,
  add column if not exists status text not null default 'Order Placed',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.orders set order_id = coalesce(order_id, public.generate_order_id()) where order_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_order_id_key'
  ) then
    alter table public.orders add constraint orders_order_id_key unique (order_id);
  end if;
end $$;

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_user_email on public.orders(lower(user_email));
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_status on public.orders(status);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public"
on public.orders
for insert
to anon, authenticated
with check (
  public.is_admin()
  or (auth.role() = 'anon' and user_id is null)
  or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
);

drop policy if exists "orders_select_scoped" on public.orders;
create policy "orders_select_scoped"
on public.orders
for select
to anon, authenticated
using (
  public.is_admin()
  or (auth.role() = 'anon' and user_id is null)
  or (
    auth.uid() is not null
    and (
      user_id = auth.uid()
      or lower(coalesce(user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
);

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete"
on public.orders
for delete
to authenticated
using (public.is_admin());

-- ------------------------------------------------------------
-- feedback
-- ------------------------------------------------------------

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  subject text not null default 'General Feedback',
  message text not null,
  rating integer default 0,
  order_id text,
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.feedback
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists subject text not null default 'General Feedback',
  add column if not exists message text,
  add column if not exists rating integer default 0,
  add column if not exists order_id text,
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_feedback_created_at on public.feedback(created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_public" on public.feedback;
create policy "feedback_insert_public"
on public.feedback
for insert
to anon, authenticated
with check (
  public.is_admin()
  or (auth.role() = 'anon')
  or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
);

drop policy if exists "feedback_admin_select" on public.feedback;
create policy "feedback_admin_select"
on public.feedback
for select
to authenticated
using (public.is_admin());

drop policy if exists "feedback_admin_update" on public.feedback;
create policy "feedback_admin_update"
on public.feedback
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- contact_messages
-- ------------------------------------------------------------

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  topic text not null default 'General Inquiry',
  name text not null,
  email text not null,
  message text not null,
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists topic text not null default 'General Inquiry',
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists message text,
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_contact_messages_created_at on public.contact_messages(created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages_insert_public" on public.contact_messages;
create policy "contact_messages_insert_public"
on public.contact_messages
for insert
to anon, authenticated
with check (
  public.is_admin()
  or (auth.role() = 'anon')
  or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
);

drop policy if exists "contact_messages_admin_select" on public.contact_messages;
create policy "contact_messages_admin_select"
on public.contact_messages
for select
to authenticated
using (public.is_admin());

drop policy if exists "contact_messages_admin_update" on public.contact_messages;
create policy "contact_messages_admin_update"
on public.contact_messages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- custom_orders
-- ------------------------------------------------------------

create table if not exists public.custom_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  name text not null,
  email text not null,
  phone text,
  shoe_type text not null,
  size text,
  preferred_colors text,
  material text,
  budget_range text,
  delivery_timeline text,
  inspiration_url text,
  design_notes text not null,
  status text not null default 'pending',
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_orders
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists shoe_type text,
  add column if not exists size text,
  add column if not exists preferred_colors text,
  add column if not exists material text,
  add column if not exists budget_range text,
  add column if not exists delivery_timeline text,
  add column if not exists inspiration_url text,
  add column if not exists design_notes text,
  add column if not exists status text not null default 'pending',
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'custom_orders_status_check'
  ) then
    alter table public.custom_orders
      add constraint custom_orders_status_check
      check (status in ('pending', 'in_review', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists idx_custom_orders_created_at on public.custom_orders(created_at desc);
create index if not exists idx_custom_orders_status on public.custom_orders(status);

drop trigger if exists trg_custom_orders_updated_at on public.custom_orders;
create trigger trg_custom_orders_updated_at
before update on public.custom_orders
for each row
execute function public.set_updated_at();

alter table public.custom_orders enable row level security;

drop policy if exists "custom_orders_insert_public" on public.custom_orders;
create policy "custom_orders_insert_public"
on public.custom_orders
for insert
to anon, authenticated
with check (
  public.is_admin()
  or (auth.role() = 'anon')
  or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
);

drop policy if exists "custom_orders_admin_select" on public.custom_orders;
create policy "custom_orders_admin_select"
on public.custom_orders
for select
to authenticated
using (public.is_admin());

drop policy if exists "custom_orders_admin_update" on public.custom_orders;
create policy "custom_orders_admin_update"
on public.custom_orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- product_ratings
-- ------------------------------------------------------------

create table if not exists public.product_ratings (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  rating integer not null,
  review_text text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, user_id)
);

alter table public.product_ratings
  add column if not exists product_id text,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists user_email text,
  add column if not exists rating integer,
  add column if not exists review_text text default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_ratings_rating_check'
  ) then
    alter table public.product_ratings
      add constraint product_ratings_rating_check
      check (rating between 1 and 5);
  end if;
end $$;

create index if not exists idx_product_ratings_product_id on public.product_ratings(product_id);
create index if not exists idx_product_ratings_created_at on public.product_ratings(created_at desc);

drop trigger if exists trg_product_ratings_updated_at on public.product_ratings;
create trigger trg_product_ratings_updated_at
before update on public.product_ratings
for each row
execute function public.set_updated_at();

alter table public.product_ratings enable row level security;

drop policy if exists "product_ratings_select_public" on public.product_ratings;
create policy "product_ratings_select_public"
on public.product_ratings
for select
to anon, authenticated
using (true);

drop policy if exists "product_ratings_insert_own" on public.product_ratings;
create policy "product_ratings_insert_own"
on public.product_ratings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "product_ratings_update_own" on public.product_ratings;
create policy "product_ratings_update_own"
on public.product_ratings
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "product_ratings_delete_own_or_admin" on public.product_ratings;
create policy "product_ratings_delete_own_or_admin"
on public.product_ratings
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- faqs
-- ------------------------------------------------------------

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.faqs
  add column if not exists question text,
  add column if not exists answer text,
  add column if not exists is_published boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_faqs_sort_order on public.faqs(sort_order asc, created_at asc);

drop trigger if exists trg_faqs_updated_at on public.faqs;
create trigger trg_faqs_updated_at
before update on public.faqs
for each row
execute function public.set_updated_at();

alter table public.faqs enable row level security;

drop policy if exists "faqs_select_published" on public.faqs;
create policy "faqs_select_published"
on public.faqs
for select
to anon, authenticated
using (is_published = true or public.is_admin());

drop policy if exists "faqs_admin_manage" on public.faqs;
create policy "faqs_admin_manage"
on public.faqs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- chats + chat_messages
-- ------------------------------------------------------------

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  guest_id text,
  status text not null default 'open',
  last_message text default '',
  last_sender text not null default 'user',
  unread_for_admin integer not null default 0,
  unread_for_user integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chats
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text,
  add column if not exists guest_id text,
  add column if not exists status text not null default 'open',
  add column if not exists last_message text default '',
  add column if not exists last_sender text not null default 'user',
  add column if not exists unread_for_admin integer not null default 0,
  add column if not exists unread_for_user integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chats_status_check'
  ) then
    alter table public.chats add constraint chats_status_check check (status in ('open', 'closed'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'chats_last_sender_check'
  ) then
    alter table public.chats add constraint chats_last_sender_check check (last_sender in ('user', 'admin'));
  end if;
end $$;

create index if not exists idx_chats_status_updated_at on public.chats(status, updated_at desc);
create index if not exists idx_chats_user_id on public.chats(user_id);
create index if not exists idx_chats_guest_id on public.chats(guest_id);

drop trigger if exists trg_chats_updated_at on public.chats;
create trigger trg_chats_updated_at
before update on public.chats
for each row
execute function public.set_updated_at();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  text text not null,
  sender text not null default 'user',
  sender_id text,
  created_at timestamptz not null default now()
);

alter table public.chat_messages
  add column if not exists chat_id uuid references public.chats(id) on delete cascade,
  add column if not exists text text,
  add column if not exists sender text not null default 'user',
  add column if not exists sender_id text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chat_messages_sender_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_sender_check check (sender in ('user', 'admin'));
  end if;
end $$;

create index if not exists idx_chat_messages_chat_id_created_at on public.chat_messages(chat_id, created_at asc);

alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;

-- NOTE:
-- Live chat is authenticated-user only.
-- Access is limited to chat owners and admins.

drop policy if exists "chats_select_scoped" on public.chats;
create policy "chats_select_scoped"
on public.chats
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "chats_insert_scoped" on public.chats;
create policy "chats_insert_scoped"
on public.chats
for insert
to authenticated
with check (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "chats_update_scoped" on public.chats;
create policy "chats_update_scoped"
on public.chats
for update
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
)
with check (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "chats_admin_delete" on public.chats;
create policy "chats_admin_delete"
on public.chats
for delete
to authenticated
using (public.is_admin());

drop policy if exists "chat_messages_select_scoped" on public.chat_messages;
create policy "chat_messages_select_scoped"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chats c
    where c.id = chat_messages.chat_id
      and (
        public.is_admin()
        or c.user_id = auth.uid()
      )
  )
);

drop policy if exists "chat_messages_insert_scoped" on public.chat_messages;
create policy "chat_messages_insert_scoped"
on public.chat_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chats c
    where c.id = chat_messages.chat_id
      and (
        public.is_admin()
        or c.user_id = auth.uid()
      )
  )
);

drop policy if exists "chat_messages_admin_update_delete" on public.chat_messages;
create policy "chat_messages_admin_update_delete"
on public.chat_messages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- Realtime publication
-- ------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
    ) then
      alter publication supabase_realtime add table public.products;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chats'
    ) then
      alter publication supabase_realtime add table public.chats;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    ) then
      alter publication supabase_realtime add table public.chat_messages;
    end if;
  end if;
end $$;
