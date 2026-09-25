-- Run this once in the Supabase SQL Editor to enable donor/NGO handoff checks.
alter table public.pickups
  add column if not exists en_route_to_ngo_at timestamptz,
  add column if not exists donor_handoff_confirmed_at timestamptz,
  add column if not exists recipient_received_at timestamptz;

-- Order tracking must be able to see an assigned pickup after a volunteer claims it.
drop policy if exists pickups_read on public.pickups;
create policy pickups_read on public.pickups
  for select to authenticated using (true);

-- A donor verifies collection and the requested NGO verifies receipt. The
-- function checks the signed-in account and performs each update atomically.
create or replace function public.confirm_order_handoff(
  p_pickup_id uuid,
  p_stage text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pickup public.pickups%rowtype;
  v_donor_id uuid;
  v_ngo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to confirm this handoff.';
  end if;

  select p.* into v_pickup
    from public.pickups p
   where p.id = p_pickup_id
   for update;

  if not found then
    raise exception 'Order pickup was not found.';
  end if;

  select d.donor_id, r.ngo_id into v_donor_id, v_ngo_id
    from public.food_requests r
    join public.food_donations d on d.id = r.food_id
   where r.id = v_pickup.request_id;

  if p_stage = 'donor_pickup' then
    if auth.uid() <> v_donor_id then
      raise exception 'Only the donor can confirm pickup.';
    end if;
    if v_pickup.status <> 'collected' then
      raise exception 'The volunteer must mark the food as picked up first.';
    end if;
    update public.pickups
       set donor_handoff_confirmed_at = coalesce(donor_handoff_confirmed_at, now())
     where id = p_pickup_id
     returning * into v_pickup;
  elsif p_stage = 'ngo_receipt' then
    if auth.uid() <> v_ngo_id then
      raise exception 'Only the requested NGO can confirm delivery.';
    end if;
    if v_pickup.status <> 'arrived_at_ngo' then
      raise exception 'The volunteer must arrive at the NGO before receipt can be confirmed.';
    end if;
    update public.pickups
       set recipient_received_at = coalesce(recipient_received_at, now()),
           delivered_at = coalesce(delivered_at, now()),
           completed_at = coalesce(completed_at, now()),
           status = 'completed'
     where id = p_pickup_id
     returning * into v_pickup;
  else
    raise exception 'Unknown handoff confirmation stage.';
  end if;

  return to_jsonb(v_pickup);
end;
$$;

revoke all on function public.confirm_order_handoff(uuid, text) from public;
grant execute on function public.confirm_order_handoff(uuid, text) to authenticated;
