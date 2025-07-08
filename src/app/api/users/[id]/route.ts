import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Get a user profile by ID
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        createdAt: true,
        updatedAt: true,
        // Don't include password or notifications for basic profile
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
