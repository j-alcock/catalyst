import fc from "fast-check";
import { z } from "zod";
// import { createContractAwareClient } from "../heyapi/contract-aware-client";
import { enhancedContractValidation } from "./enhanced-contract-validation";

export interface PropertyTestResult {
  success: boolean;
  testName: string;
  iterations: number;
  errors: string[];
  executionTime: number;
}

export class PropertyBasedContractTests {
  private client: any;
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the test suite
   */
  async initialize(): Promise<void> {
    await enhancedContractValidation.initialize();
    // this.client = await createContractAwareClient({
    //   baseUrl: this.baseUrl,
    // });
  }

  /**
   * Test product creation with property-based testing
   */
  async testProductCreation(): Promise<PropertyTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.float({ min: 0.01, max: 10000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.uuid(),
          async (name, price, stockQuantity, categoryId) => {
            try {
              const response = await this.client.post("/api/products", {
                body: { name, price, stockQuantity, categoryId },
              });

              // Verify contract compliance
              const validation = enhancedContractValidation.validateResponse(
                "/api/products",
                "POST",
                response.data
              );

              if (!validation.success) {
                throw new Error(
                  `Response validation failed: ${validation.errors?.message}`
                );
              }

              // Verify data integrity
              if (response.data.name !== name) {
                throw new Error(
                  `Name mismatch: expected ${name}, got ${response.data.name}`
                );
              }

              if (response.data.price !== price) {
                throw new Error(
                  `Price mismatch: expected ${price}, got ${response.data.price}`
                );
              }

              if (response.data.stockQuantity !== stockQuantity) {
                throw new Error(
                  `Stock quantity mismatch: expected ${stockQuantity}, got ${response.data.stockQuantity}`
                );
              }

              if (response.data.categoryId !== categoryId) {
                throw new Error(
                  `Category ID mismatch: expected ${categoryId}, got ${response.data.categoryId}`
                );
              }

              // Verify schema compliance
              const productSchema = enhancedContractValidation.getSchemaByName("Product");
              if (productSchema) {
                productSchema.parse(response.data);
              }
            } catch (error) {
              throw new Error(`Product creation failed: ${error}`);
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );

      return {
        success: true,
        testName: "Product Creation Property Test",
        iterations: 100,
        errors: [],
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        testName: "Product Creation Property Test",
        iterations: 100,
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test user creation with property-based testing
   */
  async testUserCreation(): Promise<PropertyTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 100 }),
          fc.webUrl(),
          async (name, email, password, picture) => {
            try {
              const response = await this.client.post("/api/users", {
                body: { name, email, password, picture },
              });

              // Verify contract compliance
              const validation = enhancedContractValidation.validateResponse(
                "/api/users",
                "POST",
                response.data
              );

              if (!validation.success) {
                throw new Error(
                  `Response validation failed: ${validation.errors?.message}`
                );
              }

              // Verify data integrity
              if (response.data.name !== name) {
                throw new Error(
                  `Name mismatch: expected ${name}, got ${response.data.name}`
                );
              }

              if (response.data.email !== email) {
                throw new Error(
                  `Email mismatch: expected ${email}, got ${response.data.email}`
                );
              }

              if (response.data.picture !== picture) {
                throw new Error(
                  `Picture mismatch: expected ${picture}, got ${response.data.picture}`
                );
              }

              // Verify schema compliance
              const userSchema = enhancedContractValidation.getSchemaByName("User");
              if (userSchema) {
                userSchema.parse(response.data);
              }
            } catch (error) {
              throw new Error(`User creation failed: ${error}`);
            }
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );

      return {
        success: true,
        testName: "User Creation Property Test",
        iterations: 50,
        errors: [],
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        testName: "User Creation Property Test",
        iterations: 50,
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test order creation with property-based testing
   */
  async testOrderCreation(): Promise<PropertyTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom("PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"),
          fc.float({ min: 0.01, max: 10000 }),
          async (userId, status, totalAmount) => {
            try {
              const response = await this.client.post("/api/orders", {
                body: { userId, status, totalAmount },
              });

              // Verify contract compliance
              const validation = enhancedContractValidation.validateResponse(
                "/api/orders",
                "POST",
                response.data
              );

              if (!validation.success) {
                throw new Error(
                  `Response validation failed: ${validation.errors?.message}`
                );
              }

              // Verify data integrity
              if (response.data.userId !== userId) {
                throw new Error(
                  `User ID mismatch: expected ${userId}, got ${response.data.userId}`
                );
              }

              if (response.data.status !== status) {
                throw new Error(
                  `Status mismatch: expected ${status}, got ${response.data.status}`
                );
              }

              if (response.data.totalAmount !== totalAmount) {
                throw new Error(
                  `Total amount mismatch: expected ${totalAmount}, got ${response.data.totalAmount}`
                );
              }

              // Verify schema compliance
              const orderSchema = enhancedContractValidation.getSchemaByName("Order");
              if (orderSchema) {
                orderSchema.parse(response.data);
              }
            } catch (error) {
              throw new Error(`Order creation failed: ${error}`);
            }
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );

      return {
        success: true,
        testName: "Order Creation Property Test",
        iterations: 50,
        errors: [],
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        testName: "Order Creation Property Test",
        iterations: 50,
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test boundary values for product creation
   */
  async testProductBoundaryValues(): Promise<PropertyTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom("", "a".repeat(101)), // Empty string and too long
          fc.constantFrom(-1, 0, 10001), // Invalid prices
          fc.constantFrom(-1, 10001), // Invalid stock quantities
          fc.constantFrom("invalid-uuid", "not-a-uuid"), // Invalid UUIDs
          async (name, price, stockQuantity, categoryId) => {
            try {
              await this.client.post("/api/products", {
                body: { name, price, stockQuantity, categoryId },
              });

              // If we get here, the API accepted invalid data
              throw new Error(
                `API accepted invalid data: name=${name}, price=${price}, stockQuantity=${stockQuantity}, categoryId=${categoryId}`
              );
            } catch (error) {
              // Expected to fail for invalid data
              if (error instanceof Error && error.message.includes("400")) {
                return; // Expected behavior
              }
              throw new Error(`Unexpected error for invalid data: ${error}`);
            }
          }
        ),
        { numRuns: 20, timeout: 10000 }
      );

      return {
        success: true,
        testName: "Product Boundary Values Test",
        iterations: 20,
        errors: [],
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        testName: "Product Boundary Values Test",
        iterations: 20,
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test schema round-trip validation
   */
  async testSchemaRoundTrip(): Promise<PropertyTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const productSchema = enhancedContractValidation.getSchemaByName("Product");

      if (productSchema) {
        await fc.assert(
          fc.asyncProperty(fc.anything(), async (data) => {
            try {
              // Parse with schema
              const parsed = productSchema.parse(data);

              // Serialize and parse again
              const serialized = JSON.parse(JSON.stringify(parsed));
              const reparsed = productSchema.parse(serialized);

              // Verify round-trip integrity
              if (JSON.stringify(parsed) !== JSON.stringify(reparsed)) {
                throw new Error(`Round-trip validation failed for Product schema`);
              }
            } catch (error) {
              // Expected for invalid data
              if (error instanceof z.ZodError) {
                return; // Expected behavior
              }
              throw new Error(`Unexpected error in schema round-trip: ${error}`);
            }
          }),
          { numRuns: 50, timeout: 5000 }
        );
      }

      return {
        success: true,
        testName: "Schema Round-Trip Test",
        iterations: 50,
        errors: [],
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        testName: "Schema Round-Trip Test",
        iterations: 0,
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Run all property-based tests
   */
  async runAllTests(): Promise<PropertyTestResult[]> {
    console.log("🧪 Running Property-Based Contract Tests...");
    console.log("=".repeat(60));

    const results: PropertyTestResult[] = [];

    // Run all property tests
    results.push(await this.testProductCreation());
    results.push(await this.testUserCreation());
    results.push(await this.testOrderCreation());
    results.push(await this.testProductBoundaryValues());
    results.push(await this.testSchemaRoundTrip());

    // Print results
    console.log("\n📊 Property-Based Test Results:");
    console.log("=".repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    for (const result of results) {
      totalTests++;
      if (result.success) {
        passedTests++;
        console.log(`✅ ${result.testName}`);
        console.log(`   Iterations: ${result.iterations}`);
        console.log(`   Execution Time: ${result.executionTime}ms`);
      } else {
        console.log(`❌ ${result.testName}`);
        console.log(`   Errors: ${result.errors.join(", ")}`);
        console.log(`   Execution Time: ${result.executionTime}ms`);
      }
      console.log("");
    }

    console.log(`📈 Summary: ${passedTests}/${totalTests} tests passed`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    return results;
  }
}

// Export singleton instance
export const propertyBasedTests = new PropertyBasedContractTests();
