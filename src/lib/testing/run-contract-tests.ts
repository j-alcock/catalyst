#!/usr/bin/env tsx

import { contractTester } from "./contract-tester";
import { contractTestSuite } from "./contract-tests";

async function main() {
  console.log("🚀 Starting Contract Test Runner...");

  try {
    await contractTestSuite.runAllTests();

    // Exit with appropriate code
    const results = contractTester.getResults();
    const failedTests = results.filter((r: any) => !r.success);

    if (failedTests.length > 0) {
      console.log("\n❌ Contract tests failed!");
      process.exit(1);
    } else {
      console.log("\n✅ All contract tests passed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Test runner failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
