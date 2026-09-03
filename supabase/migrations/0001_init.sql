-- Fridge & Pantry schema. Run in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles: one row per user, holds reminder preferences and the calendar token
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  email          text,
  calendar_token uuid        not null default gen_random_uuid() unique,
  email_digest   boolean     not null default false,
  push_digest    boolean     not null default true,
  digest_hour    int         not null default 8 check (digest_hour between 0 and 23),
  timezone       text        not null default 'UTC',
  alert_days     int         not null default 2 check (alert_days between 0 and 30),
  last_digest_on date,
  created_at     timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email) values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  quantity    numeric     not null default 1,
  unit        text        not null default 'pcs',
  location    text        not null check (location in ('fridge', 'freezer', 'pantry')),
  category    text        not null default 'other',
  expires_on  date,
  date_kind   text        check (date_kind is null or date_kind in ('use_by', 'best_before')),
  opened_on   date,
  photo_url   text,
  notes       text,
  status      text        not null default 'in_stock' check (status in ('in_stock', 'used', 'tossed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists items_user_status_expiry on public.items (user_id, status, expires_on);

create table if not exists public.staples (
  id              uuid primary key,
  user_id         uuid        not null references auth.users (id) on delete cascade,
  name            text        not null,
  category        text        not null default 'other',
  target_quantity numeric     not null default 1,
  unit            text        not null default 'pcs',
  created_at      timestamptz not null default now()
);
create index if not exists staples_user on public.staples (user_id);

create table if not exists public.shopping_list (
  id          uuid primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  quantity    numeric     not null default 1,
  unit        text        not null default 'pcs',
  category    text        not null default 'other',
  checked     boolean     not null default false,
  auto_added  boolean     not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists shopping_user on public.shopping_list (user_id);

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  p256dh      text        not null,
  auth        text        not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_user on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Row level security: every table is scoped to auth.uid()
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.items              enable row level security;
alter table public.staples            enable row level security;
alter table public.shopping_list      enable row level security;
alter table public.push_subscriptions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'items', 'staples', 'shopping_list', 'push_subscriptions'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;

-- Realtime change feed for cross-device sync
do $$
begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.staples;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.shopping_list;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Photo storage: public-read bucket, users write only inside their own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos public read"  on storage.objects;
drop policy if exists "photos own insert"   on storage.objects;
drop policy if exists "photos own update"   on storage.objects;
drop policy if exists "photos own delete"   on storage.objects;

create policy "photos public read" on storage.objects
  for select using (bucket_id = 'photos');
create policy "photos own insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
