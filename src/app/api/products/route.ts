import { serializePrismaObject, toDecimal } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import {
  CreateProductRequestSchema,
  PaginationQuerySchema,
  ProductsQuerySchema,
} from "@/lib/schemas/zod-schemas";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List all products with pagination
 *   post:
 *     summary: Create a new product
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Validate query parameters
  const queryData: any = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== null) queryData[key] = value;
  }

  const queryValidation =
    PaginationQuerySchema.merge(ProductsQuerySchema).safeParse(queryData);
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: queryValidation.error.errors },
      { status: 400 }
    );
  }

  const { page, pageSize, ..._filterParams } = queryValidation.data;
  const skip = (page - 1) * pageSize;

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: pageSize,
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count(),
    ]);

    // Serialize Decimal fields to strings
    const serializedProducts = serializePrismaObject(products);

    return NextResponse.json({
      data: serializedProducts,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// Remove the local schema since we're importing it

export async function POST(req: NextRequest) {
  // Parse JSON first
  let body;
  try {
    body = await req.json();
  } catch (_jsonError) {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  // Debug: Log the schema and body
  console.log("Schema:", CreateProductRequestSchema);
  console.log("Body:", JSON.stringify(body, null, 2));

  // Validate input with Zod FIRST
  let validationResult;
  try {
    validationResult = CreateProductRequestSchema.parse(body);
    console.log("Validation PASSED:", validationResult);
  } catch (error: any) {
    console.log("Validation FAILED:", error);
    if (error instanceof z.ZodError) {
      console.log("Returning 400 for ZodError");
      return NextResponse.json(
        { error: "Missing or invalid required fields", details: error.errors },
        { status: 400 }
      );
    }
    console.log("Returning 400 for validation failed");
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  // Only call Prisma if all validation passes
  try {
    const { name, description, price, stockQuantity, categoryId } = validationResult;
    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    const product = await prisma.product.create({
      data: {
        name,
        description: description || "",
        price,
        stockQuantity,
        categoryId,
      },
      include: { category: true },
    });
    return NextResponse.json(product);
  } catch (_error: any) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
