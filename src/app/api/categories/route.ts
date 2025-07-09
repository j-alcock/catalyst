import prisma from "@/lib/prisma/prisma";
import {
  CategoriesQuerySchema,
  CreateCategoryRequestSchema,
} from "@/lib/schemas/zod-schemas";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: List all categories
 *   post:
 *     summary: Create a new category
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Validate query parameters
  const queryData: any = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== null) queryData[key] = value;
  }

  const queryValidation = CategoriesQuerySchema.safeParse(queryData);
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: queryValidation.error.errors },
      { status: 400 }
    );
  }

  try {
    const { search } = queryValidation.data;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const categories = await prisma.category.findMany({ where });
    return NextResponse.json(categories);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Parse JSON first - this must be isolated to catch malformed JSON
  let body;
  try {
    body = await req.json();
  } catch (_jsonError) {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  try {
    // Validate input with Zod
    const validationResult = CreateCategoryRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, description } = validationResult.data;

    const category = await prisma.category.create({
      data: { name, description },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
