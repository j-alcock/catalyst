import { Decimal } from "@prisma/client/runtime/library";

/**
 * Simple utility to serialize Prisma objects with Decimal and Date fields
 * Converts Decimal instances to strings and Date-like objects to ISO strings
 */
export function serializePrismaObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Decimal) {
    return obj.toString() as T;
  }

  // Handle Date and Date-like objects (with toISOString)
  if (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as any).toISOString === "function"
  ) {
    return (obj as any).toISOString() as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializePrismaObject) as T;
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializePrismaObject(value);
    }
    return serialized as T;
  }

  return obj;
}

/**
 * Convert a string or number to Decimal for database operations
 */
export function toDecimal(value: string | number): Decimal {
  return new Decimal(value);
}
