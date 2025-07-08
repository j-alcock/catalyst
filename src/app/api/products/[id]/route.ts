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
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, description, price, stockQuantity, categoryId } = body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = price;
    if (stockQuantity !== undefined) data.stockQuantity = stockQuantity;
    if (categoryId !== undefined) data.categoryId = categoryId;
    const updated = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (_error: any) {
    if (_error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
