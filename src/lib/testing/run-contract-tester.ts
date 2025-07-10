#!/usr/bin/env tsx

import {
  zError,
  zGetApiCategoriesResponse,
  zGetApiOrdersResponse,
  zGetApiProductsResponse,
  zProduct,
} from "@/lib/heyapi/zod.gen";
import { z } from "zod";
import { ContractTester, contractTester } from "./contract-tester";

async function main() {
  console.log("🔍 Starting Contract Tester...");
  console.log("💡 This verifies that API responses match expected schemas\n");

  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  console.log(`🌐 Testing against: ${baseUrl}`);

  // Create a new instance with the correct base URL
  const tester = new ContractTester(baseUrl);

  // Clear any previous results
  tester.clearResults();

  try {
    // Test 1: GET /api/products - should return paginated products
    console.log("📋 Test 1: GET /api/products (Paginated Products)");
    await tester.testEndpoint("/api/products", "GET", zGetApiProductsResponse);

    // Test 2: GET /api/categories - should return categories array
    console.log("📋 Test 2: GET /api/categories");
    await tester.testEndpoint("/api/categories", "GET", zGetApiCategoriesResponse);

    // Test 3: GET /api/orders - should return orders array
    console.log("📋 Test 3: GET /api/orders");
    await tester.testEndpoint("/api/orders", "GET", zGetApiOrdersResponse);

    // Test 4: POST /api/products with invalid data - should return 400 error
    console.log("📋 Test 4: POST /api/products (Invalid Data - Error Response)");
    await tester.testEndpoint(
      "/api/products",
      "POST",
      zError,
      {
        name: "", // Invalid: empty name
        price: -10, // Invalid: negative price
        stockQuantity: 100,
        categoryId: "invalid-category-id",
      },
      [400]
    );

    // Test 5: GET non-existent endpoint - should return 400 error (Next.js default)
    console.log("📋 Test 5: GET /api/nonexistent (400 Error)");
    await tester.testEndpoint(
      "/api/nonexistent",
      "GET",
      z.union([zError, z.string()]), // Accept both object and string error responses
      undefined,
      [400]
    );

    // Test 6: GET /api/products with query parameters
    console.log("📋 Test 6: GET /api/products?page=1&pageSize=5");
    await tester.testEndpoint(
      "/api/products?page=1&pageSize=5",
      "GET",
      zGetApiProductsResponse
    );

    // Test 7: GET non-existent endpoints - should return proper error responses
    console.log("📋 Test 7: GET /api/nonexistent-endpoint (400 Error)");
    await tester.testEndpoint(
      "/api/nonexistent-endpoint",
      "GET",
      z.union([zError, z.string()]), // Accept both object and string error responses
      undefined,
      [400]
    );

    // Test 8: GET invalid product ID - should return 400 error
    console.log("📋 Test 8: GET /api/products/invalid-uuid (400 Error)");
    await tester.testEndpoint(
      "/api/products/invalid-uuid",
      "GET",
      z.union([zError, z.string()]),
      undefined,
      [400]
    );

    // Test 9: GET non-existent category - should return 404 error
    console.log("📋 Test 9: GET /api/categories/non-existent (404 Error)");
    await tester.testEndpoint(
      "/api/categories/non-existent",
      "GET",
      z.union([zError, z.string()]),
      undefined,
      [404]
    );

    // Print results
    tester.printResults();

    // Exit with appropriate code
    const results = tester.getResults();
    const failedTests = results.filter((r: any) => !r.success);

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
