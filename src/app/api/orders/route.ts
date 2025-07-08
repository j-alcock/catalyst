import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: List all orders (optionally filter by user)
 *   post:
 *     summary: Create a new order
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  try {
    const where = userId ? { userId } : {};
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        orderItems: {
          include: {
            product: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, orderItems } = body;

    if (!userId || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // Calculate total amount and validate products exist
    let totalAmount = 0;
    for (const item of orderItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        );
      }
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for product ${product.name}` },
          { status: 400 }
        );
      }
      totalAmount += Number(product.price) * item.quantity;
    }

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        orderItems: {
          create: orderItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: item.priceAtTime || 0, // Will be set to actual product price
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update product stock quantities
    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
