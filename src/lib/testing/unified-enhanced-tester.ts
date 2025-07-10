import { contractEvolutionTests } from "./contract-evolution-tests";
import { enhancedContractValidation } from "./enhanced-contract-validation";
import { performanceTests } from "./performance-tests";
import { propertyBasedTests } from "./property-based-tests";
// Import the function directly since it's not exported
import "./run-dynamic-contract-tests";

export interface TestSuiteResult {
  suiteName: string;
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  executionTime: number;
  details?: any;
}

export interface UnifiedTestResult {
  timestamp: Date;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  executionTime: number;
  suites: TestSuiteResult[];
  contractViolations: number;
  performanceMetrics?: any;
}

export class UnifiedEnhancedTester {
  private isInitialized = false;

  /**
   * Initialize the unified test system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initializing Enhanced Unified Contract Testing System...");

    await enhancedContractValidation.initialize();
    await propertyBasedTests.initialize();
    await performanceTests.initialize();

    this.isInitialized = true;
    console.log("✅ Enhanced Unified Contract Testing System initialized");
  }

  /**
   * Run basic contract tests
   */
  async runBasicContractTests(): Promise<TestSuiteResult> {
    console.log("\n📋 Running Basic Contract Tests...");
    const startTime = Date.now();

    try {
      // Run basic schema validation tests
      const results = await this.runBasicTests();

      const passedTests = results.filter((r: any) => r.success).length;
      const failedTests = results.filter((r: any) => !r.success).length;
      const totalTests = results.length;

      return {
        suiteName: "Basic Contract Tests",
        success: failedTests === 0,
        totalTests,
        passedTests,
        failedTests,
        executionTime: Date.now() - startTime,
        details: results,
      };
    } catch (error) {
      return {
        suiteName: "Basic Contract Tests",
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Run basic tests
   */
  private async runBasicTests(): Promise<any[]> {
    const results: any[] = [];

    // Test schema validation
    const productSchema = enhancedContractValidation.getSchemaByName("Product");
    if (productSchema) {
      const validProduct = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        description: "A test product",
        price: 29.99,
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
      };

      try {
        productSchema.parse(validProduct);
        results.push({ test: "Valid Product Schema", success: true });
      } catch (error) {
        results.push({ test: "Valid Product Schema", success: false, error });
      }
    }

    // Test request validation
    const requestValidation = enhancedContractValidation.validateRequest(
      "/api/products",
      "POST",
      {
        name: "Test",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
      }
    );
    results.push({ test: "Request Validation", success: requestValidation.success });

    // Test response validation
    const responseValidation = enhancedContractValidation.validateResponse(
      "/api/products",
      "GET",
      []
    );
    results.push({ test: "Response Validation", success: responseValidation.success });

    return results;
  }

  /**
   * Run property-based tests
   */
  async runPropertyBasedTests(): Promise<TestSuiteResult> {
    console.log("\n🧪 Running Property-Based Tests...");
    const startTime = Date.now();

    try {
      const results = await propertyBasedTests.runAllTests();

      const passedTests = results.filter((r) => r.success).length;
      const failedTests = results.filter((r) => !r.success).length;
      const totalTests = results.length;

      return {
        suiteName: "Property-Based Tests",
        success: failedTests === 0,
        totalTests,
        passedTests,
        failedTests,
        executionTime: Date.now() - startTime,
        details: results,
      };
    } catch (error) {
      return {
        suiteName: "Property-Based Tests",
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests(): Promise<TestSuiteResult> {
    console.log("\n⚡ Running Performance Tests...");
    const startTime = Date.now();

    try {
      const results = await performanceTests.runPerformanceTestSuite();

      const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
      const successfulRequests = results.reduce(
        (sum, r) => sum + r.successfulRequests,
        0
      );
      const failedRequests = results.reduce((sum, r) => sum + r.failedRequests, 0);
      const contractViolations = results.reduce(
        (sum, r) => sum + r.contractViolations,
        0
      );

      const successRate = (successfulRequests / totalRequests) * 100;
      const isSuccess = successRate >= 95; // 95% success rate threshold

      return {
        suiteName: "Performance Tests",
        success: isSuccess,
        totalTests: results.length,
        passedTests: isSuccess ? results.length : 0,
        failedTests: isSuccess ? 0 : 1,
        executionTime: Date.now() - startTime,
        details: {
          results,
          totalRequests,
          successfulRequests,
          failedRequests,
          contractViolations,
          successRate,
        },
      };
    } catch (error) {
      return {
        suiteName: "Performance Tests",
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Run schema validation tests
   */
  async runSchemaValidationTests(): Promise<TestSuiteResult> {
    console.log("\n🔍 Running Schema Validation Tests...");
    const startTime = Date.now();

    try {
      const schemas = enhancedContractValidation.getSchemaByName("Product");
      let passedTests = 0;
      let failedTests = 0;
      const testResults: any[] = [];

      // Test valid data
      const validProduct = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        description: "A test product",
        price: 29.99,
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
      };

      try {
        if (schemas) {
          schemas.parse(validProduct);
          passedTests++;
          testResults.push({ test: "Valid Product Schema", success: true });
        }
      } catch (error) {
        failedTests++;
        testResults.push({ test: "Valid Product Schema", success: false, error });
      }

      // Test invalid data
      const invalidProduct = {
        id: "invalid-uuid",
        name: "",
        price: -1,
        stockQuantity: -1,
      };

      try {
        if (schemas) {
          schemas.parse(invalidProduct);
          failedTests++; // Should have failed
          testResults.push({
            test: "Invalid Product Schema",
            success: false,
            error: "Expected validation to fail",
          });
        }
      } catch (_error) {
        passedTests++; // Expected to fail
        testResults.push({ test: "Invalid Product Schema", success: true });
      }

      return {
        suiteName: "Schema Validation Tests",
        success: failedTests === 0,
        totalTests: passedTests + failedTests,
        passedTests,
        failedTests,
        executionTime: Date.now() - startTime,
        details: testResults,
      };
    } catch (error) {
      return {
        suiteName: "Schema Validation Tests",
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Run contract evolution tests
   */
  async runContractEvolutionTests(): Promise<TestSuiteResult> {
    console.log("\n🔄 Running Contract Evolution Tests...");
    const startTime = Date.now();

    try {
      const results = await contractEvolutionTests.runAllEvolutionTests();

      const passedTests = results.filter((r) => r.success).length;
      const failedTests = results.filter((r) => !r.success).length;
      const totalTests = results.length;

      return {
        suiteName: "Contract Evolution Tests",
        success: failedTests === 0,
        totalTests,
        passedTests,
        failedTests,
        executionTime: Date.now() - startTime,
        details: results,
      };
    } catch (error) {
      return {
        suiteName: "Contract Evolution Tests",
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Run contract violation tests
   */
  async runContractViolationTests(): Promise<TestSuiteResult> {
    console.log("\n🚨 Running Contract Violation Tests...");
    const startTime = Date.now();

    try {
      let passedTests = 0;
      let failedTests = 0;
      const testResults: any[] = [];

      // Clear previous violations
      enhancedContractValidation.clearViolations();

      // Test request validation
      const invalidRequest = {
        name: "", // Invalid: empty name
        price: -1, // Invalid: negative price
        stockQuantity: -1, // Invalid: negative stock
        categoryId: "invalid-uuid", // Invalid: not a UUID
      };

      const requestValidation = enhancedContractValidation.validateRequest(
        "/api/products",
        "POST",
        invalidRequest
      );

      if (!requestValidation.success) {
        passedTests++;
        testResults.push({ test: "Invalid Request Validation", success: true });
      } else {
        failedTests++;
        testResults.push({
          test: "Invalid Request Validation",
          success: false,
          error: "Expected validation to fail",
        });
      }

      // Test response validation
      const invalidResponse = {
        id: "invalid-uuid",
        name: "",
        price: -1,
        stockQuantity: -1,
      };

      const responseValidation = enhancedContractValidation.validateResponse(
        "/api/products",
        "GET",
        invalidResponse
      );

      if (!responseValidation.success) {
        passedTests++;
        testResults.push({ test: "Invalid Response Validation", success: true });
      } else {
        failedTests++;
        testResults.push({
          test: "Invalid Response Validation",
          success: false,
          error: "Expected validation to fail",
        });
      }

      // Check violation recording
      const violations = enhancedContractValidation.getViolations();
      if (violations.length > 0) {
        passedTests++;
        testResults.push({
          test: "Violation Recording",
          success: true,
          violations: violations.length,
        });
      } else {
        failedTests++;
        testResults.push({
          test: "Violation Recording",
          success: false,
          error: "No violations recorded",
        });
      }

      return {
        suiteName: "Contract Violation Tests",
        success: failedTests === 0,
        totalTests: passedTests + failedTests,
        passedTests,
        failedTests,
        executionTime: Date.now() - startTime,
        details: testResults,
      };
    } catch (error) {
      return {
        suiteName: "Contract Violation Tests",
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<UnifiedTestResult> {
    await this.initialize();

    console.log("🎯 Running Enhanced Unified Contract Test Suite");
    console.log("=".repeat(60));

    const startTime = Date.now();
    const suites: TestSuiteResult[] = [];

    // Run all test suites
    suites.push(await this.runBasicContractTests());
    suites.push(await this.runPropertyBasedTests());
    suites.push(await this.runPerformanceTests());
    suites.push(await this.runSchemaValidationTests());
    suites.push(await this.runContractEvolutionTests());
    suites.push(await this.runContractViolationTests());

    // Calculate overall results
    const totalSuites = suites.length;
    const passedSuites = suites.filter((s) => s.success).length;
    const failedSuites = suites.filter((s) => !s.success).length;

    const totalTests = suites.reduce((sum, s) => sum + s.totalTests, 0);
    const passedTests = suites.reduce((sum, s) => sum + s.passedTests, 0);
    const failedTests = suites.reduce((sum, s) => sum + s.failedTests, 0);

    const contractViolations = enhancedContractValidation.getViolations().length;

    const result: UnifiedTestResult = {
      timestamp: new Date(),
      totalSuites,
      passedSuites,
      failedSuites,
      totalTests,
      passedTests,
      failedTests,
      executionTime: Date.now() - startTime,
      suites,
      contractViolations,
    };

    // Print comprehensive results
    this.printResults(result);

    return result;
  }

  /**
   * Print comprehensive test results
   */
  private printResults(result: UnifiedTestResult): void {
    console.log("\n📊 Enhanced Unified Contract Test Results");
    console.log("=".repeat(60));
    console.log(`Timestamp: ${result.timestamp.toISOString()}`);
    console.log(`Total Execution Time: ${result.executionTime}ms`);
    console.log("");

    // Suite summary
    console.log("🎯 Test Suite Summary:");
    console.log(`  Total Suites: ${result.totalSuites}`);
    console.log(`  Passed Suites: ${result.passedSuites}`);
    console.log(`  Failed Suites: ${result.failedSuites}`);
    console.log(
      `  Success Rate: ${((result.passedSuites / result.totalSuites) * 100).toFixed(1)}%`
    );
    console.log("");

    // Test summary
    console.log("📋 Test Summary:");
    console.log(`  Total Tests: ${result.totalTests}`);
    console.log(`  Passed Tests: ${result.passedTests}`);
    console.log(`  Failed Tests: ${result.failedTests}`);
    console.log(
      `  Success Rate: ${((result.passedTests / result.totalTests) * 100).toFixed(1)}%`
    );
    console.log("");

    // Contract violations
    console.log("🚨 Contract Violations:");
    console.log(`  Total Violations: ${result.contractViolations}`);
    console.log("");

    // Detailed suite results
    console.log("📝 Detailed Results:");
    for (const suite of result.suites) {
      const status = suite.success ? "✅" : "❌";
      console.log(`  ${status} ${suite.suiteName}`);
      console.log(`    Tests: ${suite.passedTests}/${suite.totalTests} passed`);
      console.log(`    Time: ${suite.executionTime}ms`);

      if (suite.details && suite.details.error) {
        console.log(`    Error: ${suite.details.error}`);
      }
      console.log("");
    }

    // Overall assessment
    const overallSuccess = result.failedSuites === 0;
    console.log(`🎉 Overall Result: ${overallSuccess ? "PASSED" : "FAILED"}`);

    if (overallSuccess) {
      console.log("✨ All test suites passed! Contract compliance verified.");
    } else {
      console.log("⚠️  Some test suites failed. Please review the results above.");
    }
  }

  /**
   * Get test statistics
   */
  getTestStats(): any {
    const violations = enhancedContractValidation.getViolations();
    const violationStats = enhancedContractValidation.getViolationStats();

    return {
      violations: violations.length,
      violationStats,
      endpoints: enhancedContractValidation.getEndpoints(),
      isInitialized: this.isInitialized,
    };
  }
}

// Export singleton instance
export const unifiedEnhancedTester = new UnifiedEnhancedTester();
