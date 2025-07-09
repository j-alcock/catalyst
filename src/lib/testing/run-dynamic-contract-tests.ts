#!/usr/bin/env tsx

import { dynamicContractTester } from "./dynamic-contract-tester";

async function main() {
  console.log("🚀 Starting Dynamic Contract Testing System");
  console.log("=".repeat(60));

  try {
    // Run all dynamic tests
    const _results = await dynamicContractTester.runAllDynamicTests();

    // Print results
    dynamicContractTester.printResults();

    // Exit with appropriate code
    const summary = dynamicContractTester.getSummary();
    if (summary.failed > 0) {
      console.log("\n❌ Contract violations detected. Exiting with code 1.");
      process.exit(1);
    } else {
      console.log("\n✅ All dynamic contract tests passed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Dynamic contract testing failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
}
