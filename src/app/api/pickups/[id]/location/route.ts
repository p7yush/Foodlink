import { supabase, createAuthedClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, "")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabaseClient = createAuthedClient(token)
    const { id } = await params
    const body = await request.json()
    const { latitude, longitude } = body

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Latitude and longitude must be numbers",
        },
        { status: 400 }
      )
    }

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid latitude or longitude",
        },
        { status: 400 }
      )
    }

    const { data: pickup, error: pickupError } = await supabaseClient
      .from("pickups")
      .select("volunteer_id, status")
      .eq("id", id)
      .single()

    if (pickupError || !pickup) {
      return NextResponse.json(
        { success: false, error: "Pickup not found" },
        { status: 404 }
      )
    }

    if (pickup.volunteer_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: not the assigned volunteer",
        },
        { status: 403 }
      )
    }

    const allowedStatuses = [
      "en_route_to_donor",
      "collected",
      "en_route_to_ngo",
    ]

    if (!allowedStatuses.includes(pickup.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Location updates not allowed for this pickup status",
        },
        { status: 403 }
      )
    }

    const { error: updateError } = await supabaseClient
      .from("pickups")
      .update({
        volunteer_latitude: latitude,
        volunteer_longitude: longitude,
        volunteer_location_updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("LOCATION UPDATE DB ERROR:", updateError)

      return NextResponse.json(
        {
          success: false,
          error: "Could not update location",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("LOCATION UPDATE API ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Could not update location",
      },
      { status: 500 }
    )
  }
}
