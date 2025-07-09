#!/usr/bin/env tsx

import { algorithmicContractTestSuite } from "./algorithmic-contract-tests";

async function main() {
  console.log("🚀 Starting Algorithmic Contract Test Runner...");
  console.log("=".repeat(60));

  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  console.log(`📍 Testing API at: ${baseUrl}`);

  try {
    // Run algorithmic contract tests
    await algorithmicContractTestSuite.runAlgorithmicTests();

    // Get results
    const results = algorithmicContractTestSuite.getResults();
    const failedTests = results.filter((result) => !result.success);

    if (failedTests.length > 0) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(
        "❌ Algorithmic Contract Test Runner failed:",
        failedTests.length,
        "test(s) failed"
      );
      process.exit(1);
    } else {
      console.log(`\n${"=".repeat(60)}`);
      console.log("✅ Algorithmic Contract Test Runner completed successfully!");
    }
  } catch (error) {
    console.error("❌ Algorithmic Contract Test Runner failed:", error);
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
