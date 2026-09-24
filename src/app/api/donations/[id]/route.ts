import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
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