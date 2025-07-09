#!/usr/bin/env tsx

import { unifiedTester } from "./unified-dynamic-tester";

async function main() {
  console.log("🚀 Unified Dynamic API Testing System");
  console.log("=".repeat(50));

  try {
    // Run all tests (both contract and violation)
    const _results = await unifiedTester.runAllTests();

    // Print results
    unifiedTester.printResults();

    // Exit with appropriate code
    const summary = unifiedTester.getSummary();
    if (summary.overall.failed > 0) {
      console.log("\n❌ Some tests failed. Exiting with code 1.");
      process.exit(1);
    } else {
      console.log("\n✅ All tests passed! Exiting with code 0.");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

// Run the tests
main();
