-- Add 'cancelled' status to pickups table by recreating the check constraint
ALTER TABLE public.pickups
DROP CONSTRAINT IF EXISTS pickups_status_check;

ALTER TABLE public.pickups
ADD CONSTRAINT pickups_status_check
CHECK (status IN ('assigned', 'en_route_to_donor', 'arrived_at_donor', 'collected', 'en_route_to_ngo', 'arrived_at_ngo', 'delivered', 'completed', 'cancelled'));

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  reference_id uuid,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON public.user_notifications (user_id);
CREATE INDEX IF NOT EXISTS user_notifications_created_idx ON public.user_notifications (created_at desc);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_read_own ON public.user_notifications;
CREATE POLICY user_notifications_read_own ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_notifications_update_own ON public.user_notifications;
CREATE POLICY user_notifications_update_own ON public.user_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_notifications_insert_auth ON public.user_notifications;
CREATE POLICY user_notifications_insert_auth ON public.user_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pickups p
      JOIN public.food_requests r ON p.request_id = r.id
      JOIN public.food_donations d ON r.food_id = d.id
      WHERE p.id = user_notifications.reference_id
        AND p.volunteer_id = auth.uid()
        AND user_notifications.user_id IN (r.ngo_id, d.donor_id)
    )
  );

-- Drop the unique constraint on request_id so multiple cancelled pickups can exist, 
-- but only one active pickup per request.
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.pickups'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%request_id%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.pickups DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.pickups
ADD COLUMN IF NOT EXISTS delivery_note text,
ADD COLUMN IF NOT EXISTS delivery_latitude double precision,
ADD COLUMN IF NOT EXISTS delivery_longitude double precision;

CREATE UNIQUE INDEX IF NOT EXISTS pickups_active_request_idx 
ON public.pickups (request_id) 
WHERE status != 'cancelled';

-- Adding an RPC function to cancel a pickup safely
CREATE OR REPLACE FUNCTION public.cancel_pickup(
  p_pickup_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup public.pickups%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pickup
    FROM public.pickups
   WHERE id = p_pickup_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup not found.';
  END IF;

  IF v_pickup.volunteer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned volunteer can cancel this pickup.';
  END IF;

  IF v_pickup.status IN ('completed', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot cancel a completed or already cancelled pickup.';
  END IF;

  -- Update pickup status to cancelled
  UPDATE public.pickups
     SET status = 'cancelled'
   WHERE id = p_pickup_id
   RETURNING * INTO v_pickup;

  -- The donation goes back to available state?
  -- If it's cancelled, the request is still 'accepted' and another volunteer can pick it up.
  -- The requirement says "return the donation to available state".
  -- Wait! A donation state is 'Available', 'Claimed', 'Completed', 'Expired'.
  -- Does a donation become 'Available' again?
  -- If the donation goes back to available, what about the request?
  -- Maybe we should just let the request be 'accepted' and another volunteer picks it up, 
  -- OR we set the request back to 'pending'? But the NGO already accepted it.
  -- Let's just update the request status if necessary. The requirements say "if appropriate, return the donation to available state".
  -- Let's leave the request as 'accepted' so another volunteer can see it in Available Pickups.
  -- Wait, the `fetchPickups` query fetches requests where status = 'accepted' and no non-cancelled pickup.

  RETURN to_jsonb(v_pickup);
END;
$$;

