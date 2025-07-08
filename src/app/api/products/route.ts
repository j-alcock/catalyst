import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
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
    return NextResponse.json({
      data: products,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price, stockQuantity, categoryId } = body;
    if (
      !name ||
      typeof price !== "number" ||
      typeof stockQuantity !== "number" ||
      !categoryId
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }
    const product = await prisma.product.create({
      data: {
        name,
        description: description || "",
        price,
        stockQuantity,
        categoryId,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
