import { z } from "zod";

export interface ContractTestResult {
  success: boolean;
  endpoint: string;
  method: string;
  statusCode: number;
  errors: string[];
  responseTime?: number;
}

export class ContractTester {
  private results: ContractTestResult[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an HTTP request and validate the response
   */
  async testEndpoint<T>(
    endpoint: string,
    method: string = "GET",
    schema: z.ZodSchema<T>,
    body?: any,
    expectedStatusCodes: number[] = [200, 201]
  ): Promise<ContractTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json();

      // Check if status code is in expected range
      if (!expectedStatusCodes.includes(response.status)) {
        errors.push(
          `Unexpected status code: ${response.status}. Expected one of: ${expectedStatusCodes.join(", ")}`
        );
      }

      // Validate the response data against the schema
      try {
        schema.parse(responseData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(`Schema validation failed: ${error.message}`);
          error.errors.forEach((err) => {
            errors.push(`  - ${err.path.join(".")}: ${err.message}`);
          });
        } else {
          errors.push(`Unexpected error: ${error}`);
        }
      }

      const result: ContractTestResult = {
        success: errors.length === 0,
        endpoint,
        method,
        statusCode: response.status,
        errors,
        responseTime,
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: ContractTestResult = {
        success: false,
        endpoint,
        method,
        statusCode: 0,
        errors: [`Request failed: ${error}`],
        responseTime,
      };

      this.results.push(result);
      return result;
    }
  }

  /**
   * Validate API response against a Zod schema
   */
  validateResponse<T>(
    endpoint: string,
    method: string,
    statusCode: number,
    responseData: any,
    schema: z.ZodSchema<T>,
    responseTime?: number
  ): ContractTestResult {
    const errors: string[] = [];

    try {
      // Validate the response data against the schema
      schema.parse(responseData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(`Schema validation failed: ${error.message}`);
        error.errors.forEach((err) => {
          errors.push(`  - ${err.path.join(".")}: ${err.message}`);
        });
      } else {
        errors.push(`Unexpected error: ${error}`);
      }
    }

    const result: ContractTestResult = {
      success: errors.length === 0,
      endpoint,
      method,
      statusCode,
      errors,
      responseTime,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Validate error response
   */
  validateErrorResponse(
    endpoint: string,
    method: string,
    statusCode: number,
    responseData: any,
    expectedStatusCodes: number[] = [400, 404, 409, 500],
    responseTime?: number
  ): ContractTestResult {
    const errors: string[] = [];

    // Check if status code is in expected error range
    if (!expectedStatusCodes.includes(statusCode)) {
      errors.push(
        `Unexpected status code: ${statusCode}. Expected one of: ${expectedStatusCodes.join(", ")}`
      );
    }

    // Validate error response structure
    try {
      z.object({
        error: z.string().min(1),
      }).parse(responseData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(`Error response validation failed: ${error.message}`);
      }
    }

    const result: ContractTestResult = {
      success: errors.length === 0,
      endpoint,
      method,
      statusCode,
      errors,
      responseTime,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Get all test results
   */
  getResults(): ContractTestResult[] {
    return this.results;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.success).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      successRate,
    };
  }

  /**
   * Print test results
   */
  printResults(): void {
    console.log("\n📋 Contract Test Results:");
    console.log("=".repeat(50));

    this.results.forEach((result, index) => {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${index + 1}. ${status} ${result.method} ${result.endpoint} (${result.statusCode})`
      );

      if (result.responseTime) {
        console.log(`   ⏱️  Response time: ${result.responseTime}ms`);
      }

      if (!result.success && result.errors.length > 0) {
        console.log("   Errors:");
        result.errors.forEach((error) => {
          console.log(`     - ${error}`);
        });
      }
    });

    const summary = this.getSummary();
    console.log("\n📊 Summary:");
    console.log(`   Total tests: ${summary.total}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Success rate: ${summary.successRate.toFixed(1)}%`);

    if (summary.failed > 0) {
      console.log("\n❌ Contract violations detected!");
      console.log("Please fix the API responses to match the expected schemas.");
    } else {
      console.log("\n✅ All contract tests passed!");
    }
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }
}

// Global instance for easy access
export const contractTester = new ContractTester();
