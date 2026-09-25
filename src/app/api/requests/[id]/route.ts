import { supabase, createAuthedClient } from "@/lib/supabase"
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { status } = body

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: "Status is required",
        },
        { status: 400 }
      )
    }

    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Status must be accepted or rejected",
        },
        { status: 400 }
      )
    }
    
    // Verify user owns the donation
    const { data: requestInfo } = await supabase
      .from("food_requests")
      .select("*, food_donations(donor_id)")
      .eq("id", id)
      .single()
      
    if (!requestInfo || requestInfo.food_donations?.donor_id !== user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized to update this request" }, { status: 403 })
    }

    const db = createAuthedClient(token)

    const { data, error } = await db
      .from("food_requests")
      .update({
        status,
      })
      .eq("id", id)
      .select()
      .single()
      
    if (error) {
      console.error("UPDATE REQUEST ERROR:", error)

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }
    
    if (status === "accepted" && requestInfo.food_id) {
      await db
        .from("food_donations")
        .update({ status: "Claimed" })
        .eq("id", requestInfo.food_id)
    }

    return NextResponse.json({
      success: true,
      message: `Food request ${status} successfully!`,
      request: data,
    })
  } catch (error) {
    console.error("REQUEST UPDATE API ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      { status: 400 }
    )
  }
}