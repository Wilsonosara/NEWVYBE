
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Supabase environment variables are missing.",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/health`,
      {
        method: "GET",
        headers: {
          apikey: publishableKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase responded, but its Auth health check failed.",
          status: response.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "VYBE successfully connected to Supabase.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Could not reach Supabase. Check your connection.",
      },
      { status: 502 }
    );
  }
}
