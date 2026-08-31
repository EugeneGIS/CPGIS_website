import { NextResponse } from "next/server";
import { searchAddresses } from "@/lib/geocode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing q query parameter." },
      { status: 400 },
    );
  }

  try {
    const results = await searchAddresses(q);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Address lookup failed. Check your geocoder settings." },
      { status: 500 },
    );
  }
}
