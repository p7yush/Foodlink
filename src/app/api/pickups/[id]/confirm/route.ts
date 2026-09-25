import { supabase, createAuthedClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace(/^Bearer\s+/i, "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { stage } = await request.json()
    if (stage !== "donor_pickup" && stage !== "ngo_receipt") {
      return NextResponse.json({ success: false, error: "Unknown confirmation step" }, { status: 400 })
    }

    const { data, error } = await createAuthedClient(token).rpc("confirm_order_handoff", {
      p_pickup_id: id,
      p_stage: stage,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    return NextResponse.json({ success: true, pickup: data })
  } catch (error) {
    console.error("CONFIRM HANDOFF API ERROR:", error)
    return NextResponse.json({ success: false, error: "Could not confirm this handoff." }, { status: 400 })
  }
}
