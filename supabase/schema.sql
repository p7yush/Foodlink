-- Foodlink schema. Safe to run more than once.

create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  name             text not null,
  email            text not null,
  role             text not null check (role in ('donor', 'ngo', 'volunteer')),
  organization     text,
  phone            text,
  address          text,
  latitude         double precision,
  longitude        double precision,
  -- Meals an NGO can take in at once. Ignored for donors and volunteers.
  capacity         integer not null default 100 check (capacity >= 0),
  food_preferences text[] not null default '{}',
  vehicle          text,
  status           text not null default 'active' check (status in ('active', 'full', 'offline')),
  created_at       timestamptz not null default now()
);

create table if not exists public.food_donations (
  id             uuid primary key default gen_random_uuid(),
  donor_id       uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  description    text,
  quantity       integer not null check (quantity > 0),
  food_type      text,
  expiry_time    timestamptz not null,
  latitude       double precision,
  longitude      double precision,
  pickup_address text,
  status         text not null default 'Available'
                 check (status in ('Available', 'Claimed', 'Completed', 'Expired')),
  created_at     timestamptz not null default now()
);

create table if not exists public.food_requests (
  id           uuid primary key default gen_random_uuid(),
  food_id      uuid not null references public.food_donations (id) on delete cascade,
  ngo_id       uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'rejected', 'completed')),
  requested_at timestamptz not null default now(),
  -- One NGO cannot queue the same donation twice.
  unique (food_id, ngo_id)
);

create table if not exists public.pickups (
  id                  uuid primary key default gen_random_uuid(),
  -- A claimed request belongs to exactly one volunteer, so this is unique.
  request_id          uuid not null unique references public.food_requests (id) on delete cascade,
  volunteer_id        uuid not null references public.profiles (id) on delete cascade,
  -- Mirrors the steps the volunteer screen walks through, in order.
  status              text not null default 'assigned'
                      check (status in ('assigned', 'en_route_to_donor', 'arrived_at_donor',
                                        'collected', 'en_route_to_ngo', 'arrived_at_ngo',
                                        'delivered', 'completed')),
  assigned_at         timestamptz not null default now(),
  arrived_at_donor_at timestamptz,
  collected_at        timestamptz,
  arrived_at_ngo_at   timestamptz,
  delivered_at        timestamptz,
  completed_at        timestamptz
);

create index if not exists food_donations_donor_idx    on public.food_donations (donor_id);
create index if not exists food_donations_created_idx  on public.food_donations (created_at desc);
create index if not exists food_donations_open_idx     on public.food_donations (expiry_time)
  where status = 'Available';
create index if not exists food_requests_food_idx      on public.food_requests (food_id);
create index if not exists food_requests_ngo_idx       on public.food_requests (ngo_id);
create index if not exists pickups_volunteer_idx       on public.pickups (volunteer_id);
create index if not exists profiles_role_idx           on public.profiles (role);

-- Signup creates the auth user and this fills in the matching profile, so a
-- client that never gets a session (email confirmation on) still ends up with one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, address, latitude, longitude)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'donor'),
    nullif(new.raw_user_meta_data ->> 'address', ''),
    (nullif(new.raw_user_meta_data ->> 'latitude', ''))::double precision,
    (nullif(new.raw_user_meta_data ->> 'longitude', ''))::double precision
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Completing a delivery has to close the request and the donation too. Doing it
-- here keeps it atomic and means a volunteer needs no write access to either table.
create or replace function public.sync_on_pickup_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.food_requests
       set status = 'completed'
     where id = new.request_id;

    update public.food_donations
       set status = 'Completed'
     where id = (select food_id from public.food_requests where id = new.request_id);
  end if;
  return new;
end;
$$;

drop trigger if exists pickups_sync_completed on public.pickups;
create trigger pickups_sync_completed
  after update on public.pickups
  for each row execute function public.sync_on_pickup_completed();

alter table public.profiles       enable row level security;
alter table public.food_donations enable row level security;
alter table public.food_requests  enable row level security;
alter table public.pickups        enable row level security;

-- Every table is readable only once signed in: pickup addresses and contact
-- details are personal data, and the whole app sits behind login anyway.

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists donations_read on public.food_donations;
create policy donations_read on public.food_donations
  for select to authenticated using (true);

drop policy if exists donations_insert_own on public.food_donations;
create policy donations_insert_own on public.food_donations
  for insert to authenticated with check (donor_id = auth.uid());

drop policy if exists donations_update_own on public.food_donations;
create policy donations_update_own on public.food_donations
  for update to authenticated using (donor_id = auth.uid()) with check (donor_id = auth.uid());

drop policy if exists donations_delete_own on public.food_donations;
create policy donations_delete_own on public.food_donations
  for delete to authenticated using (donor_id = auth.uid());

drop policy if exists requests_read on public.food_requests;
create policy requests_read on public.food_requests
  for select to authenticated using (true);

drop policy if exists requests_insert_own on public.food_requests;
create policy requests_insert_own on public.food_requests
  for insert to authenticated with check (ngo_id = auth.uid());

-- The NGO may withdraw its own request; the donor may accept or reject it.
drop policy if exists requests_update_party on public.food_requests;
create policy requests_update_party on public.food_requests
  for update to authenticated
  using (
    ngo_id = auth.uid()
    or exists (
      select 1 from public.food_donations d
      where d.id = food_requests.food_id and d.donor_id = auth.uid()
    )
  )
  with check (
    ngo_id = auth.uid()
    or exists (
      select 1 from public.food_donations d
      where d.id = food_requests.food_id and d.donor_id = auth.uid()
    )
  );

drop policy if exists pickups_read on public.pickups;
create policy pickups_read on public.pickups
  for select to authenticated using (true);

drop policy if exists pickups_insert_own on public.pickups;
create policy pickups_insert_own on public.pickups
  for insert to authenticated with check (volunteer_id = auth.uid());

drop policy if exists pickups_update_own on public.pickups;
create policy pickups_update_own on public.pickups
  for update to authenticated using (volunteer_id = auth.uid()) with check (volunteer_id = auth.uid());

create or replace function public.impact_stats()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'meals_rescued', coalesce((
      select sum(d.quantity)
      from public.pickups p
      join public.food_requests r on r.id = p.request_id
      join public.food_donations d on d.id = r.food_id
      where p.status = 'completed'
    ), 0),
    'completed_deliveries', (select count(*) from public.pickups where status = 'completed'),
    'active_volunteers', (select count(*) from public.profiles where role = 'volunteer'),
    'partner_shelters', (select count(*) from public.profiles where role = 'ngo'),
    'donor_partners', (select count(*) from public.profiles where role = 'donor'),
    'available_now', (
      select count(*) from public.food_donations
      where status = 'Available' and expiry_time > now()
    )
  );
$$;

revoke all on function public.impact_stats() from public;
grant execute on function public.impact_stats() to anon, authenticated;
