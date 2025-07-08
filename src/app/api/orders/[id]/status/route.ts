import { serializePrismaObject } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @openapi
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status by ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { status } = body;
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: { include: { product: true } },
      },
    });
    // Serialize Decimal fields to strings
    const serializedOrder = serializePrismaObject(order);
    return NextResponse.json(serializedOrder);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
