-- ShoesX: Admin Users + FAQ schema/policies
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

alter table if exists public.users_profile enable row level security;
alter table if exists public.users_profile no force row level security;

alter table if exists public.users_profile
  add column if not exists role text not null default 'user',
  add column if not exists disabled boolean not null default false;

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.faqs enable row level security;

-- IMPORTANT:
-- Avoid recursive RLS checks by using a SECURITY DEFINER helper.
-- Direct policies like "exists(select ... from users_profile)" on users_profile
-- can recurse and raise: infinite recursion detected in policy for relation "users_profile".
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text;
begin
  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  -- fixed admin account shortcut
  if jwt_email = 'admin@gmail.com' then
    return true;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.users_profile up
    where up.id = auth.uid()
      and up.role = 'admin'
      and coalesce(up.disabled, false) = false
  );
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_faqs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_faqs_updated_at on public.faqs;
create trigger trg_faqs_updated_at
before update on public.faqs
for each row
execute function public.set_faqs_updated_at();

drop policy if exists "Public can read published faqs" on public.faqs;
create policy "Public can read published faqs"
on public.faqs
for select
to anon, authenticated
using (is_published = true or public.is_admin());

drop policy if exists "Admins manage faqs" on public.faqs;
drop policy if exists "faqs_admin_manage" on public.faqs;
create policy "Admins manage faqs"
on public.faqs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own profile" on public.users_profile;
create policy "Users can read own profile"
on public.users_profile
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.users_profile;
create policy "Users can update own profile"
on public.users_profile
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins can read all profiles" on public.users_profile;
drop policy if exists "users_profile_admin_select_all" on public.users_profile;
create policy "Admins can read all profiles"
on public.users_profile
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update profiles" on public.users_profile;
drop policy if exists "users_profile_admin_update_all" on public.users_profile;
create policy "Admins can update profiles"
on public.users_profile
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
