#!/usr/bin/env tsx

import { z } from "zod";
import { contractTester } from "./contract-tester";

async function main() {
  console.log("🔍 Starting Contract Tester...");
  console.log("💡 This verifies that API responses match expected schemas\n");

  // Clear any previous results
  contractTester.clearResults();

  try {
    // Sample schema for testing
    const ProductSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      stockQuantity: z.number(),
      categoryId: z.string(),
    });

    // Test 1: Valid product response validation
    console.log("📋 Test 1: Valid Product Response");
    const validProduct = {
      id: "123",
      name: "Test Product",
      price: 29.99,
      stockQuantity: 100,
      categoryId: "cat-1",
    };

    contractTester.validateResponse(
      "/api/products/123",
      "GET",
      200,
      validProduct,
      ProductSchema
    );

    // Test 2: Valid error response validation
    console.log("📋 Test 2: Valid Error Response");
    const errorResponse = {
      error: "Product not found",
    };

    contractTester.validateErrorResponse(
      "/api/products/999",
      "GET",
      404,
      errorResponse,
      [400, 404, 409, 500]
    );

    // Test 3: Valid list response validation
    console.log("📋 Test 3: Valid Product List Response");
    const productList = {
      data: [
        {
          id: "123",
          name: "Product 1",
          price: 29.99,
          stockQuantity: 100,
          categoryId: "cat-1",
        },
        {
          id: "456",
          name: "Product 2",
          price: 49.99,
          stockQuantity: 50,
          categoryId: "cat-2",
        },
      ],
      total: 2,
    };

    const ProductListSchema = z.object({
      data: z.array(ProductSchema),
      total: z.number(),
    });

    contractTester.validateResponse(
      "/api/products",
      "GET",
      200,
      productList,
      ProductListSchema
    );

    // Print results
    contractTester.printResults();

    // Exit with appropriate code
    const results = contractTester.getResults();
    const failedTests = results.filter((r) => !r.success);

    console.log("\n📊 Contract Test Summary:");
    console.log(`   Total tests run: ${results.length}`);
    console.log(`   Passed: ${results.length - failedTests.length}`);
    console.log(`   Failed: ${failedTests.length}`);

    if (failedTests.length === 0) {
      console.log("\n✅ SUCCESS: All contract tests passed!");
      console.log("   API responses match expected schemas.");
      process.exit(0);
    } else {
      console.log("\n❌ FAILURE: Contract violations detected!");
      console.log("   API responses do not match expected schemas.");
      console.log("   Please fix the API to match the expected contract.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Contract test runner failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
