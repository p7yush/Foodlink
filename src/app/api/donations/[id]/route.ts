import { supabase, createAuthedClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
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

    const { id } = await params;

    const { data, error } = await createAuthedClient(token)
      .from("food_donations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("SUPABASE DONATION DETAILS ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      donation: data,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid donation ID",
      },
      { status: 400 }
    );
  }
}

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

    // Only allow cancelling to 'Cancelled' status for now
    if (status !== "Cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "Only cancellation to 'Cancelled' status is allowed",
        },
        { status: 400 }
      )
    }

    const db = createAuthedClient(token)

    // Verify ownership and current status
    const { data: donation, error: donationError } = await db
      .from("food_donations")
      .select("id, status, donor_id")
      .eq("id", id)
      .single()

    if (donationError || !donation) {
      return NextResponse.json({ success: false, error: "Donation not found" }, { status: 404 })
    }

    if (donation.donor_id !== user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized to update this donation" }, { status: 403 })
    }

    // Only allow cancellation if donation is still available
    if (donation.status !== "Available") {
      return NextResponse.json(
        {
          success: false,
          error: "Only available donations can be cancelled",
        },
        { status: 400 }
      )
    }

    const { data: updatedDonation, error: updateError } = await db
      .from("food_donations")
      .update({ status: "Cancelled" })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("UPDATE DONATION ERROR:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Donation cancelled successfully!",
      donation: updatedDonation,
    })
  } catch (error) {
    console.error("DONATION UPDATE API ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      { status: 400 }
    )
  }
}