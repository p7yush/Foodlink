-- Demo network for Foodlink, covering every state a judge needs to see:
-- food waiting to be matched, a request awaiting the donor's decision, an
-- accepted request waiting for a driver, a delivery in progress and one
-- completed delivery so the analytics page has real figures.
--
-- Accounts are looked up by email rather than by id, so this file is portable
-- between projects. Every statement is guarded, so it is safe to run twice.
--
-- Run supabase/schema.sql first, then sign up these six accounts (any password):
--   annas.kitchen@example.com     donor
--   grand.caterers@example.com    donor
--   asha.shelter@example.com      ngo
--   seva.foundation@example.com   ngo
--   rohit.driver@example.com      volunteer
--   neha.driver@example.com       volunteer

-- Details the signup form does not collect.
update public.profiles set organization = 'Anna''s Kitchen'
  where email = 'annas.kitchen@example.com';
update public.profiles set organization = 'Grand Palace Caterers'
  where email = 'grand.caterers@example.com';

update public.profiles
   set organization = 'Asha Shelter Trust', capacity = 250, food_preferences = '{}', status = 'active'
 where email = 'asha.shelter@example.com';

update public.profiles
   set organization = 'Seva Foundation', capacity = 120,
       food_preferences = array['Cooked', 'Packaged'], status = 'active'
 where email = 'seva.foundation@example.com';

update public.profiles set vehicle = 'Motorcycle' where email = 'rohit.driver@example.com';
update public.profiles set vehicle = 'Hatchback'  where email = 'neha.driver@example.com';

-- Donations. Location and address are copied from the donor's own profile.
insert into public.food_donations
  (donor_id, title, description, quantity, food_type, expiry_time,
   latitude, longitude, pickup_address, status, created_at)
select p.id, v.title, v.description, v.quantity, v.food_type,
       now() + v.expires_in, p.latitude, p.longitude, p.address, v.status, now() - v.posted_ago
  from public.profiles p
  join (values
      ('annas.kitchen@example.com',  'Vegetable biryani',        'Freshly cooked, packed in insulated trays.',          80,  'Cooked',        interval '5 hours',  'Available', interval '25 minutes'),
      ('annas.kitchen@example.com',  'Paneer curry and rotis',   'Lunch service surplus, still hot.',                    45,  'Cooked',        interval '3 hours',  'Available', interval '40 minutes'),
      ('annas.kitchen@example.com',  'Packaged bread loaves',    'Sealed loaves, best before tomorrow evening.',         60,  'Packaged',      interval '30 hours', 'Available', interval '2 hours'),
      ('grand.caterers@example.com', 'Wedding buffet surplus',   'Mixed vegetarian buffet from an evening function.',    200, 'Cooked',        interval '4 hours',  'Available', interval '1 hour'),
      ('grand.caterers@example.com', 'Assorted fruit trays',     'Cut seasonal fruit, refrigerated.',                    35,  'Fresh produce', interval '20 hours', 'Available', interval '3 hours'),
      ('grand.caterers@example.com', 'Chapati and sabzi',        'Corporate lunch surplus, claimed and awaiting pickup.', 50,  'Cooked',        interval '4 hours',  'Claimed',   interval '90 minutes'),
      ('annas.kitchen@example.com',  'Mixed vegetable pulao',    'Claimed, driver already collected.',                   70,  'Cooked',        interval '6 hours',  'Claimed',   interval '2 hours')
    ) as v(email, title, description, quantity, food_type, expires_in, status, posted_ago)
    on v.email = p.email
 where not exists (
   select 1 from public.food_donations d where d.donor_id = p.id and d.title = v.title
 );

-- One delivery that already finished, dated two days ago so the analytics chart
-- and the volunteer history page both have something real to show.
insert into public.food_donations
  (donor_id, title, description, quantity, food_type, expiry_time,
   latitude, longitude, pickup_address, status, created_at)
select p.id, 'Sambar and idli', 'Breakfast service surplus, delivered in full.', 90, 'Cooked',
       now() - interval '2 days' + interval '4 hours', p.latitude, p.longitude, p.address,
       'Completed', now() - interval '2 days'
  from public.profiles p
 where p.email = 'annas.kitchen@example.com'
   and not exists (
     select 1 from public.food_donations d where d.donor_id = p.id and d.title = 'Sambar and idli'
   );

-- Requests: one still pending the donor's decision, three accepted.
insert into public.food_requests (food_id, ngo_id, status, requested_at)
select d.id, n.id, v.status, now() - v.ago
  from (values
      ('Vegetable biryani',      'seva.foundation@example.com', 'pending',   interval '10 minutes'),
      ('Chapati and sabzi',      'asha.shelter@example.com',    'accepted',  interval '70 minutes'),
      ('Mixed vegetable pulao',  'seva.foundation@example.com', 'accepted',  interval '100 minutes'),
      ('Sambar and idli',        'asha.shelter@example.com',    'completed', interval '2 days')
    ) as v(title, ngo_email, status, ago)
  join public.food_donations d on d.title = v.title
  join public.profiles n on n.email = v.ngo_email
 where not exists (
   select 1 from public.food_requests r where r.food_id = d.id and r.ngo_id = n.id
 );

-- Pickups. 'Chapati and sabzi' deliberately has no pickup row so that it shows
-- up on the volunteer's Available Pickups screen.
insert into public.pickups
  (request_id, volunteer_id, status, assigned_at, arrived_at_donor_at, collected_at)
select r.id, vol.id, 'collected', now() - interval '80 minutes', now() - interval '60 minutes', now() - interval '45 minutes'
  from public.food_requests r
  join public.food_donations d on d.id = r.food_id and d.title = 'Mixed vegetable pulao'
  join public.profiles vol on vol.email = 'rohit.driver@example.com'
 where not exists (select 1 from public.pickups p where p.request_id = r.id);

insert into public.pickups
  (request_id, volunteer_id, status, assigned_at, arrived_at_donor_at, collected_at,
   arrived_at_ngo_at, delivered_at, completed_at)
select r.id, vol.id, 'completed',
       now() - interval '2 days' + interval '30 minutes',
       now() - interval '2 days' + interval '50 minutes',
       now() - interval '2 days' + interval '55 minutes',
       now() - interval '2 days' + interval '80 minutes',
       now() - interval '2 days' + interval '85 minutes',
       now() - interval '2 days' + interval '85 minutes'
  from public.food_requests r
  join public.food_donations d on d.id = r.food_id and d.title = 'Sambar and idli'
  join public.profiles vol on vol.email = 'rohit.driver@example.com'
 where not exists (select 1 from public.pickups p where p.request_id = r.id);
