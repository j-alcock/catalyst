import { serializePrismaObject } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order by ID with items
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: { include: { product: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    // Serialize Decimal fields to strings
    const serializedOrder = serializePrismaObject(order);
    return NextResponse.json(serializedOrder);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
