#!/usr/bin/env tsx

import { createAutoContractTester } from "./auto-contract-tester";
import { contractTester } from "./contract-tester";

async function main() {
  console.log("🤖 Auto-Generated Contract Test Runner");
  console.log("=".repeat(50));

  // Configuration
  const config = {
    baseUrl: process.env.API_BASE_URL || "http://localhost:3000",
    timeout: parseInt(process.env.TEST_TIMEOUT || "5000"),
    includeValidationTests: process.env.INCLUDE_VALIDATION !== "false",
    includeErrorTests: process.env.INCLUDE_ERROR_TESTS !== "false",
    includePerformanceTests: process.env.INCLUDE_PERFORMANCE !== "false",
  };

  console.log("📋 Configuration:");
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Timeout: ${config.timeout}ms`);
  console.log(`   Validation Tests: ${config.includeValidationTests ? "✅" : "❌"}`);
  console.log(`   Error Tests: ${config.includeErrorTests ? "✅" : "❌"}`);
  console.log(`   Performance Tests: ${config.includePerformanceTests ? "✅" : "❌"}`);

  try {
    // Create auto tester
    const autoTester = createAutoContractTester(config);

    // Run all tests
    const _results = await autoTester.generateAndRunTests();

    // Print results
    contractTester.printResults();

    // Get summary
    const summary = autoTester.getSummary();
    console.log("\n📊 Auto-Generated Test Summary:");
    console.log(`   Total Endpoints Tested: ${summary.totalEndpoints}`);
    console.log(`   Total Tests Run: ${summary.totalTests}`);
    console.log(
      `   Success Rate: ${((summary.results.filter((r) => r.success).length / summary.totalTests) * 100).toFixed(1)}%`
    );

    // Exit with appropriate code
    const failedTests = summary.results.filter((r) => !r.success).length;
    if (failedTests > 0) {
      console.log(`\n❌ ${failedTests} tests failed. Contract violations detected!`);
      process.exit(1);
    } else {
      console.log("\n✅ All auto-generated contract tests passed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("\n💥 Fatal error running auto-generated tests:", error);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
🤖 Auto-Generated Contract Test Runner

Usage: tsx run-auto-contract-tests.ts [options]

Options:
  --base-url <url>           API base URL (default: http://localhost:3000)
  --timeout <ms>             Request timeout in milliseconds (default: 5000)
  --no-validation            Skip schema validation tests
  --no-error-tests           Skip error scenario tests
  --no-performance           Skip performance tests
  --help, -h                 Show this help message

Environment Variables:
  API_BASE_URL               API base URL
  TEST_TIMEOUT               Request timeout in milliseconds
  INCLUDE_VALIDATION         Include validation tests (true/false)
  INCLUDE_ERROR_TESTS        Include error tests (true/false)
  INCLUDE_PERFORMANCE        Include performance tests (true/false)

Examples:
  # Run with default settings
  tsx run-auto-contract-tests.ts

  # Run against staging API
  API_BASE_URL=https://staging-api.example.com tsx run-auto-contract-tests.ts

  # Run only validation tests
  tsx run-auto-contract-tests.ts --no-error-tests --no-performance

  # Run with custom timeout
  tsx run-auto-contract-tests.ts --timeout 10000
`);
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--base-url":
      process.env.API_BASE_URL = args[++i];
      break;
    case "--timeout":
      process.env.TEST_TIMEOUT = args[++i];
      break;
    case "--no-validation":
      process.env.INCLUDE_VALIDATION = "false";
      break;
    case "--no-error-tests":
      process.env.INCLUDE_ERROR_TESTS = "false";
      break;
    case "--no-performance":
      process.env.INCLUDE_PERFORMANCE = "false";
      break;
  }
}

// Run the main function
main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
