#!/usr/bin/env tsx

import { contractTester } from "./contract-tester";
import { contractViolationTestSuite } from "./contract-violation-tests";

async function main() {
  console.log("🔍 Starting Contract Violation Test Runner...");
  console.log("⚠️  These tests are designed to FAIL when contracts are broken");
  console.log(
    "💡 This demonstrates how the contract testing framework catches violations\n"
  );

  try {
    await contractViolationTestSuite.runViolationTests();

    // Exit with appropriate code
    const results = contractTester.getResults();
    const failedTests = results.filter((r: any) => !r.success);

    console.log("\n📊 Violation Test Summary:");
    console.log(`   Total tests run: ${results.length}`);
    console.log(`   Tests that detected violations: ${failedTests.length}`);
    console.log(
      `   Tests that passed (no violations): ${results.length - failedTests.length}`
    );

    if (failedTests.length > 0) {
      console.log("\n✅ SUCCESS: Contract violations were detected!");
      console.log("   This means your contract testing framework is working correctly.");
      console.log("   The violations detected include:");
      failedTests.forEach((test, index) => {
        console.log(
          `   ${index + 1}. ${test.method} ${test.endpoint} - ${test.errors.join(", ")}`
        );
      });
      process.exit(0); // Exit with success since violations were detected
    } else {
      console.log("\n⚠️  WARNING: No contract violations were detected.");
      console.log("   This might mean:");
      console.log("   - Your API is perfectly compliant (unlikely)");
      console.log("   - The violation tests need to be more strict");
      console.log("   - The API is not running or accessible");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Violation test runner failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
