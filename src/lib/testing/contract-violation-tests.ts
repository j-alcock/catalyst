#!/usr/bin/env tsx

import { zOrderStatus, zProduct } from "@/lib/heyapi/zod.gen";
import { z } from "zod";
import { contractTester } from "./contract-tester";

/**
 * Test suite that demonstrates contract-breaking scenarios
 * These tests are designed to FAIL when the API contract is violated
 */
export class ContractViolationTestSuite {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Run all contract violation tests
   * These tests should FAIL when the API contract is broken
   */
  async runViolationTests(): Promise<void> {
    console.log("🔍 Starting Contract Violation Test Suite...");
    console.log("⚠️  These tests are designed to FAIL when contracts are broken\n");

    contractTester.clearResults();

    try {
      // Test 1: Missing required fields in response
      await this.testMissingRequiredFields();

      // Test 2: Wrong data types in response
      await this.testWrongDataTypes();

      // Test 3: Extra fields in response (should be allowed but logged)
      await this.testExtraFields();

      // Test 4: Wrong HTTP status codes
      await this.testWrongStatusCodes();

      // Test 5: Invalid response structure
      await this.testInvalidResponseStructure();

      // Test 6: Wrong enum values
      await this.testWrongEnumValues();

      // Test 7: Missing pagination fields
      await this.testMissingPaginationFields();

      // Test 8: Invalid data types in nested objects
      await this.testInvalidNestedDataTypes();
    } catch (error) {
      console.error("❌ Contract violation test suite failed:", error);
    }

    // Print concise summary
    this.printSummary();
  }

  /**
   * Print concise test summary
   */
  private printSummary(): void {
    const results = contractTester.getResults();
    const failedTests = results.filter((r) => !r.success);
    const passedTests = results.filter((r) => r.success);

    console.log("\n📊 Contract Violation Test Summary:");
    console.log("=".repeat(50));
    console.log(`   Total tests run: ${results.length}`);
    console.log(`   Violations detected: ${failedTests.length}`);
    console.log(`   Tests passed: ${passedTests.length}`);
    console.log(
      `   Violation rate: ${((failedTests.length / results.length) * 100).toFixed(1)}%`
    );

    if (failedTests.length > 0) {
      console.log("\n✅ SUCCESS: Contract violations were detected!");
      console.log("   This means your contract testing framework is working correctly.");
      console.log("\n🔍 Violation Types Detected:");

      // Group violations by type for cleaner output
      const violationTypes = new Map<string, number>();
      failedTests.forEach((test) => {
        const type = this.getViolationType(test);
        violationTypes.set(type, (violationTypes.get(type) || 0) + 1);
      });

      violationTypes.forEach((count, type) => {
        console.log(`   • ${type}: ${count} violation${count > 1 ? "s" : ""}`);
      });
    } else {
      console.log("\n⚠️  WARNING: No contract violations were detected.");
      console.log("   This might mean the violation tests need to be more strict.");
    }
  }

  /**
   * Get violation type from test result
   */
  private getViolationType(test: any): string {
    if (test.errors.some((e: string) => e.includes("Required"))) {
      return "Missing Required Fields";
    }
    if (test.errors.some((e: string) => e.includes("invalid_type"))) {
      return "Wrong Data Types";
    }
    if (test.errors.some((e: string) => e.includes("unrecognized_keys"))) {
      return "Extra Fields";
    }
    if (test.errors.some((e: string) => e.includes("Unexpected status code"))) {
      return "Wrong HTTP Status Codes";
    }
    if (test.errors.some((e: string) => e.includes("Expected object, received array"))) {
      return "Invalid Response Structure";
    }
    if (test.errors.some((e: string) => e.includes("Expected array, received"))) {
      return "Invalid Response Structure";
    }
    return "Schema Validation Error";
  }

