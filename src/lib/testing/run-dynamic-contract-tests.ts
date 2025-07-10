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
import { contractValidation } from "./contract-validation";

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
 * Comprehensive contract tests using the new Zod schemas
 */
async function runDynamicContractTests() {
  console.log(
    "🧪 Running Comprehensive Contract Tests with OpenAPI-Zod-Client Schemas...\n"
  );

  const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    categories: {
      requestValidation: { passed: 0, failed: 0, total: 0 },
      requestViolation: { passed: 0, failed: 0, total: 0 },
      responseValidation: { passed: 0, failed: 0, total: 0 },
      responseViolation: { passed: 0, failed: 0, total: 0 },
      schemaValidation: { passed: 0, failed: 0, total: 0 },
      systemTests: { passed: 0, failed: 0, total: 0 },
    },
  };

  // ============================================================================
  // SCHEMA VALIDATION TESTS
  // ============================================================================
  console.log("📋 SECTION 1: Schema Validation Tests");
  console.log("=".repeat(60));
  console.log(
    "🔍 Testing generated Zod schemas with valid data to ensure they work correctly"
  );
  console.log(
    "✅ These tests verify that our auto-generated schemas can validate proper data"
  );
  console.log("");

  // Test all generated schemas
  const schemaTests = [
    { name: "Product", schema: schemas.Product },
    { name: "Category", schema: schemas.Category },
    { name: "User", schema: schemas.User },
    { name: "Order", schema: schemas.Order },
    { name: "OrderItem", schema: schemas.OrderItem },
    { name: "OrderStatus", schema: schemas.OrderStatus },
  ];

  for (const { name, schema } of schemaTests) {
    console.log(`\n🔍 Testing ${name} schema validation`);
    testResults.categories.schemaValidation.total++;
    testResults.total++;

    try {
      // Test with valid data
      const validData = generateValidDataForSchema(name);
      const validation = schema.safeParse(validData);

      if (validation.success) {
        console.log(`   ✅ ${name} schema accepts valid data`);
        console.log(
          `   📊 Schema fields validated: ${Object.keys(validData).join(", ")}`
        );
        console.log(
          `   📝 Sample data:`,
          JSON.stringify(validData, null, 2)
            .split("\n")
            .map((line) => `      ${line}`)
            .join("\n")
        );
        testResults.categories.schemaValidation.passed++;
        testResults.passed++;
      } else {
        console.log(`   ❌ ${name} schema rejects valid data:`, validation.error.message);
        console.log(`   🔍 Validation errors:`, validation.error.errors);
        testResults.categories.schemaValidation.failed++;
        testResults.failed++;
      }
    } catch (error) {
      console.log(`   ❌ ${name} schema test error:`, error);
      testResults.categories.schemaValidation.failed++;
      testResults.failed++;
    }
  }

  // ============================================================================
  // REQUEST VALIDATION TESTS
  // ============================================================================
  console.log("\n\n📤 SECTION 2: Request Validation Tests");
  console.log("=".repeat(60));
  console.log("🔍 Testing endpoint request validation with valid data");
  console.log("✅ These tests verify that valid requests pass contract validation");
  console.log("");

  const requestTests = [
    {
      endpoint: "/api/products",
      method: "POST",
      validData: {
        name: "Test Product",
        description: "A test product",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
      },
      name: "Product Creation",
    },
    {
      endpoint: "/api/products/{id}",
      method: "PUT",
      validData: {
        name: "Updated Product",
        description: "An updated product",
        price: 39.99,
        stockQuantity: 50,
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
      },
      name: "Product Update",
    },
    {
      endpoint: "/api/categories",
      method: "POST",
      validData: {
        name: "Test Category",
        description: "A test category",
      },
      name: "Category Creation",
    },
    {
      endpoint: "/api/users",
      method: "POST",
      validData: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        picture: "https://example.com/avatar.jpg",
      },
      name: "User Creation",
    },
    {
      endpoint: "/api/orders",
      method: "POST",
      validData: {
        userId: "550e8400-e29b-41d4-a716-446655440001",
        status: "PENDING" as const,
        totalAmount: 99.99,
      },
      name: "Order Creation",
    },
    {
      endpoint: "/api/orders/{id}/status",
      method: "PUT",
      validData: {
        status: "PROCESSING" as const,
      },
      name: "Order Status Update",
    },
  ];

  for (const test of requestTests) {
    console.log(`\n🔍 Testing ${test.name} request validation`);
    testResults.categories.requestValidation.total++;
    testResults.total++;

    try {
      const isValid = contractValidation.validateRequest(
        test.endpoint,
        test.method,
        test.validData
      );
      if (isValid) {
        console.log(`   ✅ ${test.name} valid request passes validation`);
        console.log(`   📊 Endpoint: ${test.method} ${test.endpoint}`);
        console.log(
          `   📝 Request data:`,
          JSON.stringify(test.validData, null, 2)
            .split("\n")
            .map((line) => `      ${line}`)
            .join("\n")
        );
        testResults.categories.requestValidation.passed++;
        testResults.passed++;
      } else {
        console.log(`   ❌ ${test.name} valid request failed validation`);
        console.log(`   📊 Endpoint: ${test.method} ${test.endpoint}`);
        testResults.categories.requestValidation.failed++;
        testResults.failed++;
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} request validation error:`, error);
      testResults.categories.requestValidation.failed++;
      testResults.failed++;
    }
  }

  // ============================================================================
  // REQUEST VIOLATION TESTS (Expected Negative Tests)
  // ============================================================================
  console.log("\n\n🚨 SECTION 3: Request Violation Tests (Expected Negative Tests)");
  console.log("=".repeat(60));
  console.log(
    "⚠️  These tests intentionally send invalid data to verify validation rejects them"
  );
  console.log(
    "✅ All violations shown below are EXPECTED and indicate validation is working correctly"
  );
  console.log("");

  const violationTests = [
    // Product violations
    {
      endpoint: "/api/products",
      method: "POST",
      invalidData: { name: "Test Product" }, // Missing required fields
      name: "Product Creation - Missing Fields",
      expectedToFail: true,
    },
    {
      endpoint: "/api/products",
      method: "POST",
      invalidData: {
        name: "Test Product",
        description: "A test product",
        price: "invalid-price", // Wrong type
        stockQuantity: 100,
        categoryId: "test-category-id",
      },
      name: "Product Creation - Wrong Type",
      expectedToFail: true,
    },
    {
      endpoint: "/api/products",
      method: "POST",
      invalidData: {
        name: "Test Product",
        description: "A test product",
        price: -10, // Invalid value
        stockQuantity: 100,
        categoryId: "test-category-id",
      },
      name: "Product Creation - Invalid Value",
      expectedToFail: true,
    },
    {
      endpoint: "/api/products",
      method: "POST",
      invalidData: {
        name: "Test Product",
        description: "A test product",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
        extraField: "should not be allowed", // Extra field
      },
      name: "Product Creation - Extra Field",
      expectedToFail: true,
    },

    // Category violations
    {
      endpoint: "/api/categories",
      method: "POST",
      invalidData: {}, // Missing required fields
      name: "Category Creation - Missing Fields",
      expectedToFail: true,
    },
    {
      endpoint: "/api/categories",
      method: "POST",
      invalidData: {
        name: 123, // Wrong type
        description: "A test category",
      },
      name: "Category Creation - Wrong Type",
      expectedToFail: true,
    },

    // User violations
    {
      endpoint: "/api/users",
      method: "POST",
      invalidData: {
        name: "Test User",
        // Missing email and picture
      },
      name: "User Creation - Missing Fields",
      expectedToFail: true,
    },
    {
      endpoint: "/api/users",
      method: "POST",
      invalidData: {
        name: "Test User",
        email: "invalid-email", // Invalid email format
        picture: "https://example.com/avatar.jpg",
      },
      name: "User Creation - Invalid Email",
      expectedToFail: true,
    },

    // Order violations
    {
      endpoint: "/api/orders",
      method: "POST",
      invalidData: {
        userId: "550e8400-e29b-41d4-a716-446655440001",
        status: "INVALID_STATUS" as any, // Invalid enum
        totalAmount: 99.99,
      },
      name: "Order Creation - Invalid Status",
      expectedToFail: true,
    },
    {
      endpoint: "/api/orders",
      method: "POST",
      invalidData: {
        userId: "550e8400-e29b-41d4-a716-446655440001",
        status: "PENDING" as const,
        totalAmount: -50, // Invalid amount
      },
      name: "Order Creation - Invalid Amount",
      expectedToFail: true,
    },

    // Order status violations
    {
      endpoint: "/api/orders/{id}/status",
      method: "PUT",
      invalidData: {
        status: "INVALID_STATUS" as any, // Invalid enum
      },
      name: "Order Status Update - Invalid Status",
      expectedToFail: true,
    },
    {
      endpoint: "/api/orders/{id}/status",
      method: "PUT",
      invalidData: {
        status: "PENDING" as const,
        extraField: "should not be allowed", // Extra field
      },
      name: "Order Status Update - Extra Field",
      expectedToFail: true,
    },
  ];

  for (const test of violationTests) {
    console.log(`\n🧪 NEGATIVE TEST: ${test.name}`);
    testResults.categories.requestViolation.total++;
    testResults.total++;

    try {
      const isValid = contractValidation.validateRequest(
        test.endpoint,
        test.method,
        test.invalidData,
        true // isTestMode = true for violation tests
      );
      if (test.expectedToFail && !isValid) {
        console.log(`   ✅ EXPECTED: ${test.name} correctly rejected invalid data`);
        testResults.categories.requestViolation.passed++;
        testResults.passed++;
      } else if (test.expectedToFail && isValid) {
        console.log(`   ❌ UNEXPECTED: ${test.name} incorrectly accepted invalid data`);
        testResults.categories.requestViolation.failed++;
        testResults.failed++;
      } else if (!test.expectedToFail && isValid) {
        console.log(`   ✅ EXPECTED: ${test.name} correctly accepted valid data`);
        testResults.categories.requestViolation.passed++;
        testResults.passed++;
      } else {
        console.log(`   ❌ UNEXPECTED: ${test.name} incorrectly rejected valid data`);
        testResults.categories.requestViolation.failed++;
        testResults.failed++;
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} violation test error:`, error);
      testResults.categories.requestViolation.failed++;
      testResults.failed++;
    }
  }

  // ============================================================================
  // RESPONSE VALIDATION TESTS
  // ============================================================================
  console.log("\n\n📥 SECTION 4: Response Validation Tests");
  console.log("=".repeat(60));
  console.log("🔍 Testing endpoint response validation with valid data");
  console.log("✅ These tests verify that valid responses pass contract validation");
  console.log("");

  const responseTests = [
    {
      endpoint: "/api/products",
      method: "GET",
      validData: [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Test Product",
          description: "A test product",
          price: 29.99,
          stockQuantity: 100,
          category: {
            id: "123e4567-e89b-12d3-a456-426614174001",
            name: "Test Category",
            description: "A test category",
            products: [],
            createdAt: "2023-01-01T00:00:00Z",
            updatedAt: "2023-01-01T00:00:00Z",
          },
          categoryId: "123e4567-e89b-12d3-a456-426614174001",
          orderItems: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ],
      name: "Product List Response",
    },
    {
      endpoint: "/api/products/{id}",
      method: "GET",
      validData: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        description: "A test product",
        price: 29.99,
        stockQuantity: 100,
        category: {
          id: "123e4567-e89b-12d3-a456-426614174001",
          name: "Test Category",
          description: "A test category",
          products: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        orderItems: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      },
      name: "Product Detail Response",
    },
    {
      endpoint: "/api/categories",
      method: "GET",
      validData: [
        {
          id: "123e4567-e89b-12d3-a456-426614174001",
          name: "Test Category",
          description: "A test category",
          products: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ],
      name: "Category List Response",
    },
    {
      endpoint: "/api/users/{id}",
      method: "GET",
      validData: {
        id: "123e4567-e89b-12d3-a456-426614174002",
        name: "Test User",
        email: "test.user@example.com",
        password: "hashed-password",
        picture: "https://example.com/avatar.jpg",
        notifications: [],
        orders: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      },
      name: "User Detail Response",
    },
    {
      endpoint: "/api/orders",
      method: "GET",
      validData: [
        {
          id: "123e4567-e89b-12d3-a456-426614174003",
          user: {
            id: "123e4567-e89b-12d3-a456-426614174002",
            name: "Test User",
            email: "test.user@example.com",
            password: "hashed-password",
            picture: "https://example.com/avatar.jpg",
            notifications: [],
            orders: [],
            createdAt: "2023-01-01T00:00:00Z",
            updatedAt: "2023-01-01T00:00:00Z",
          },
          userId: "123e4567-e89b-12d3-a456-426614174002",
          status: "PENDING" as const,
          totalAmount: 99.99,
          orderItems: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ],
      name: "Order List Response",
    },
  ];

  for (const test of responseTests) {
    console.log(`\n🔍 Testing ${test.name} validation`);
    testResults.categories.responseValidation.total++;
    testResults.total++;

    try {
      const isValid = contractValidation.validateResponse(
        test.endpoint,
        test.method,
        test.validData
      );
      if (isValid) {
        console.log(`   ✅ ${test.name} valid response passes validation`);
        console.log(`   📊 Endpoint: ${test.method} ${test.endpoint}`);
        console.log(
          `   📝 Response data:`,
          JSON.stringify(test.validData, null, 2)
            .split("\n")
            .map((line) => `      ${line}`)
            .join("\n")
        );
        testResults.categories.responseValidation.passed++;
        testResults.passed++;
      } else {
        console.log(`   ❌ ${test.name} valid response failed validation`);
        console.log(`   📊 Endpoint: ${test.method} ${test.endpoint}`);
        testResults.categories.responseValidation.failed++;
        testResults.failed++;
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} response validation error:`, error);
      testResults.categories.responseValidation.failed++;
      testResults.failed++;
    }
  }

  // ============================================================================
  // RESPONSE VIOLATION TESTS (Expected Negative Tests)
  // ============================================================================
  console.log("\n\n🚨 SECTION 5: Response Violation Tests (Expected Negative Tests)");
  console.log("=".repeat(60));
  console.log(
    "⚠️  These tests intentionally send invalid response data to verify validation rejects them"
  );
  console.log(
    "✅ All violations shown below are EXPECTED and indicate validation is working correctly"
  );
  console.log("");

  const responseViolationTests = [
    {
      endpoint: "/api/products/{id}",
      method: "GET",
      invalidData: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        // Missing required fields: description, price, stockQuantity, etc.
      },
      name: "Product Response - Missing Fields",
      expectedToFail: true,
    },
    {
      endpoint: "/api/products/{id}",
      method: "GET",
      invalidData: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        description: "A test product",
        price: "invalid-price", // Wrong type
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        category: {
          id: "123e4567-e89b-12d3-a456-426614174001",
          name: "Test Category",
          description: "A test category",
          products: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        orderItems: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      },
      name: "Product Response - Wrong Type",
      expectedToFail: true,
    },
    {
      endpoint: "/api/orders/{id}",
      method: "GET",
      invalidData: {
        id: "123e4567-e89b-12d3-a456-426614174003",
        user: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          name: "Test User",
          email: "test.user@example.com",
          password: "hashed-password",
          picture: "https://example.com/avatar.jpg",
          notifications: [],
          orders: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        userId: "123e4567-e89b-12d3-a456-426614174002",
        status: "INVALID_STATUS" as any, // Invalid enum
        totalAmount: 99.99,
        orderItems: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      },
      name: "Order Response - Invalid Status",
      expectedToFail: true,
    },
    {
      endpoint: "/api/users/{id}",
      method: "GET",
      invalidData: {
        id: "123e4567-e89b-12d3-a456-426614174002",
        name: "Test User",
        // Missing required fields: email, picture, notifications, orders, createdAt, updatedAt
      },
      name: "User Response - Missing Fields",
      expectedToFail: true,
    },
    {
      endpoint: "/api/users/{id}",
      method: "GET",
      invalidData: {
        id: "123e4567-e89b-12d3-a456-426614174002",
        name: "Test User",
        email: "test.user@example.com", // Valid email format
        password: "hashed-password",
        picture: "https://example.com/avatar.jpg",
        notifications: [],
        orders: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        extraField: "should not be allowed", // Extra field
      },
      name: "User Response - Extra Field",
      expectedToFail: false, // Generated schemas use .passthrough() so extra fields are allowed
    },
  ];

  for (const test of responseViolationTests) {
    console.log(`\n🧪 NEGATIVE TEST: ${test.name}`);
    testResults.categories.responseViolation.total++;
    testResults.total++;

    try {
      const isValid = contractValidation.validateResponse(
        test.endpoint,
        test.method,
        test.invalidData,
        true // isTestMode = true for violation tests
      );
      if (test.expectedToFail && !isValid) {
        console.log(`   ✅ EXPECTED: ${test.name} correctly rejected invalid data`);
        testResults.categories.responseViolation.passed++;
        testResults.passed++;
      } else if (test.expectedToFail && isValid) {
        console.log(`   ❌ UNEXPECTED: ${test.name} incorrectly accepted invalid data`);
        testResults.categories.responseViolation.failed++;
        testResults.failed++;
      } else if (!test.expectedToFail && isValid) {
        console.log(`   ✅ EXPECTED: ${test.name} correctly accepted valid data`);
        testResults.categories.responseViolation.passed++;
        testResults.passed++;
      } else {
        console.log(`   ❌ UNEXPECTED: ${test.name} incorrectly rejected valid data`);
        testResults.categories.responseViolation.failed++;
        testResults.failed++;
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} response violation test error:`, error);
      testResults.categories.responseViolation.failed++;
      testResults.failed++;
    }
  }

  // ============================================================================
  // ENDPOINT DISCOVERY AND SCHEMA AVAILABILITY TESTS
  // ============================================================================
  console.log("\n\n🔍 SECTION 6: Endpoint Discovery and Schema Availability");
  console.log("=".repeat(60));

  // Test endpoint discovery
  console.log("\n✅ Testing endpoint discovery");
  testResults.categories.systemTests.total++;
  testResults.total++;
  try {
    const endpoints = contractValidation.getEndpoints();
    console.log("   Available endpoints:", endpoints);

    const expectedEndpoints = [
      "/api/products",
      "/api/products/{id}",
      "/api/categories",
      "/api/categories/{id}",
      "/api/users",
      "/api/users/{id}",
      "/api/orders",
      "/api/orders/{id}",
      "/api/orders/{id}/status",
    ];

    const hasAllEndpoints = expectedEndpoints.every((endpoint) =>
      endpoints.includes(endpoint)
    );

    if (hasAllEndpoints) {
      console.log("   ✓ All expected endpoints discovered");
      testResults.categories.systemTests.passed++;
      testResults.passed++;
    } else {
      console.log("   ❌ Missing expected endpoints");
      testResults.categories.systemTests.failed++;
      testResults.failed++;
    }
  } catch (error) {
    console.log("   ❌ Endpoint discovery error:", error);
    testResults.categories.systemTests.failed++;
    testResults.failed++;
  }

  // Test schema availability
  console.log("\n✅ Testing schema availability");
  testResults.categories.systemTests.total++;
  testResults.total++;
  try {
    const hasProductSchema = contractValidation.hasSchema("/api/products");
    const hasCategorySchema = contractValidation.hasSchema("/api/categories");
    const hasUserSchema = contractValidation.hasSchema("/api/users");
    const hasOrderSchema = contractValidation.hasSchema("/api/orders");
    const hasNonExistentSchema = contractValidation.hasSchema("/api/nonexistent");

    if (
      hasProductSchema &&
      hasCategorySchema &&
      hasUserSchema &&
      hasOrderSchema &&
      !hasNonExistentSchema
    ) {
      console.log(
        "   ✓ All expected schemas available and non-existent schemas correctly identified"
      );
      testResults.categories.systemTests.passed++;
      testResults.passed++;
    } else {
      console.log("   ❌ Schema availability check failed");
      testResults.categories.systemTests.failed++;
      testResults.failed++;
    }
  } catch (error) {
    console.log("   ❌ Schema availability error:", error);
    testResults.categories.systemTests.failed++;
    testResults.failed++;
  }

  // Test schema introspection
  console.log("\n✅ Testing schema introspection");
  testResults.categories.systemTests.total++;
  testResults.total++;
  try {
    const availableSchemas = Object.keys(schemas);
    console.log("   Available schemas:", availableSchemas);

    const expectedSchemas = [
      "Product",
      "Category",
      "User",
      "Order",
      "OrderItem",
      "OrderStatus",
    ];
    const hasAllSchemas = expectedSchemas.every((schema) =>
      availableSchemas.includes(schema)
    );

    if (hasAllSchemas) {
      console.log("   ✓ All expected schemas present");
      testResults.categories.systemTests.passed++;
      testResults.passed++;
    } else {
      console.log("   ❌ Missing expected schemas");
      testResults.categories.systemTests.failed++;
      testResults.failed++;
    }
  } catch (error) {
    console.log("   ❌ Schema introspection error:", error);
    testResults.categories.systemTests.failed++;
    testResults.failed++;
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n\n🎉 Comprehensive Contract Tests Completed!");
  console.log("=".repeat(60));

  console.log("\n📊 Detailed Summary:");
  console.log(
    `   Schema Validation (Positive Tests): ${testResults.categories.schemaValidation.passed}/${testResults.categories.schemaValidation.total} passed`
  );
  console.log(
    `   Request Validation (Positive Tests): ${testResults.categories.requestValidation.passed}/${testResults.categories.requestValidation.total} passed`
  );
  console.log(
    `   Request Violation (Negative Tests): ${testResults.categories.requestViolation.passed}/${testResults.categories.requestViolation.total} passed`
  );
  console.log(
    `   Response Validation (Positive Tests): ${testResults.categories.responseValidation.passed}/${testResults.categories.responseValidation.total} passed`
  );
  console.log(
    `   Response Violation (Negative Tests): ${testResults.categories.responseViolation.passed}/${testResults.categories.responseViolation.total} passed`
  );
  console.log(
    `   System Tests: ${testResults.categories.systemTests.passed}/${testResults.categories.systemTests.total} passed`
  );

  console.log("\n📈 Overall Results:");
  console.log(`   Total Tests: ${testResults.total}`);
  console.log(`   Passed: ${testResults.passed}`);
  console.log(`   Failed: ${testResults.failed}`);
  console.log(
    `   Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`
  );

  if (testResults.failed > 0) {
    console.log("\n🚨 CONTRACT VIOLATIONS DETECTED:");
    console.log(
      "   The failed tests above indicate actual contract violations that need to be fixed."
    );
    console.log(
      "   These are NOT expected negative tests - they represent real problems."
    );
  } else {
    console.log("\n✅ NO CONTRACT VIOLATIONS:");
    console.log(
      "   All tests passed! The 'violations' shown above are expected negative tests."
    );
    console.log("   Your contract validation is working correctly.");
  }

  if (testResults.failed > 0) {
    process.exit(1);
  }
}

/**
 * Generate valid data for a given schema
 */
function generateValidDataForSchema(schemaName: string): any {
  switch (schemaName) {
    case "Product":
      return {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        description: "A test product",
        price: 29.99,
        stockQuantity: 100,
        category: {
          id: "123e4567-e89b-12d3-a456-426614174001",
          name: "Test Category",
          description: "A test category",
          products: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        orderItems: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };
    case "Category":
      return {
        id: "123e4567-e89b-12d3-a456-426614174001",
        name: "Test Category",
        description: "A test category",
        products: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };
    case "User":
      return {
        id: "123e4567-e89b-12d3-a456-426614174002",
        name: "Test User",
        email: "test.user@example.com",
        password: "hashed-password",
        picture: "https://example.com/avatar.jpg",
        notifications: [],
        orders: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };
    case "Order":
      return {
        id: "123e4567-e89b-12d3-a456-426614174003",
        user: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          name: "Test User",
          email: "test.user@example.com",
          password: "hashed-password",
          picture: "https://example.com/avatar.jpg",
          notifications: [],
          orders: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        userId: "123e4567-e89b-12d3-a456-426614174002",
        status: "PENDING" as const,
        totalAmount: 99.99,
        orderItems: [],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };
    case "OrderItem":
      return {
        id: "123e4567-e89b-12d3-a456-426614174004",
        order: {
          id: "123e4567-e89b-12d3-a456-426614174003",
          user: {
            id: "123e4567-e89b-12d3-a456-426614174002",
            name: "Test User",
            email: "test.user@example.com",
            password: "hashed-password",
            picture: "https://example.com/avatar.jpg",
            notifications: [],
            orders: [],
            createdAt: "2023-01-01T00:00:00Z",
            updatedAt: "2023-01-01T00:00:00Z",
          },
          userId: "123e4567-e89b-12d3-a456-426614174002",
          status: "PENDING" as const,
          totalAmount: 99.99,
          orderItems: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        orderId: "123e4567-e89b-12d3-a456-426614174003",
        product: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Test Product",
          description: "A test product",
          price: 29.99,
          stockQuantity: 100,
          category: {
            id: "123e4567-e89b-12d3-a456-426614174001",
            name: "Test Category",
            description: "A test category",
            products: [],
            createdAt: "2023-01-01T00:00:00Z",
            updatedAt: "2023-01-01T00:00:00Z",
          },
          categoryId: "123e4567-e89b-12d3-a456-426614174001",
          orderItems: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        productId: "123e4567-e89b-12d3-a456-426614174000",
        quantity: 2,
        priceAtTime: 29.99,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };
    case "OrderStatus":
      return "PENDING";
    default:
      return {};
  }
}

// Run tests
runDynamicContractTests().catch(console.error);
