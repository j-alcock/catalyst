import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a new user
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, picture } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: name, email" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: password || null,
        picture: picture || "",
      },
    });

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (_error: any) {
    if (_error.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
