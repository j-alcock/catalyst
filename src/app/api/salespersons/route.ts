import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod schemas for validation
const CreateSalespersonSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  commission: z.number().min(0).max(1).default(0.05), // 0-100% as decimal
  isActive: z.boolean().default(true),
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

const SalespersonsResponseSchema = z.object({
  data: z.array(SalespersonSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

// GET /api/salespersons - List all salespersons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {};

    if (active !== null) {
      where.isActive = active === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await (prisma as any).salesperson.count({ where });

    // Get salespersons with pagination
    const salespersons = await (prisma as any).salesperson.findMany({
      where,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Transform dates to strings for JSON serialization
    const transformedSalespersons = salespersons.map((sp: any) => ({
      ...sp,
      createdAt: sp.createdAt.toISOString(),
      updatedAt: sp.updatedAt.toISOString(),
      commission: Number(sp.commission),
    }));

    const response = {
      data: transformedSalespersons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Validate response against schema
    SalespersonsResponseSchema.parse(response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching salespersons:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/salespersons - Create a new salesperson
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = CreateSalespersonSchema.parse(body);

    // Check if email already exists
    const existingSalesperson = await (prisma as any).salesperson.findUnique({
      where: { email: validatedData.email },
    });

    if (existingSalesperson) {
      return NextResponse.json(
        { error: "Salesperson with this email already exists" },
        { status: 409 }
      );
    }

    // Create salesperson
    const salesperson = await (prisma as any).salesperson.create({
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

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating salesperson:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
