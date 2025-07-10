import fs from "fs";
import path from "path";
import { serializePrismaObject } from "@/lib/prisma-utils";
import prisma from "@/lib/prisma/prisma";
import yaml from "js-yaml";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Read allowed status values from OpenAPI spec
 */
function getAllowedStatusValues(): string[] {
  try {
    const specPath = path.join(process.cwd(), "src/lib/openapi/api-spec.yaml");
    const specContent = fs.readFileSync(specPath, "utf8");
    const spec = yaml.load(specContent) as any;

    const orderStatusSchema = spec.components?.schemas?.OrderStatus;
    if (orderStatusSchema?.enum) {
      return orderStatusSchema.enum;
    }

    // Fallback to default values if spec cannot be read
    return ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  } catch (error) {
    console.warn("Failed to read OpenAPI spec for status validation:", error);
    // Fallback to default values
    return ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  }
}

// Zod schema for updating orders
const UpdateOrderSchema = z.object({
  status: z
    .enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .optional(),
  totalAmount: z.number().positive().optional(),
  salespersonId: z.string().optional().nullable(),
});

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order by ID with items
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Validate status query parameter if present
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    if (status) {
      const allowedStatuses = getAllowedStatusValues();
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: "Invalid status value",
            details: {
              allowed: allowedStatuses,
              received: status,
            },
          },
          { status: 400 }
        );
      }
    }

    const order = await (prisma as any).order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        salesperson: { select: { id: true, name: true, email: true } },
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

/**
 * @openapi
 * /api/orders/{id}:
 *   put:
 *     summary: Update an order by ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();

    // Validate request body
    const validatedData = UpdateOrderSchema.parse(body);

    // Check if order exists
    const existingOrder = await (prisma as any).order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If salespersonId is provided, validate it exists
    if (validatedData.salespersonId) {
      const salesperson = await (prisma as any).salesperson.findUnique({
        where: { id: validatedData.salespersonId },
      });

      if (!salesperson) {
        return NextResponse.json({ error: "Salesperson not found" }, { status: 404 });
      }

      if (!salesperson.isActive) {
        return NextResponse.json(
          { error: "Cannot assign inactive salesperson to order" },
          { status: 400 }
        );
      }
    }

    // Update order
    const updatedOrder = await (prisma as any).order.update({
      where: { id },
      data: validatedData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        salesperson: { select: { id: true, name: true, email: true } },
        orderItems: { include: { product: true } },
      },
    });

    // Serialize Decimal fields to strings
    const serializedOrder = serializePrismaObject(updatedOrder);
    return NextResponse.json(serializedOrder);
  } catch (error) {
    console.error("Error updating order:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
