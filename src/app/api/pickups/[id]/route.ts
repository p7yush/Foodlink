import { supabase as defaultSupabase, createAuthedClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.replace(/^Bearer\s+/i, "")
    const { data: { user }, error: authError } = await defaultSupabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Create an authenticated client to pass RLS
    const supabase = createAuthedClient(token)

    const { id } = await params
    const body = await request.json()
    const { status, delivery_note, delivery_latitude, delivery_longitude } = body

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 })
    }

    // Verify user owns the pickup
    const { data: pickupInfo, error: pickupError } = await supabase
      .from("pickups")
      .select("status, volunteer_id, request_id, donor_handoff_confirmed_at, food_requests(ngo_id, food_donations(donor_id))")
      .eq("id", id)
      .single()

    if (pickupError) {
      return NextResponse.json({ success: false, error: pickupError.message }, { status: 500 })
    }
    if (!pickupInfo) {
      return NextResponse.json({ success: false, error: "Pickup not found" }, { status: 404 })
    }
    if (pickupInfo.volunteer_id !== user.id) {
      return NextResponse.json({ success: false, error: "This pickup is not assigned to you" }, { status: 403 })
    }

    if (status === "cancelled") {
      if (pickupInfo.status === "completed" || pickupInfo.status === "delivered" || pickupInfo.status === "cancelled") {
        return NextResponse.json({ success: false, error: "Cannot cancel this pickup." }, { status: 409 })
      }
    } else {
      const currentStatus = pickupInfo.status;
      const validTransitions: Record<string, string[]> = {
        assigned: ['en_route_to_donor', 'cancelled'],
        en_route_to_donor: ['arrived_at_donor', 'cancelled'],
        arrived_at_donor: ['collected', 'cancelled'],
        collected: ['en_route_to_ngo', 'cancelled'],
        en_route_to_ngo: ['arrived_at_ngo', 'cancelled'],
        arrived_at_ngo: ['delivered', 'cancelled'],
        delivered: ['completed'],
        completed: [],
        cancelled: []
      };

      if (!validTransitions[currentStatus]?.includes(status)) {
         return NextResponse.json({ success: false, error: `Cannot transition from ${currentStatus} to ${status}` }, { status: 409 })
      }

      if (status === "en_route_to_ngo" && !pickupInfo.donor_handoff_confirmed_at) {
        return NextResponse.json({ success: false, error: "Waiting for the donor to confirm the food handoff." }, { status: 409 })
      }
    }

    // Determine timestamp field based on status
    const updateData: Record<string, string | number> = { status }
    if (status === "arrived_at_donor") updateData.arrived_at_donor_at = new Date().toISOString()
    if (status === "collected") updateData.collected_at = new Date().toISOString()
    if (status === "en_route_to_ngo") updateData.en_route_to_ngo_at = new Date().toISOString()
    if (status === "arrived_at_ngo") updateData.arrived_at_ngo_at = new Date().toISOString()
    if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString()
      if (delivery_note !== undefined && delivery_note !== null) updateData.delivery_note = String(delivery_note)
      if (delivery_latitude !== undefined && delivery_latitude !== null) {
        const lat = Number(delivery_latitude)
        if (Number.isNaN(lat) || !Number.isFinite(lat) || lat < -90 || lat > 90) {
          return NextResponse.json({ success: false, error: "Invalid delivery_latitude" }, { status: 400 })
        }
        updateData.delivery_latitude = lat
      }
      if (delivery_longitude !== undefined && delivery_longitude !== null) {
        const lng = Number(delivery_longitude)
        if (Number.isNaN(lng) || !Number.isFinite(lng) || lng < -180 || lng > 180) {
          return NextResponse.json({ success: false, error: "Invalid delivery_longitude" }, { status: 400 })
        }
        updateData.delivery_longitude = lng
      }
    }
    const { data, error } = await supabase
      .from("pickups")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Closing out the request and the donation is handled by the
    // pickups_sync_completed trigger, which runs inside the same transaction.

    // Notifications
    const requestData = pickupInfo.food_requests as unknown as { ngo_id: string, food_donations: { donor_id: string } | null } | null;
    if (requestData) {
       const donorId = requestData.food_donations?.donor_id;
       const ngoId = requestData.ngo_id;

       if (status === "cancelled") {
         const notifs = [];
         if (donorId) notifs.push({ user_id: donorId, title: "Pickup Cancelled", message: "A volunteer cancelled their pickup.", type: "pickup_cancelled", reference_id: id });
         if (ngoId) notifs.push({ user_id: ngoId, title: "Pickup Cancelled", message: "A volunteer cancelled their pickup.", type: "pickup_cancelled", reference_id: id });
         if (notifs.length > 0) await supabase.from("user_notifications").insert(notifs);
       } else if (status === "delivered") {
         const notifs = [];
         if (donorId) notifs.push({ user_id: donorId, title: "Food Delivered", message: "Your donation has been delivered.", type: "delivery_completed", reference_id: id });
         if (ngoId) notifs.push({ user_id: ngoId, title: "Food Delivered", message: "A volunteer has delivered food.", type: "delivery_completed", reference_id: id });
         if (notifs.length > 0) await supabase.from("user_notifications").insert(notifs);
       } else if (status === "collected") {
         if (ngoId) await supabase.from("user_notifications").insert([{ user_id: ngoId, title: "Food Collected", message: "A volunteer has picked up the food from the donor.", type: "donor_handoff", reference_id: id }]);
       }
    }

    return NextResponse.json({
      success: true,
      pickup: data
    })
  } catch (err) {
    console.error(err)
    const errorMessage = err instanceof Error ? err.message : "Server Error"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
