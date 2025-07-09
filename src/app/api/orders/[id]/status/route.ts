import { serializePrismaObject } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import { UpdateOrderStatusRequestSchema } from "@/lib/schemas/zod-schemas";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

// UUID validation schema
const UUIDSchema = z.string().uuid();

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

  // Validate input with Zod FIRST
  let validationResult;
  try {
    validationResult = UpdateOrderStatusRequestSchema.parse(body);
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
    const { status } = validationResult;
    const updated = await prisma.order.update({ where: { id }, data: { status } });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Unique constraint violation" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/orders/{id}/status:
 *   get:
 *     summary: Get order status by ID
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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
