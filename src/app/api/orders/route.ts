import { serializePrismaObject, toDecimal } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import { CreateOrderRequestSchema, OrdersQuerySchema } from "@/lib/schemas/zod-schemas";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

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

  // Validate query parameters
  const queryData: any = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== null) queryData[key] = value;
  }

  // Validate query parameters FIRST
  let queryValidation;
  try {
    queryValidation = OrdersQuerySchema.parse(queryData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  // Only call Prisma if all validation passes
  try {
    const { userId, status } = queryValidation;
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    const orders = await (prisma as any).order.findMany({
      where,
      include: {
        user: true,
        salesperson: true,
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Serialize Decimal fields to strings
    const serializedOrders = serializePrismaObject(orders);

    return NextResponse.json(serializedOrders);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
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

  // Validate input with Zod
  const validationResult = CreateOrderRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Missing or invalid required fields" },
      { status: 400 }
    );
  }

  try {
    const { userId, orderItems } = validationResult.data;
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        totalAmount: toDecimal(totalAmount),
        orderItems: {
          create: orderItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: toDecimal(item.priceAtTime || 0), // Will be set to actual product price
          })),
        },
      },
      include: {
        user: true,
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
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

    // Serialize Decimal fields to strings
    const serializedOrder = serializePrismaObject(order);

    return NextResponse.json(serializedOrder, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Unique constraint violation" }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
