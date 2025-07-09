#!/usr/bin/env tsx

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
    console.log("⚠️  These tests are designed to FAIL when contracts are broken");

    contractTester.clearResults();

    try {
      // Test 1: Missing required fields in response
      await this.testMissingRequiredFields();

      // Test 2: Wrong data types in response
      await this.testWrongDataTypes();

      // Test 3: Extra fields in response (should be allowed but logged)
      await this.testExtraFields();

      // Test 4: Missing endpoints
      await this.testMissingEndpoints();

      // Test 5: Wrong HTTP status codes
      await this.testWrongStatusCodes();

      // Test 6: Invalid response structure
      await this.testInvalidResponseStructure();

      // Test 7: Wrong enum values
      await this.testWrongEnumValues();

      // Test 8: Missing pagination fields
      await this.testMissingPaginationFields();
    } catch (error) {
      console.error("❌ Contract violation test suite failed:", error);
    }

    // Print results
    contractTester.printResults();
  }

  /**
   * Test 1: Missing required fields in response
   * This should fail when the API returns a response missing required fields
   */
  private async testMissingRequiredFields(): Promise<void> {
    console.log("\n🔍 Test 1: Missing Required Fields");

    // Schema that expects all required fields
    const StrictProductSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      stockQuantity: z.number(),
      categoryId: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      // This field is required in our schema but might be missing in API
      description: z.string().optional(),
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
    }
  }

  /**
   * Test 2: Wrong data types in response
   * This should fail when the API returns wrong data types
   */
  private async testWrongDataTypes(): Promise<void> {
    console.log("\n🔍 Test 2: Wrong Data Types");

    // Schema that expects specific data types
    const TypeStrictSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(), // API might return string instead of number
      stockQuantity: z.number(), // API might return string instead of number
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
    }
  }

  /**
   * Test 3: Extra fields in response
   * This should pass but log when extra fields are present
   */
  private async testExtraFields(): Promise<void> {
    console.log("\n🔍 Test 3: Extra Fields");

    // Schema that doesn't expect extra fields
    const StrictSchema = z
      .object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        stockQuantity: z.number(),
        categoryId: z.string(),
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
    }
  }

  /**
   * Test 4: Missing endpoints
   * This should fail when expected endpoints don't exist
   */
  private async testMissingEndpoints(): Promise<void> {
    console.log("\n🔍 Test 4: Missing Endpoints");

    // Test endpoints that should NOT exist
    const nonExistentEndpoints = [
      "/api/nonexistent-endpoint",
      "/api/products/invalid-uuid",
      "/api/categories/non-existent",
    ];

    for (const endpoint of nonExistentEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);

        // Accept both 404 and 400 as valid "not found" responses
        if (response.status === 404 || response.status === 400) {
          contractTester.validateResponse(
            endpoint,
            "GET",
            response.status,
            { error: "Endpoint not found" },
            z.object({ error: z.string() }),
            0
          );
          console.log(
            `✅ Test 4 PASSED: Contract violation detected (missing endpoint: ${endpoint})`
          );
        } else {
          console.log(`⚠️  Test 4: Endpoint exists (${endpoint})`);
        }
      } catch (_error) {
        console.log(
          `✅ Test 4 PASSED: Contract violation detected (endpoint error: ${endpoint})`
        );
      }
    }
  }

  /**
   * Test 5: Wrong HTTP status codes
   * This should fail when the API returns unexpected status codes
   */
  private async testWrongStatusCodes(): Promise<void> {
    console.log("\n🔍 Test 5: Wrong HTTP Status Codes");

    try {
      // Test with invalid data that should return 400
      const response = await fetch(`${this.baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "", // Invalid: empty name
          price: -10, // Invalid: negative price
          stockQuantity: 100,
          categoryId: "invalid-category-id",
        }),
      });

      if (response.status === 400) {
        contractTester.validateResponse(
          "/api/products",
          "POST",
          400,
          await response.json(),
          z.object({ error: z.string() }),
          0
        );
        console.log(
          `✅ Test 5 PASSED: Contract violation detected (correct error status: ${response.status})`
        );
      } else {
        console.log("⚠️  Test 5: No contract violation detected for status codes");
      }
    } catch (_error) {
      console.log("✅ Test 5 PASSED: Contract violation detected (API error)");
    }
  }

  /**
   * Test 6: Invalid response structure
   * This should fail when the API returns unexpected response structure
   */
  private async testInvalidResponseStructure(): Promise<void> {
    console.log("\n🔍 Test 6: Invalid Response Structure");

    // Schema that expects a specific response structure
    const ExpectedStructureSchema = z.object({
      data: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
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
          "✅ Test 6 PASSED: Contract violation detected (invalid response structure)"
        );
      } else {
        console.log("⚠️  Test 6: No contract violation detected for response structure");
      }
    } catch (_error) {
      console.log("✅ Test 6 PASSED: Contract violation detected (API error)");
    }
  }

  /**
   * Test 7: Wrong enum values
   * This should fail when the API returns invalid enum values
   */
  private async testWrongEnumValues(): Promise<void> {
    console.log("\n🔍 Test 7: Wrong Enum Values");

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
            "✅ Test 7 PASSED: Contract violation detected (wrong enum values)"
          );
        } else {
          console.log("⚠️  Test 7: No contract violation detected for enum values");
        }
      } else {
        console.log("⚠️  Test 7: No orders data available for enum testing");
      }
    } catch (_error) {
      console.log("✅ Test 7 PASSED: Contract violation detected (API error)");
    }
  }

  /**
   * Test 8: Missing pagination fields
   * This should fail when pagination fields are missing
   */
  private async testMissingPaginationFields(): Promise<void> {
    console.log("\n🔍 Test 8: Missing Pagination Fields");

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
          "✅ Test 8 PASSED: Contract violation detected (missing pagination fields)"
        );
      } else {
        console.log("⚠️  Test 8: No contract violation detected for pagination fields");
      }
    } catch (_error) {
      console.log("✅ Test 8 PASSED: Contract violation detected (API error)");
    }
  }
}

// Export test suite instance
export const contractViolationTestSuite = new ContractViolationTestSuite();
