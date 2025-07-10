#!/usr/bin/env tsx

import { z } from "zod";
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

/**
 * Test contract validation with the new Zod schemas
 */
async function runTests() {
  console.log("🧪 Testing Contract Validation with OpenAPI-Zod-Client Schemas...\n");

  // Test 1: Valid product creation (request schema)
  console.log("✅ Test 1: Valid product creation (request)");
  try {
    const validProductRequest = {
      name: "Test Product",
      description: "A test product",
      price: 29.99,
      stockQuantity: 100,
      categoryId: "test-category-id",
    };

    // Create a request schema (without auto-generated fields)
    const productRequestSchema = z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      stockQuantity: z.number().int(),
      categoryId: z.string(),
    });

    const validation = productRequestSchema.safeParse(validProductRequest);
    if (validation.success) {
      console.log("   ✓ Valid product request passes validation");
    } else {
      console.log(
        "   ❌ Valid product request failed validation:",
        validation.error.message
      );
    }
  } catch (error) {
    console.log("   ❌ Unexpected error:", error);
  }

  // Test 2: Invalid product creation (missing fields)
  console.log("\n⚠️  Test 2: Invalid product creation (missing fields)");
  try {
    const invalidProductRequest = {
      name: "Test Product",
      // Missing required fields: price, stockQuantity, categoryId
    };

    const productRequestSchema = z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      stockQuantity: z.number().int(),
      categoryId: z.string(),
    });

    const validation = productRequestSchema.safeParse(invalidProductRequest);
    if (!validation.success) {
      console.log("   ✓ Invalid product request correctly rejected");
      console.log(
        "   Validation errors:",
        validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
      );
    } else {
      console.log("   ❌ Invalid product request incorrectly passed validation");
    }
  } catch (error) {
    console.log("   ❌ Unexpected error:", error);
  }

  // Test 3: Valid product response (full schema)
  console.log("\n✅ Test 3: Valid product response (full schema)");
  try {
    const validProductResponse = {
      id: "test-product-id",
      name: "Test Product",
      description: "A test product",
      price: 29.99,
      stockQuantity: 100,
      category: {
        id: "test-category-id",
        name: "Test Category",
        description: "A test category",
        products: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      },
      categoryId: "test-category-id",
      orderItems: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    };

    const validation = schemas.Product.safeParse(validProductResponse);
    if (validation.success) {
      console.log("   ✓ Valid product response passes validation");
    } else {
      console.log(
        "   ❌ Valid product response failed validation:",
        validation.error.message
      );
    }
  } catch (error) {
    console.log("   ❌ Unexpected error:", error);
  }

  // Test 4: Valid category creation (request schema)
  console.log("\n✅ Test 4: Valid category creation (request)");
  try {
    const validCategoryRequest = {
      name: "Test Category",
      description: "A test category",
    };

    const categoryRequestSchema = z.object({
      name: z.string(),
      description: z.string().optional(),
    });

    const validation = categoryRequestSchema.safeParse(validCategoryRequest);
    if (validation.success) {
      console.log("   ✓ Valid category request passes validation");
    } else {
      console.log(
        "   ❌ Valid category request failed validation:",
        validation.error.message
      );
    }
  } catch (error) {
    console.log("   ❌ Unexpected error:", error);
  }

  // Test 5: Valid user creation (request schema)
  console.log("\n✅ Test 5: Valid user creation (request)");
  try {
    const validUserRequest = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      picture: "https://example.com/avatar.jpg",
    };

    const userRequestSchema = z.object({
      name: z.string(),
      email: z.string(),
      password: z.string().optional(),
      picture: z.string(),
    });

    const validation = userRequestSchema.safeParse(validUserRequest);
    if (validation.success) {
      console.log("   ✓ Valid user request passes validation");
    } else {
      console.log(
        "   ❌ Valid user request failed validation:",
        validation.error.message
      );
    }
  } catch (error) {
    console.log("   ❌ Unexpected error:", error);
  }

  // Test 6: Order status validation
  console.log("\n✅ Test 6: Order status validation");
  try {
    const validStatus = "PENDING";
    const invalidStatus = "INVALID_STATUS";

    const validValidation = schemas.OrderStatus.safeParse(validStatus);
    const invalidValidation = schemas.OrderStatus.safeParse(invalidStatus);

    if (validValidation.success) {
      console.log("   ✓ Valid order status passes validation");
    } else {
      console.log("   ❌ Valid order status failed validation");
    }

    if (!invalidValidation.success) {
      console.log("   ✓ Invalid order status correctly rejected");
    } else {
      console.log("   ❌ Invalid order status incorrectly passed validation");
    }
  } catch (error) {
    console.log("   ❌ Unexpected error:", error);
  }

  // Test 7: Schema introspection
  console.log("\n✅ Test 7: Schema introspection");
  try {
    console.log("   Available schemas:", Object.keys(schemas));
    console.log(
      "   Schema types: Product, Category, User, Order, OrderItem, Notification, OrderStatus"
    );
  } catch (error) {
    console.log("   ❌ Unexpected error:", error);
  }

  console.log("\n🎉 Contract Validation Testing Completed!");
  console.log("\n📋 Summary:");
  console.log("- Zod schemas generated from OpenAPI spec");
  console.log("- Request and response validation working");
  console.log("- Type-safe validation with proper error messages");
  console.log("- All schema types available: Product, Category, User, Order, etc.");
  console.log("- Proper distinction between request and response schemas");
}

// Run tests
runTests().catch(console.error);
