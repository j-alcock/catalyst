#!/usr/bin/env tsx

import { z } from "zod";
import { contractTester } from "./contract-tester";

async function main() {
  console.log("🔍 Starting Basic Contract Tester...");
  console.log("💡 This demonstrates basic contract validation functionality\n");

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

    // Test 1: Valid response validation
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

    // Test 2: Invalid response validation (missing required field)
    console.log("📋 Test 2: Invalid Product Response (missing price)");
    const invalidProduct = {
      id: "123",
      name: "Test Product",
      // price is missing
      stockQuantity: 100,
      categoryId: "cat-1",
    };

    contractTester.validateResponse(
      "/api/products/123",
      "GET",
      200,
      invalidProduct,
      ProductSchema
    );

    // Test 3: Error response validation
    console.log("📋 Test 3: Error Response Validation");
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

    // Test 4: Wrong status code for error
    console.log("📋 Test 4: Wrong Status Code for Error");
    contractTester.validateErrorResponse(
      "/api/products/999",
      "GET",
      200, // Wrong status code for error
      errorResponse,
      [400, 404, 409, 500]
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

    if (failedTests.length > 0) {
      console.log("\n✅ SUCCESS: Contract violations were detected as expected!");
      console.log("   This demonstrates that the contract tester is working correctly.");
      process.exit(0);
    } else {
      console.log("\n⚠️  WARNING: No contract violations were detected.");
      console.log("   This might indicate an issue with the test setup.");
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
