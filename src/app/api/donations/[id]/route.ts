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
