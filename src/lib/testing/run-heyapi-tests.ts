#!/usr/bin/env tsx

/**
 * HeyAPI Contract Test Runner
 *
 * This script runs contract tests using the HeyAPI generated client
 * to validate that the API endpoints conform to the OpenAPI specification.
 */

import { heyAPIContractTestSuite } from "./heyapi-contract-tests";

async function main() {
  console.log("🚀 Starting HeyAPI Contract Test Runner...");
  console.log("=".repeat(60));

  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  console.log(`📍 Testing API at: ${baseUrl}`);

  try {
    // Run all HeyAPI contract tests
    await heyAPIContractTestSuite.runAllTests();

    // Check if any tests failed
    const results = heyAPIContractTestSuite.getResults();
    const failedTests = results.filter((result: any) => !result.success);

    console.log(`\n${"=".repeat(60)}`);

    if (failedTests.length > 0) {
      console.log(
        `❌ HeyAPI Contract Test Runner failed: ${failedTests.length} test(s) failed`
      );
      process.exit(1);
    } else {
      console.log("✅ HeyAPI Contract Test Runner completed successfully!");
    }
  } catch (error) {
    console.error("\n❌ HeyAPI Contract Test Runner failed:", error);
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
