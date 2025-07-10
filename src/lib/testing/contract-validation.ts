import { z } from "zod";
import type { RequestOptions } from "../heyapi/client/types";

// Schema mapping for endpoints
export interface EndpointSchemaMap {
  [endpoint: string]: {
    request?: {
      GET?: z.ZodSchema<any>;
      POST?: z.ZodSchema<any>;
      PUT?: z.ZodSchema<any>;
      DELETE?: z.ZodSchema<any>;
      PATCH?: z.ZodSchema<any>;
    };
    response?: {
      GET?: z.ZodSchema<any>;
      POST?: z.ZodSchema<any>;
      PUT?: z.ZodSchema<any>;
      DELETE?: z.ZodSchema<any>;
      PATCH?: z.ZodSchema<any>;
    };
  };
}

// Import generated schemas
import {
  zCategory,
  zOrder,
  zOrderItem,
  zOrderStatus,
  zProduct,
  zUser,
} from "../heyapi/zod.gen";

// Create schemas object for compatibility
const schemas = {
  User: zUser,
  Product: zProduct,
  Category: zCategory,
  Order: zOrder,
  OrderItem: zOrderItem,
  OrderStatus: zOrderStatus,
};

// Define endpoint to schema mapping using generated schemas
export const ENDPOINT_SCHEMAS: EndpointSchemaMap = {
  // Products
  "/api/products": {
    request: {
      GET: undefined, // No request body for GET
      POST: z
        .object({
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.number().positive(),
          stockQuantity: z.number().int().min(0),
          categoryId: z.string().uuid(),
        })
        .strict(),
    },
    response: {
      GET: z.array(schemas.Product),
      POST: schemas.Product,
    },
  },
  "/api/products/{id}": {
    request: {
      GET: undefined,
      PUT: z
        .object({
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.number().positive(),
          stockQuantity: z.number().int().min(0),
          categoryId: z.string().uuid(),
        })
        .strict(),
      DELETE: undefined,
    },
    response: {
      GET: schemas.Product,
      PUT: schemas.Product,
      DELETE: z.object({ message: z.string() }),
    },
  },

  // Categories
  "/api/categories": {
    request: {
      GET: undefined,
      POST: z
        .object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
        .strict(),
    },
    response: {
      GET: z.array(schemas.Category),
      POST: schemas.Category,
    },
  },
  "/api/categories/{id}": {
    request: {
      GET: undefined,
    },
    response: {
      GET: schemas.Category,
    },
  },

  // Users
  "/api/users": {
    request: {
      POST: z
        .object({
          name: z.string().min(1),
          email: z.string().email(),
          password: z.string().optional(),
          picture: z.string().url(),
        })
        .strict(),
    },
    response: {
      POST: schemas.User,
    },
  },
  "/api/users/{id}": {
    request: {
      GET: undefined,
    },
    response: {
      GET: schemas.User,
    },
  },

  // Orders
  "/api/orders": {
    request: {
      GET: undefined,
      POST: z
        .object({
          userId: z.string().uuid(),
          status: schemas.OrderStatus,
          totalAmount: z.number().positive(),
        })
        .strict(),
    },
    response: {
      GET: z.array(schemas.Order),
      POST: schemas.Order,
    },
  },
  "/api/orders/{id}": {
    request: {
      GET: undefined,
    },
    response: {
      GET: schemas.Order,
    },
  },
  "/api/orders/{id}/status": {
    request: {
      PUT: z.object({ status: schemas.OrderStatus }).strict(),
    },
    response: {
      PUT: schemas.Order,
    },
  },
};

/**
 * Context-aware validation error handler
 */
function handleValidationError(
  error: z.ZodError,
  context: "request" | "response",
  endpoint: string,
  method: string
): void {
  const isCI = process.env.CI === "true" || process.env.NODE_ENV === "test";
  const errorMessage = `[${context.toUpperCase()} CONTRACT VIOLATION] ${method} ${endpoint}: ${error.message}`;

  if (isCI) {
    throw new Error(errorMessage);
  } else {
    console.error(errorMessage);
    console.error("Validation details:", error.errors);
  }
}

