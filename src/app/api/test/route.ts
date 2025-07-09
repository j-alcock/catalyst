import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("Test endpoint called");

  try {
    const body = await req.json();
    console.log("JSON parsed successfully:", body);
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.log("JSON parsing failed:", error);
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }
}
