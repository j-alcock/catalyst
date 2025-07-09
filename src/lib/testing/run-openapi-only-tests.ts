#!/usr/bin/env tsx

import { openAPIOnlyTester } from "./openapi-only-dynamic-tester";

async function main() {
  console.log("🚀 Starting OpenAPI-Only Dynamic Contract Testing");
  console.log("=".repeat(60));
  console.log("This test suite uses only OpenAPI schemas for validation");
  console.log("No Zod schemas are used - pure OpenAPI specification testing");
  console.log("=".repeat(60));

  try {
    // Run all contract tests
    const _results = await openAPIOnlyTester.runAllContractTests();

    // Print results
    openAPIOnlyTester.printResults();

    // Print coverage report
    openAPIOnlyTester.printCoverageReport();

    // Exit with appropriate code
    const summary = openAPIOnlyTester.getSummary();
    if (summary.failed > 0) {
      console.log("\n❌ Some tests failed!");
      process.exit(1);
    } else {
      console.log("\n✅ All tests passed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