/**
 * Get schema for a specific endpoint and method
 */
function getSchema(
  schemas: EndpointSchemaMap[string],
  method: string,
  type: "request" | "response"
): z.ZodSchema<any> | undefined {
  if (!schemas) return undefined;

  const methodSchemas = schemas[type as keyof typeof schemas];
  if (!methodSchemas || typeof methodSchemas !== "object") return undefined;

  return methodSchemas[method as keyof typeof methodSchemas];
}

/**
 * Match endpoint pattern (e.g., "/api/products/{id}" matches "/api/products/123")
 */
function matchEndpoint(endpoint: string): string | null {
  // Direct match
  if (ENDPOINT_SCHEMAS[endpoint]) {
    return endpoint;
  }

  // Pattern match for parameterized endpoints
  for (const pattern of Object.keys(ENDPOINT_SCHEMAS)) {
    if (pattern.includes("{id}")) {
      const regex = new RegExp(pattern.replace("{id}", "[^/]+"));
      if (regex.test(endpoint)) {
        return pattern;
      }
    }
  }

  return null;
}

/**
 * Create a contract-aware fetch function
 */
export function createContractFetch(): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // Find matching endpoint pattern
    const matchedEndpoint = matchEndpoint(pathname);
    if (!matchedEndpoint) {
      console.warn(`[CONTRACT] No schema found for endpoint: ${method} ${pathname}`);
      return fetch(request);
    }

    const endpointSchemas = ENDPOINT_SCHEMAS[matchedEndpoint];
    if (!endpointSchemas) {
      return fetch(request);
    }

    // Validate request if schema exists
    const requestSchema = getSchema(endpointSchemas, method, "request");
    if (requestSchema && method !== "GET") {
      try {
        const body = await request.clone().json();
        requestSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          handleValidationError(error, "request", pathname, method);
        }
      }
    }

    // Make the actual request
    const response = await fetch(request);

    // Validate response if schema exists
    const responseSchema = getSchema(endpointSchemas, method, "response");
    if (responseSchema && response.ok) {
      try {
        const responseData = await response.clone().json();
        responseSchema.parse(responseData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          handleValidationError(error, "response", pathname, method);
        }
      }
    }

    return response;
  };
}

/**
 * Contract validation utilities for HeyAPI client
 */
export const contractValidation = {
  /**
   * Validate request data against endpoint schema
   */
  validateRequest: (endpoint: string, method: string, data: any): boolean => {
    const matchedEndpoint = matchEndpoint(endpoint);
    if (!matchedEndpoint) return true;

    const endpointSchemas = ENDPOINT_SCHEMAS[matchedEndpoint];
    if (!endpointSchemas) return true;

    const requestSchema = getSchema(endpointSchemas, method, "request");
    if (!requestSchema) return true;

    try {
      requestSchema.parse(data);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, "request", endpoint, method);
      }
      return false;
    }
  },

  /**
   * Validate response data against endpoint schema
   */
  validateResponse: (endpoint: string, method: string, data: any): boolean => {
    const matchedEndpoint = matchEndpoint(endpoint);
    if (!matchedEndpoint) return true;

    const endpointSchemas = ENDPOINT_SCHEMAS[matchedEndpoint];
    if (!endpointSchemas) return true;

    const responseSchema = getSchema(endpointSchemas, method, "response");
    if (!responseSchema) return true;

    try {
      responseSchema.parse(data);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, "response", endpoint, method);
      }
      return false;
    }
  },

  /**
   * Get available endpoints
   */
  getEndpoints: (): string[] => {
    return Object.keys(ENDPOINT_SCHEMAS);
  },

  /**
   * Check if endpoint has schema
   */
  hasSchema: (endpoint: string): boolean => {
    return matchEndpoint(endpoint) !== null;
  },
};