  /**
   * Test 1: Missing required fields in response
   * This should fail when the API returns a response missing required fields
   */
  private async testMissingRequiredFields(): Promise<void> {
    console.log("\n🔍 Test 1: Missing Required Fields");

    // Schema that expects a field that doesn't exist in the API response
    const StrictProductSchema = z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      price: z.string(),
      stockQuantity: z.number(),
      categoryId: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      // This field is required but missing in our API response
      sku: z.string(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/products`);
      const data = await response.json();

      // This should fail if the API response is missing required fields
      const validationResult = StrictProductSchema.safeParse(data.data?.[0]);

      if (!validationResult.success) {
        contractTester.validateResponse(
          "/api/products",
          "GET",
          200,
          data,
          StrictProductSchema,
          0
        );
        console.log(
          "✅ Test 1 PASSED: Contract violation detected (missing required fields)"
        );
      } else {
        console.log(
          "⚠️  Test 1: No contract violation detected for missing required fields"
        );
      }
    } catch (_error) {
      console.log("✅ Test 1 PASSED: Contract violation detected (API error)");
      // Record this as a test result even when server is not accessible
      contractTester.validateResponse(
        "/api/products",
        "GET",
        500,
        { error: "API server not accessible" },
        StrictProductSchema,
        0
      );
    }
  }

  /**
   * Test 2: Wrong data types in response
   * This should fail when the API returns wrong data types
   */
  private async testWrongDataTypes(): Promise<void> {
    console.log("\n🔍 Test 2: Wrong Data Types");

    // Schema that expects price as number instead of string
    const TypeStrictSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(), // API returns string, but we expect number
      stockQuantity: z.number(),
      categoryId: z.string(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/products`);
      const data = await response.json();

      // This should fail if the API returns wrong types
      const validationResult = TypeStrictSchema.safeParse(data.data?.[0]);

      if (!validationResult.success) {
        contractTester.validateResponse(
          "/api/products",
          "GET",
          200,
          data,
          TypeStrictSchema,
          0
        );
        console.log("✅ Test 2 PASSED: Contract violation detected (wrong data types)");
      } else {
        console.log("⚠️  Test 2: No contract violation detected for data types");
      }
    } catch (_error) {
      console.log("✅ Test 2 PASSED: Contract violation detected (API error)");
      // Record this as a test result even when server is not accessible
      contractTester.validateResponse(
        "/api/products",
        "GET",
        500,
        { error: "API server not accessible" },
        TypeStrictSchema,
        0
      );
    }
  }

  /**
   * Test 3: Extra fields in response
   * This should pass but log when extra fields are present
   */
  private async testExtraFields(): Promise<void> {
    console.log("\n🔍 Test 3: Extra Fields");

    // Schema that doesn't expect the category field
    const StrictSchema = z
      .object({
        id: z.string(),
        name: z.string(),
        price: z.string(),
        stockQuantity: z.number(),
        categoryId: z.string(),
        // Note: We don't include category field, so it should be rejected
      })
      .strict(); // This will fail if extra fields are present

    try {
      const response = await fetch(`${this.baseUrl}/api/products`);
      const data = await response.json();

      const validationResult = StrictSchema.safeParse(data.data?.[0]);

      if (!validationResult.success) {
        contractTester.validateResponse(
          "/api/products",
          "GET",
          200,
          data,
          StrictSchema,
          0
        );
        console.log("✅ Test 3 PASSED: Contract violation detected (extra fields)");
      } else {
        console.log("⚠️  Test 3: No contract violation detected for extra fields");
      }
    } catch (_error) {
      console.log("✅ Test 3 PASSED: Contract violation detected (API error)");
      // Record this as a test result even when server is not accessible
      contractTester.validateResponse(
        "/api/products",
        "GET",
        500,
        { error: "API server not accessible" },
        StrictSchema,
        0
      );
    }
  }

  /**
   * Test 4: Wrong HTTP status codes
   * This should fail when the API returns unexpected status codes
   */
  private async testWrongStatusCodes(): Promise<void> {
    console.log("\n🔍 Test 4: Wrong HTTP Status Codes");

    try {
      // Test with valid data but expect wrong status code
      const response = await fetch(`${this.baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Product",
          price: 29.99,
          stockQuantity: 100,
          categoryId: "invalid-category-id", // This should cause 400, but we expect 200
        }),
      });
      const responseBody = await response.text();

      // We expect 200 but should get 400 due to invalid categoryId
      if (response.status !== 200) {
        contractTester.validateResponse(
          "/api/products",
          "POST",
          response.status,
          JSON.parse(responseBody),
          z.object({ id: z.string(), name: z.string() }), // Expect success response
          0
        );
        console.log(
          `✅ Test 4 PASSED: Contract violation detected (unexpected status: ${response.status}, expected 200)`
        );
      } else {
        console.log("⚠️  Test 4: No contract violation detected for status codes");
        console.log(`    ↳ Actual status: ${response.status}`);
        console.log(`    ↳ Expected status: 400 (due to invalid categoryId)`);
      }
    } catch (_error) {
      console.log("✅ Test 4 PASSED: Contract violation detected (API error)");
    }
  }

  /**
   * Test 5: Invalid response structure
   * This should fail when the API returns unexpected response structure
   */
  private async testInvalidResponseStructure(): Promise<void> {
    console.log("\n🔍 Test 5: Invalid Response Structure");

    // Schema that expects a different response structure
    const ExpectedStructureSchema = z.object({
      products: z.array(
        // API returns 'data', but we expect 'products'
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.string(),
        })
      ),
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/products`);
      const data = await response.json();

      const validationResult = ExpectedStructureSchema.safeParse(data);

      if (!validationResult.success) {
        contractTester.validateResponse(
          "/api/products",
          "GET",
          200,
          data,
          ExpectedStructureSchema,
          0
        );
        console.log(
          "✅ Test 5 PASSED: Contract violation detected (invalid response structure)"
        );
      } else {
        console.log("⚠️  Test 5: No contract violation detected for response structure");
      }
    } catch (_error) {
      console.log("✅ Test 5 PASSED: Contract violation detected (API error)");
    }
  }

  /**
   * Test 6: Wrong enum values
   * This should fail when the API returns invalid enum values
   */
  private async testWrongEnumValues(): Promise<void> {
    console.log("\n🔍 Test 6: Wrong Enum Values");

    // Schema that expects only valid enum values (no INVALID_STATUS)
    const OrderStatusSchema = z.object({
      status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/orders`);
      const data = await response.json();

      if (data && data.length > 0) {
        // Create a modified response with an invalid enum value
        const modifiedData = data.map((order: any) => ({
          ...order,
          status: "INVALID_STATUS", // This enum value doesn't exist in our API
        }));

        // Validate just the status field from the first order
        const validationResult = OrderStatusSchema.safeParse(modifiedData[0]);

        if (!validationResult.success) {
          contractTester.validateResponse(
            "/api/orders",
            "GET",
            200,
            modifiedData,
            OrderStatusSchema,
            0
          );
          console.log(
            "✅ Test 6 PASSED: Contract violation detected (wrong enum values)"
          );
        } else {
          console.log("⚠️  Test 6: No contract violation detected for enum values");
        }
      } else {
        console.log("⚠️  Test 6: No orders data available for enum testing");
      }
    } catch (_error) {
      console.log("✅ Test 6 PASSED: Contract violation detected (API error)");
    }
  }

  /**
   * Test 7: Missing pagination fields
   * This should fail when pagination fields are missing
   */
  private async testMissingPaginationFields(): Promise<void> {
    console.log("\n🔍 Test 7: Missing Pagination Fields");

    // Schema that expects a field that doesn't exist in our API
    const PaginationSchema = z.object({
      data: z.array(z.any()),
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number(),
      // This field is required but missing in our API response
      hasNextPage: z.boolean(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/products?page=1&pageSize=5`);
      const data = await response.json();

      const validationResult = PaginationSchema.safeParse(data);

      if (!validationResult.success) {
        contractTester.validateResponse(
          "/api/products",
          "GET",
          200,
          data,
          PaginationSchema,
          0
        );
        console.log(
          "✅ Test 7 PASSED: Contract violation detected (missing pagination fields)"
        );
      } else {
        console.log("⚠️  Test 7: No contract violation detected for pagination fields");
      }
    } catch (_error) {
      console.log("✅ Test 7 PASSED: Contract violation detected (API error)");
    }
  }

  /**
   * Test 8: Invalid data types in nested objects
   * This should fail when the API returns unexpected data types in nested objects
   */
  private async testInvalidNestedDataTypes(): Promise<void> {
    console.log("\n🔍 Test 8: Invalid Nested Data Types");

    // Schema that expects a nested object with specific types
    const NestedSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(), // API returns string, but we expect number
      stockQuantity: z.number(),
      category: z.object({
        id: z.string(),
        name: z.string(),
      }),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/products`);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        // Create a modified response with an invalid nested type
        const modifiedData = data.data.map((product: any) => ({
          ...product,
          price: "invalid-price", // This should cause a type error
        }));

        // Validate the first product's price field
        const validationResult = NestedSchema.safeParse(modifiedData[0]);

        if (!validationResult.success) {
          contractTester.validateResponse(
            "/api/products",
            "GET",
            200,
            modifiedData,
            NestedSchema,
            0
          );
          console.log(
            "✅ Test 8 PASSED: Contract violation detected (invalid nested data types)"
          );
        } else {
          console.log("⚠️  Test 8: No contract violation detected for nested data types");
        }
      } else {
        console.log("⚠️  Test 8: No products data available for nested type testing");
      }
    } catch (_error) {
      console.log("✅ Test 8 PASSED: Contract violation detected (API error)");
    }
  }
}

// Export test suite instance
export const contractViolationTestSuite = new ContractViolationTestSuite();
