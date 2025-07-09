import { z } from "zod";

// Zod schemas for all API types
export const schemas = {
  // User schemas
  User: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    email: z.string().email(),
    picture: z.string().url().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Category schemas
  Category: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Product schemas
  Product: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    description: z.string().nullable(),
    price: z.string().regex(/^\d+\.\d{2}$/),
    stockQuantity: z.number().int().min(0),
    categoryId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  ProductWithCategory: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    description: z.string().nullable(),
    price: z.string().regex(/^\d+\.\d{2}$/),
    stockQuantity: z.number().int().min(0),
    categoryId: z.string().uuid(),
    category: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255),
      description: z.string().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Order schemas
  OrderStatus: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),

  Order: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
    totalAmount: z.string().regex(/^\d+\.\d{2}$/),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  OrderItem: z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    priceAtTime: z.string().regex(/^\d+\.\d{2}$/),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  OrderItemWithProduct: z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    priceAtTime: z.string().regex(/^\d+\.\d{2}$/),
    product: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255),
      description: z.string().nullable(),
      price: z.string().regex(/^\d+\.\d{2}$/),
      stockQuantity: z.number().int().min(0),
      categoryId: z.string().uuid(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  OrderWithItems: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
    totalAmount: z.string().regex(/^\d+\.\d{2}$/),
    user: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255),
      email: z.string().email(),
      picture: z.string().url().optional(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
    orderItems: z
      .array(
        z.object({
          id: z.string().uuid(),
          orderId: z.string().uuid(),
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
          priceAtTime: z.string().regex(/^\d+\.\d{2}$/),
          product: z.object({
            id: z.string().uuid(),
            name: z.string().min(1).max(255),
            description: z.string().nullable(),
            price: z.string().regex(/^\d+\.\d{2}$/),
            stockQuantity: z.number().int().min(0),
            categoryId: z.string().uuid(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
          createdAt: z.string().datetime(),
          updatedAt: z.string().datetime(),
        })
      )
      .min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Pagination schemas
  PaginatedProductsResponse: z.object({
    data: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255),
        description: z.string().nullable(),
        price: z.string().regex(/^\d+\.\d{2}$/),
        stockQuantity: z.number().int().min(0),
        categoryId: z.string().uuid(),
        category: z.object({
          id: z.string().uuid(),
          name: z.string().min(1).max(255),
          description: z.string().nullable(),
          createdAt: z.string().datetime(),
          updatedAt: z.string().datetime(),
        }),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
    ),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),

  // Error schemas
  ErrorResponse: z.object({
    error: z.string().min(1),
    message: z.string().optional(),
    code: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),

  // Request schemas
  CreateUserRequest: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    password: z.string().min(8),
  }),

  CreateCategoryRequest: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
  }),

  CreateProductRequest: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    price: z.number().positive().max(999999.99),
    stockQuantity: z.number().int().min(0),
    categoryId: z.string().uuid(),
  }),

  CreateOrderRequest: z.object({
    userId: z.string().uuid(),
    orderItems: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1),
  }),

  UpdateOrderStatusRequest: z.object({
    status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  }),
};

// Type-safe validator function
export const validate = <T extends keyof typeof schemas>(
  schema: T,
  data: unknown
): z.infer<(typeof schemas)[T]> => {
  return schemas[schema].parse(data);
};

// Safe validation function that returns result instead of throwing
export const validateSafe = <T extends keyof typeof schemas>(
  schema: T,
  data: unknown
):
  | { success: true; data: z.infer<(typeof schemas)[T]> }
  | { success: false; error: z.ZodError } => {
  const result = schemas[schema].safeParse(data);
  return result;
};

// Validator configuration for HeyAPI
export const validators = {
  // Products endpoints
  "GET /api/products": {
    response: schemas.PaginatedProductsResponse,
  },
  "POST /api/products": {
    request: schemas.CreateProductRequest,
    response: schemas.ProductWithCategory,
  },
  "GET /api/products/{id}": {
    response: schemas.ProductWithCategory,
  },
  "PUT /api/products/{id}": {
    response: schemas.ProductWithCategory,
  },

  // Categories endpoints
  "GET /api/categories": {
    response: z.array(schemas.Category),
  },
  "POST /api/categories": {
    request: schemas.CreateCategoryRequest,
    response: schemas.Category,
  },
  "GET /api/categories/{id}": {
    response: schemas.Category,
  },

  // Orders endpoints
  "GET /api/orders": {
    response: z.array(schemas.OrderWithItems),
  },
  "POST /api/orders": {
    request: schemas.CreateOrderRequest,
    response: schemas.OrderWithItems,
  },
  "GET /api/orders/{id}": {
    response: schemas.OrderWithItems,
  },
  "PUT /api/orders/{id}/status": {
    request: schemas.UpdateOrderStatusRequest,
    response: schemas.OrderWithItems,
  },

  // Users endpoints
  "POST /api/users": {
    request: schemas.CreateUserRequest,
    response: schemas.User,
  },
  "GET /api/users/{id}": {
    response: schemas.User,
  },

  // Error responses
  "4XX": {
    response: schemas.ErrorResponse,
  },
  "5XX": {
    response: schemas.ErrorResponse,
  },
} as const;

// Type for endpoint keys
export type EndpointKey = keyof typeof validators;

// Helper function to get validator for an endpoint
export const getValidator = (endpoint: EndpointKey) => {
  return validators[endpoint];
};

// Helper function to validate request/response for an endpoint
export const validateEndpoint = (
  endpoint: EndpointKey,
  type: "request" | "response",
  data: unknown
) => {
  const validator = validators[endpoint];
  if (!validator) {
    throw new Error(`No validator found for endpoint: ${endpoint}`);
  }

  if (type === "request" && !("request" in validator)) {
    throw new Error(`No request validator found for endpoint: ${endpoint}`);
  }

  if (type === "response" && !("response" in validator)) {
    throw new Error(`No response validator found for endpoint: ${endpoint}`);
  }

  return validator[type as keyof typeof validator].parse(data);
};
