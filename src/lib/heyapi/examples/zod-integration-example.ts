/**
 * Example demonstrating Zod integration with HeyAPI
 *
 * This example shows how the Zod plugin automatically provides:
 * - Request validation (validates data before sending)
 * - Response validation (validates data after receiving)
 * - Type safety with runtime validation
 * - Automatic error handling for validation failures
 */

import { z } from "zod";
import * as api from "../sdk.gen";

// Example 1: Basic API call with automatic validation
export async function createProductExample() {
  try {
    // This will automatically validate the request body using zPostApiProductsData
    const response = await api.postApiProducts({
      body: {
        name: "Sample Product",
        description: "A sample product for testing",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174000",
      },
    });

    // The response is automatically validated using zPostApiProductsResponse
    console.log("Product created:", response.data);

    // TypeScript knows the exact type of response.data
    // It's validated to match the zProduct schema
    return response.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    } else {
      console.error("API error:", error);
    }
    throw error;
  }
}

// Example 2: GET request with query parameters validation
export async function getProductsWithPagination() {
  try {
    // Query parameters are automatically validated using zGetApiProductsData
    const response = await api.getApiProducts({
      query: {
        page: 1,
        pageSize: 10, // Must be between 1-100 as defined in the schema
      },
    });

    // Response is validated to match zGetApiProductsResponse
    console.log("Products:", response.data);
    console.log("Pagination:", {
      page: response.data?.page,
      totalPages: response.data?.totalPages,
    });

    return response.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    } else {
      console.error("API error:", error);
    }
    throw error;
  }
}

// Example 3: Path parameter validation
export async function getProductById(productId: string) {
  try {
    // Path parameter is validated using zGetApiProductsByIdData
    const response = await api.getApiProductsById({
      path: {
        id: productId, // Must be a valid UUID
      },
    });

    // Response is validated to match zProduct schema
    console.log("Product:", response.data);
    return response.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    } else {
      console.error("API error:", error);
    }
    throw error;
  }
}

// Example 4: Complex validation with nested objects
export async function createOrderExample() {
  try {
    // Request body is validated using zPostApiOrdersData
    // This includes validation of nested orderItems array
    const response = await api.postApiOrders({
      body: {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        orderItems: [
          {
            productId: "123e4567-e89b-12d3-a456-426614174001",
            quantity: 2, // Must be >= 1
          },
          {
            productId: "123e4567-e89b-12d3-a456-426614174002",
            quantity: 1,
          },
        ], // Array must have at least 1 item
      },
    });

    // Response is validated to match zOrder schema
    console.log("Order created:", response.data);
    return response.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
    } else {
      console.error("API error:", error);
    }
    throw error;
  }
}

// Example 5: Error handling with validation
export async function handleValidationErrors() {
  try {
    // This will fail validation because price is negative
    await api.postApiProducts({
      body: {
        name: "Invalid Product",
        price: -10, // Validation error: must be >= 0
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174000",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("Validation failed:");
      error.errors.forEach((err) => {
        console.log(`- ${err.path.join(".")}: ${err.message}`);
      });
    }
  }
}

// Example 6: Using the generated Zod schemas directly
export function validateDataManually() {
  // You can also use the generated schemas directly
  const {
    zUser: _zUser,
    zProduct: _zProduct,
    zOrderStatus: _zOrderStatus,
  } = require("../zod.gen");

  // Validate user data
  const userData = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "John Doe",
    email: "john@example.com",
    picture: "https://example.com/avatar.jpg",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  try {
    const validatedUser = _zUser.parse(userData);
    console.log("Valid user:", validatedUser);
  } catch (error) {
    console.error("Invalid user data:", error);
  }

  // Validate order status
  try {
    const status = _zOrderStatus.parse("PENDING");
    console.log("Valid status:", status);
  } catch (error) {
    console.error("Invalid status:", error);
  }
}

// Example 7: Custom client with validation
export function createCustomClientWithValidation() {
  const { createClient } = require("../client");

  // Create a custom client that always validates
  const customClient = createClient({
    baseUrl: "http://localhost:3000",
    // You can add global validation options here
  });

  // Use the custom client with any API function
  return api.getApiProducts({
    client: customClient,
    query: { page: 1, pageSize: 5 },
  });
}

// Example 8: Batch operations with validation
export async function batchOperations() {
  const results = [];

  // Each operation is individually validated
  const operations = [
    api.getApiProducts({ query: { page: 1, pageSize: 5 } }),
    api.getApiCategories(),
    api.getApiOrders({ query: { userId: "123e4567-e89b-12d3-a456-426614174000" } }),
  ];

  for (const operation of operations) {
    try {
      const result = await operation;
      results.push({ success: true, data: result.data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        results.push({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      } else {
        results.push({ success: false, error: "API error", details: error });
      }
    }
  }

  return results;
}

// Example 9: Type-safe error handling
export async function typeSafeErrorHandling() {
  try {
    const _response = await api.getApiProductsById({
      path: { id: "invalid-uuid" }, // This will fail UUID validation
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // TypeScript knows this is a ZodError with specific structure
      console.log("Validation errors:");
      error.errors.forEach((err) => {
        console.log(`Field: ${err.path.join(".")}`);
        console.log(`Message: ${err.message}`);
        console.log(`Code: ${err.code}`);
      });
    } else {
      // Handle other types of errors
      console.error("Non-validation error:", error);
    }
  }
}

// Example 10: Integration with existing Zod schemas
export function integrateWithExistingSchemas() {
  // You can extend the generated schemas
  const { zUser } = require("../zod.gen");

  // Create a custom schema that extends the generated one
  const zUserWithPassword = zUser.extend({
    password: z.string().min(8),
  });

  // Use it for validation
  const userWithPassword = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "John Doe",
    email: "john@example.com",
    picture: "https://example.com/avatar.jpg",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    password: "securepassword123",
  };

  try {
    const validated = zUserWithPassword.parse(userWithPassword);
    console.log("Valid user with password:", validated);
  } catch (error) {
    console.error("Validation failed:", error);
  }
}
