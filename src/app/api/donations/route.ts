import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { geocodeAddress } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    // Check authentication
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    // Read request body
    const body = await request.json()

    const {
      title,
      description,
      quantity,
      food_type,
      expiry_time,
      latitude,
      longitude,
      pickup_address,
    } = body

    // Always use the authenticated user's ID
    const donor_id = user.id

    // Validate required fields
    if (!title || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Food title and quantity are required",
        },
        { status: 400 }
      )
    }

    // Validate expiry time
    if (!expiry_time) {
      return NextResponse.json(
        {
          success: false,
          error: "Expiry time is required",
        },
        { status: 400 }
      )
    }

    // Handle coordinates
    let finalLat = latitude
    let finalLng = longitude

    if (pickup_address && (!finalLat || !finalLng)) {
      const coords = await geocodeAddress(pickup_address)

      if (coords) {
        finalLat = coords.lat
        finalLng = coords.lng
      }
    }

    // Create donation
    const { data, error } = await supabase
      .from("food_donations")
      .insert([
        {
          title,
          description,
          quantity: Number(quantity),
          food_type,
          expiry_time,
          latitude: finalLat,
          longitude: finalLng,
          pickup_address,
          donor_id,
        },
      ])
      .select()
      .single()

    // Handle database error
    if (error) {
      console.error("SUPABASE DONATION ERROR:", error)

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    console.log("DONATION CREATED:", data)

    return NextResponse.json({
      success: true,
      message: "Food donation created successfully!",
      donation: data,
    })
  } catch (error) {
    console.error("DONATION API ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      { status: 400 }
    )
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("food_donations")
      .select("*")
      .order("created_at", {
        ascending: false,
      })

    if (error) {
      console.error("SUPABASE GET DONATIONS ERROR:", error)

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      donations: data,
    })
  } catch (error) {
    console.error("GET DONATIONS ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch donations",
      },
      { status: 500 }
    )
  }
}