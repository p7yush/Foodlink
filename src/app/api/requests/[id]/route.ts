import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { data, error } = await supabase
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