import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/utils";

export async function POST(request: Request) {
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

    const body = await request.json();

    const {
      title,
      description,
      quantity,
      food_type,
      expiry_time,
      latitude,
      longitude,
      pickup_address,
    } = body;
    
    const donor_id = user.id;

    let finalLat = latitude;
    let finalLng = longitude;
    
    if (pickup_address && (!finalLat || !finalLng)) {
      const coords = await geocodeAddress(pickup_address);
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
      }
    }

    if (!title || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Food title and quantity are required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("food_donations")
      .insert([
        {
          title,
          description,
          quantity,
          food_type,
          expiry_time,
          latitude: finalLat,
          longitude: finalLng,
          pickup_address,
          donor_id,
        },
      ])
      .select()
      .single();

    if (error) {
  console.error("SUPABASE DONATION ERROR:", error);

  return NextResponse.json(
    {
      success: false,
      error: error.message,
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      success: true,
      message: "Food donation created successfully!",
      donation: data,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      { status: 400 }
    );
  }
}







export async function GET() {
  const { data, error } = await supabase
    .from("food_donations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    donations: data,
  });
}