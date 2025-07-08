import { serializePrismaObject, toDecimal } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

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
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, description, price, stockQuantity, categoryId } = body;
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: price ? toDecimal(price) : undefined,
        stockQuantity,
        categoryId,
      },
      include: { category: true },
    });
    // Serialize Decimal fields to strings
    const serializedProduct = serializePrismaObject(product);
    return NextResponse.json(serializedProduct);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
