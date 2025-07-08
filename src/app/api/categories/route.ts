import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: List all categories
 *   post:
 *     summary: Create a new category
 */
export async function GET(_req: NextRequest) {
  try {
    const categories = await prisma.category.findMany();
    return NextResponse.json(categories);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }
    const category = await prisma.category.create({
      data: { name, description },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
