import { supabase as defaultSupabase, createAuthedClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { request_id } = body
    const volunteer_id = user.id

    if (!request_id) {
      return NextResponse.json({ success: false, error: "Request ID is required" }, { status: 400 })
    }

    // Verify user is volunteer
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_available")
      .eq("id", volunteer_id)
      .single()

    if (profileError || profile?.role !== "volunteer") {
      return NextResponse.json({ success: false, error: "Only volunteers can accept pickups" }, { status: 403 })
    }
    const { data: requestData, error: requestError } = await supabase
      .from("food_requests")
      .select("status, ngo_id, food_donations(id, donor_id, expiry_time, status), pickups(id, volunteer_id, status, assigned_at)")
      .eq("id", request_id)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 })
    }

    const donation = requestData.food_donations as unknown as { id: string, donor_id: string, expiry_time: string, status: string }
    if (!donation) {
      return NextResponse.json({ success: false, error: "Donation not found" }, { status: 404 })
    }

    if (donation.status === "Expired" || new Date(donation.expiry_time).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: "This pickup window has expired." }, { status: 400 })
    }

    const assignedPickups = Array.isArray(requestData.pickups) ? requestData.pickups : requestData.pickups ? [requestData.pickups] : []
    const activePickup = assignedPickups.find(p => p.status !== 'cancelled')

    if (activePickup) {
      if (activePickup.volunteer_id === volunteer_id) {
        return NextResponse.json({ success: true, pickup: activePickup, alreadyAssigned: true })
      }
      return NextResponse.json({ success: false, error: "This pickup has already been claimed by another volunteer." }, { status: 409 })
    }

    if (profile.is_available === false) {
      return NextResponse.json({
        success: false,
        error: "Set your volunteer status to Available in Profile before accepting a pickup.",
      }, { status: 403 })
    }

    // Insert new pickup
    const { data, error } = await supabase
      .from("pickups")
      .insert([{
        request_id,
        volunteer_id,
        status: "assigned"
      }])
      .select()
      .single()

    if (error) {
      console.error("INSERT PICKUP ERROR:", error)
      if (error.code === "23505") {
        const { data: racedPickup } = await supabase
          .from("pickups")
          .select("id, request_id, volunteer_id, status, assigned_at")
          .eq("request_id", request_id)
          .maybeSingle()
        if (racedPickup?.volunteer_id === volunteer_id) {
          return NextResponse.json({ success: true, pickup: racedPickup, alreadyAssigned: true })
        }
        return NextResponse.json({
          success: false,
          error: "Another volunteer just accepted this pickup. Refresh the page to see its status.",
        }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Insert Notification for Donor
    if (donation.donor_id) {
      await supabase.from("user_notifications").insert([{
        user_id: donation.donor_id,
        title: "Pickup Accepted",
        message: "A volunteer has accepted your pickup and is on the way.",
        type: "pickup_accepted",
        reference_id: data.id
      }]);
    }

    return NextResponse.json({
      success: true,
      pickup: data
    })

  } catch (error) {
    console.error("API ERROR:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
