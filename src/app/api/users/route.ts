import { zPostApiUsersData } from "@/lib/heyapi/zod.gen";
import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a new user
 */
export async function POST(req: NextRequest) {
  // Parse JSON first
  let body;
  try {
    body = await req.json();
  } catch (_jsonError) {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  // Validate input with Zod FIRST
  let validationResult;
  try {
    validationResult = zPostApiUsersData.shape.body.parse(body);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Missing or invalid required fields", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  // Only call Prisma if all validation passes
  try {
    const { name, email, password, picture } = validationResult;
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: password || "",
        picture: picture || "",
      },
    });
    return NextResponse.json(user);
  } catch (_error: any) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
