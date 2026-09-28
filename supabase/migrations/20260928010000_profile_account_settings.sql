-- Profile settings extend the existing profiles row. Existing donor/NGO
-- coordinates remain in profiles; volunteer live GPS remains on pickups.
begin;

alter table public.profiles
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists profile_image_path text,
  add column if not exists description text,
  add column if not exists website text,
  add column if not exists contact_person text,
  add column if not exists contact_phone text,
  add column if not exists pickup_address text,
  add column if not exists pickup_instructions text,
  add column if not exists operating_hours text,
  add column if not exists daily_capacity integer check (daily_capacity is null or daily_capacity >= 0),
  add column if not exists is_available boolean not null default true,
  add column if not exists preferred_pickup_radius_km integer not null default 10,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

-- Account roles are assigned by the signup flow and must not be changed by a
-- user editing their own profile through the broad existing self-update policy.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'Account role cannot be changed from profile settings.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_immutable on public.profiles;
create trigger profiles_role_immutable
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- Profile images are public avatars. Writes are limited to each user's own
-- folder, while the bucket enforces the accepted image formats and size.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foodlink-profile-images',
  'foodlink-profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_images_insert_own on storage.objects;
create policy profile_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foodlink-profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists profile_images_select_own on storage.objects;
create policy profile_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'foodlink-profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists profile_images_delete_own on storage.objects;
create policy profile_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'foodlink-profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

commit;
