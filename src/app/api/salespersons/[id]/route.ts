import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod schemas for validation
const UpdateSalespersonSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  commission: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
});

const SalespersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  commission: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z
    .object({
      orders: z.number(),
    })
    .optional(),
});

// GET /api/salespersons/[id] - Get a single salesperson
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const salesperson = await (prisma as any).salesperson.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!salesperson) {
      return NextResponse.json({ error: "Salesperson not found" }, { status: 404 });
    }

    // Transform response
    const response = {
      ...salesperson,
      createdAt: salesperson.createdAt.toISOString(),
      updatedAt: salesperson.updatedAt.toISOString(),
      commission: Number(salesperson.commission),
    };

    // Validate response against schema
    SalespersonSchema.parse(response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching salesperson:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/salespersons/[id] - Update a salesperson
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate request body
    const validatedData = UpdateSalespersonSchema.parse(body);

    // Check if salesperson exists
    const existingSalesperson = await (prisma as any).salesperson.findUnique({
      where: { id },
    });

    if (!existingSalesperson) {
      return NextResponse.json({ error: "Salesperson not found" }, { status: 404 });
    }

    // Check if email is being updated and if it already exists
    if (validatedData.email && validatedData.email !== existingSalesperson.email) {
      const emailExists = await (prisma as any).salesperson.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Salesperson with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Update salesperson
    const salesperson = await (prisma as any).salesperson.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    // Transform response
    const response = {
      ...salesperson,
      createdAt: salesperson.createdAt.toISOString(),
      updatedAt: salesperson.updatedAt.toISOString(),
      commission: Number(salesperson.commission),
    };

    // Validate response against schema
    SalespersonSchema.parse(response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating salesperson:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/salespersons/[id] - Soft delete a salesperson
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if salesperson exists
    const existingSalesperson = await (prisma as any).salesperson.findUnique({
      where: { id },
    });

    if (!existingSalesperson) {
      return NextResponse.json({ error: "Salesperson not found" }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await (prisma as any).salesperson.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(
      { message: "Salesperson deactivated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting salesperson:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
