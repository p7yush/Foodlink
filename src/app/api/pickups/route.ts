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
      .select("role")
      .eq("id", volunteer_id)
      .single()

    if (profileError || profile?.role !== "volunteer") {
      return NextResponse.json({ success: false, error: "Only volunteers can accept pickups" }, { status: 403 })
    }

    // Check if pickup already exists for this request
    const { data: existingPickup, error: existingPickupError } = await supabase
      .from("pickups")
      .select("id, request_id, volunteer_id, status, assigned_at")
      .eq("request_id", request_id)
      .maybeSingle()

    if (existingPickupError) {
      console.error("LOOKUP PICKUP ERROR:", existingPickupError)
      return NextResponse.json({ success: false, error: existingPickupError.message }, { status: 500 })
    }

    if (existingPickup) {
      if (existingPickup.volunteer_id === volunteer_id) {
        return NextResponse.json({ success: true, pickup: existingPickup, alreadyAssigned: true })
      }
      return NextResponse.json({ success: false, error: "This pickup has already been claimed by another volunteer." }, { status: 409 })
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

    return NextResponse.json({
      success: true,
      pickup: data
    })

  } catch (error) {
    console.error("API ERROR:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
