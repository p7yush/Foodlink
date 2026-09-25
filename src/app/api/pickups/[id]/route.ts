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
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await defaultSupabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Create an authenticated client to pass RLS
    const supabase = createAuthedClient(token)

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 })
    }

    // Verify user owns the pickup
    const { data: pickupInfo, error: pickupError } = await supabase
      .from("pickups")
      .select("volunteer_id, request_id")
      .eq("id", id)
      .single()
      
    if (pickupError || !pickupInfo || pickupInfo.volunteer_id !== user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized to update this pickup" }, { status: 403 })
    }

    // Determine timestamp field based on status
    const updateData: Record<string, string> = { status }
    if (status === "arrived_at_donor") updateData.arrived_at_donor_at = new Date().toISOString()
    if (status === "collected") updateData.collected_at = new Date().toISOString()
    if (status === "arrived_at_ngo") updateData.arrived_at_ngo_at = new Date().toISOString()
    if (status === "delivered" || status === "completed") {
      updateData.delivered_at = new Date().toISOString()
      updateData.completed_at = new Date().toISOString()
      updateData.status = "completed"
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

    return NextResponse.json({
      success: true,
      pickup: data
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 })
  }
}
