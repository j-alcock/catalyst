import { enhancedContractValidation } from "./enhanced-contract-validation";
// import { createContractAwareClient } from "../heyapi/contract-aware-client";

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface LoadTestResult {
  testName: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgThroughput: number;
  metrics: PerformanceMetrics[];
  contractViolations: number;
}

export class PerformanceContractTests {
  private client: any;
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the performance test suite
   */
  async initialize(): Promise<void> {
    await enhancedContractValidation.initialize();
    // this.client = await createContractAwareClient({
    //   baseUrl: this.baseUrl,
    // });
  }

  /**
   * Measure response time for a single request
   */
  private async measureResponseTime(
    endpoint: string,
    method: string,
    body?: any
  ): Promise<{ responseTime: number; success: boolean; error?: string }> {
    const startTime = performance.now();

    try {
      const response = await this.client.request(endpoint, {
        method,
        body,
      });

      const responseTime = performance.now() - startTime;

      // Validate contract compliance
      const validation = enhancedContractValidation.validateResponse(
        endpoint,
        method,
        response.data
      );

      if (!validation.success) {
        return {
          responseTime,
          success: false,
          error: `Contract violation: ${validation.errors?.message}`,
        };
      }

      return { responseTime, success: true };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Calculate performance metrics from response times
   */
  private calculateMetrics(
    responseTimes: number[],
    endpoint: string,
    method: string,
    totalRequests: number,
    successfulRequests: number,
    failedRequests: number,
    duration: number
  ): PerformanceMetrics {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const avgResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = sortedTimes[0];
    const maxResponseTime = sortedTimes[sortedTimes.length - 1];
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      endpoint,
      method,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime: sortedTimes[p95Index] || avgResponseTime,
      p99ResponseTime: sortedTimes[p99Index] || avgResponseTime,
      throughput: totalRequests / (duration / 1000),
      errorRate: (failedRequests / totalRequests) * 100,
      totalRequests,
      successfulRequests,
      failedRequests,
    };
  }

  /**
   * Run load test for a specific endpoint
   */
  async runLoadTest(
    endpoint: string,
    method: string,
    concurrency: number = 10,
    duration: number = 30000, // 30 seconds
    body?: any
  ): Promise<LoadTestResult> {
    console.log(`🚀 Running load test for ${method} ${endpoint}`);
    console.log(`   Concurrency: ${concurrency}, Duration: ${duration}ms`);

    const startTime = Date.now();
    const responseTimes: number[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let contractViolations = 0;

    // Create concurrent workers
    const workers = Array.from({ length: concurrency }, async () => {
      const endTime = startTime + duration;

      while (Date.now() < endTime) {
        const result = await this.measureResponseTime(endpoint, method, body);

        responseTimes.push(result.responseTime);
        totalRequests++;

        if (result.success) {
          successfulRequests++;
        } else {
          failedRequests++;
          if (result.error?.includes("Contract violation")) {
            contractViolations++;
          }
        }

        // Small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    // Wait for all workers to complete
    await Promise.all(workers);

    const actualDuration = Date.now() - startTime;
    const metrics = this.calculateMetrics(
      responseTimes,
      endpoint,
      method,
      totalRequests,
      successfulRequests,
      failedRequests,
      actualDuration
    );

    return {
      testName: `${method} ${endpoint} Load Test`,
      duration: actualDuration,
      totalRequests,
      successfulRequests,
      failedRequests,
      avgThroughput: metrics.throughput,
      metrics: [metrics],
      contractViolations,
    };
  }

  /**
   * Run stress test with increasing load
   */
  async runStressTest(
    endpoint: string,
    method: string,
    maxConcurrency: number = 100,
    stepDuration: number = 10000, // 10 seconds per step
    body?: any
  ): Promise<LoadTestResult[]> {
    console.log(`🔥 Running stress test for ${method} ${endpoint}`);
    console.log(
      `   Max Concurrency: ${maxConcurrency}, Step Duration: ${stepDuration}ms`
    );

    const results: LoadTestResult[] = [];
    const concurrencySteps = [1, 5, 10, 25, 50, 75, 100].filter(
      (c) => c <= maxConcurrency
    );

    for (const concurrency of concurrencySteps) {
      console.log(`   Testing with ${concurrency} concurrent users...`);

      const result = await this.runLoadTest(
        endpoint,
        method,
        concurrency,
        stepDuration,
        body
      );

      results.push(result);

      // Check if we should stop due to high error rate
      if (result.metrics[0].errorRate > 50) {
        console.log(
          `   ⚠️  High error rate (${result.metrics[0].errorRate.toFixed(1)}%), stopping stress test`
        );
        break;
      }

      // Brief pause between steps
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Run contract validation performance test
   */
  async testContractValidationPerformance(): Promise<LoadTestResult> {
    console.log("⚡ Testing Contract Validation Performance");

    const testData = {
      name: "Performance Test Product",
      description: "A product for performance testing",
      price: 29.99,
      stockQuantity: 100,
      categoryId: "123e4567-e89b-12d3-a456-426614174001",
    };

    const startTime = Date.now();
    const iterations = 1000;
    const responseTimes: number[] = [];
    let contractViolations = 0;

    for (let i = 0; i < iterations; i++) {
      const validationStart = performance.now();

      try {
        const validation = enhancedContractValidation.validateRequest(
          "/api/products",
          "POST",
          testData
        );

        if (!validation.success) {
          contractViolations++;
        }
      } catch (_error) {
        contractViolations++;
      }

      const validationTime = performance.now() - validationStart;
      responseTimes.push(validationTime);
    }

    const duration = Date.now() - startTime;
    const metrics = this.calculateMetrics(
      responseTimes,
      "Contract Validation",
      "POST",
      iterations,
      iterations - contractViolations,
      contractViolations,
      duration
    );

    return {
      testName: "Contract Validation Performance Test",
      duration,
      totalRequests: iterations,
      successfulRequests: iterations - contractViolations,
      failedRequests: contractViolations,
      avgThroughput: metrics.throughput,
      metrics: [metrics],
      contractViolations,
    };
  }

  /**
   * Run comprehensive performance test suite
   */
  async runPerformanceTestSuite(): Promise<LoadTestResult[]> {
    console.log("📊 Running Comprehensive Performance Test Suite");
    console.log("=".repeat(60));

    const results: LoadTestResult[] = [];

    // Test contract validation performance
    results.push(await this.testContractValidationPerformance());

    // Test GET endpoints
    results.push(await this.runLoadTest("/api/products", "GET"));
    results.push(await this.runLoadTest("/api/categories", "GET"));

    // Test POST endpoints with sample data
    const productData = {
      name: "Performance Test Product",
      description: "A product for performance testing",
      price: 29.99,
      stockQuantity: 100,
      categoryId: "123e4567-e89b-12d3-a456-426614174001",
    };

    const userData = {
      name: "Performance Test User",
      email: "perf.test@example.com",
      password: "testpassword123",
      picture: "https://example.com/avatar.jpg",
    };

    results.push(await this.runLoadTest("/api/products", "POST", 5, 15000, productData));
    results.push(await this.runLoadTest("/api/users", "POST", 5, 15000, userData));

    // Run stress test on products endpoint
    const stressResults = await this.runStressTest("/api/products", "GET");
    results.push(...stressResults);

    // Print summary
    console.log("\n📈 Performance Test Summary:");
    console.log("=".repeat(60));

    let totalRequests = 0;
    let totalSuccessful = 0;
    let _totalFailed = 0;
    let totalContractViolations = 0;

    for (const result of results) {
      totalRequests += result.totalRequests;
      totalSuccessful += result.successfulRequests;
      _totalFailed += result.failedRequests;
      totalContractViolations += result.contractViolations;

      console.log(`\n${result.testName}:`);
      console.log(`  Requests: ${result.totalRequests}`);
      console.log(
        `  Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`
      );
      console.log(`  Avg Throughput: ${result.avgThroughput.toFixed(1)} req/s`);
      console.log(`  Contract Violations: ${result.contractViolations}`);

      if (result.metrics.length > 0) {
        const metric = result.metrics[0];
        console.log(`  Avg Response Time: ${metric.avgResponseTime.toFixed(2)}ms`);
        console.log(`  P95 Response Time: ${metric.p95ResponseTime.toFixed(2)}ms`);
      }
    }

    console.log(`\n🎯 Overall Summary:`);
    console.log(`  Total Requests: ${totalRequests}`);
    console.log(
      `  Overall Success Rate: ${((totalSuccessful / totalRequests) * 100).toFixed(1)}%`
    );
    console.log(`  Total Contract Violations: ${totalContractViolations}`);
    console.log(
      `  Contract Compliance Rate: ${(((totalRequests - totalContractViolations) / totalRequests) * 100).toFixed(1)}%`
    );

    return results;
  }
}

// Export singleton instance
export const performanceTests = new PerformanceContractTests();
