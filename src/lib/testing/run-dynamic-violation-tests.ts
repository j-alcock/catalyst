#!/usr/bin/env tsx

import { dynamicViolationTester } from "./dynamic-violation-tester";

async function main() {
  console.log("🚀 Starting Dynamic Contract Violation Testing System");
  console.log("=".repeat(60));

  try {
    // Run all dynamic violation tests
    const _results = await dynamicViolationTester.runAllViolationTests();

    // Print results
    dynamicViolationTester.printResults();

    // Exit with appropriate code
    const summary = dynamicViolationTester.getSummary();
    if (summary.failed > 0) {
      console.log("\n⚠️  Some contract violations were not detected.");
      console.log("This may indicate that your API validation needs improvement.");
      process.exit(1);
    } else {
      console.log("\n✅ All contract violations were properly detected!");
      console.log("Your API validation is working correctly.");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Dynamic violation testing failed:", error);
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
