import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { food_id, ngo_id } = body

    if (!food_id || !ngo_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Food ID and NGO ID are required",
        },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", ngo_id)
      .maybeSingle()

    if (profileError) {
      console.error("PROFILE LOOKUP ERROR:", profileError)

      return NextResponse.json(
        {
          success: false,
          error: profileError.message,
        },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "NGO profile not found",
        },
        { status: 404 }
      )
    }

    if (profile.role !== "ngo") {
      return NextResponse.json(
        {
          success: false,
          error: "Only NGO users can request food",
        },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from("food_requests")
      .insert([
        {
          food_id,
          ngo_id,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("FOOD REQUEST ERROR:", error)

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
      message: "Food request created successfully!",
      request: data,
    })
  } catch (error) {
    console.error("REQUEST API ERROR:", error)

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
      .from("food_requests")
      .select(`
        id,
        food_id,
        ngo_id,
        status,
        requested_at,
        profiles (
          id,
          name,
          email,
          role
        ),
        food_donations (
          id,
          title,
          quantity,
          food_type,
          pickup_address,
          status
        )
      `)
      .order("requested_at", { ascending: false })

    if (error) {
      console.error("FOOD REQUESTS GET ERROR:", error)

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
      requests: data,
    })
  } catch (error) {
    console.error("REQUESTS GET API ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch food requests",
      },
      { status: 500 }
    )
  }
}