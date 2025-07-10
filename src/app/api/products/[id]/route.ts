import { zPutApiProductsByIdData } from "@/lib/heyapi/zod.gen";
import { serializePrismaObject, toDecimal } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

// UUID validation schema
const UUIDSchema = z.string().uuid();

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *   put:
 *     summary: Update a product by ID
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const uuidValidation = UUIDSchema.safeParse(id);
  if (!uuidValidation.success) {
    return NextResponse.json({ error: "Invalid UUID format" }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    // Serialize Decimal fields to strings
    const serializedProduct = serializePrismaObject(product);
    return NextResponse.json(serializedProduct);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate path param as UUID
  try {
    z.string().uuid().parse(id);
  } catch (_e) {
    return NextResponse.json(
      { error: "Invalid UUID in path parameter" },
      { status: 400 }
    );
  }

  // Parse JSON
  let body;
  try {
    body = await req.json();
  } catch (_jsonError) {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  // Validate input with Zod FIRST using generated schema
  let updateData;
  try {
    updateData = zPutApiProductsByIdData.shape.body.parse(body);
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
    const { name, description, price, stockQuantity, categoryId } = updateData;
    // Validate category exists if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }
    // Build update data object with only provided fields
    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (price !== undefined) dataToUpdate.price = price;
    if (stockQuantity !== undefined) dataToUpdate.stockQuantity = stockQuantity;
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId;
    const updated = await prisma.product.update({ where: { id }, data: dataToUpdate });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
