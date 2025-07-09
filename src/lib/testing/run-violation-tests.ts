#!/usr/bin/env tsx

import { contractTester } from "./contract-tester";
import { contractViolationTestSuite } from "./contract-violation-tests";

async function main() {
  console.log("🔍 Starting Contract Violation Test Runner...");
  console.log("⚠️  These tests are designed to FAIL when contracts are broken");
  console.log(
    "💡 This demonstrates how the contract testing framework catches violations\n"
  );

  // Check if API server is accessible
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  console.log(`🌐 Testing against: ${baseUrl}`);

  try {
    const healthCheck = await fetch(`${baseUrl}/api/test`);
    if (healthCheck.ok) {
      console.log("✅ API server is running and accessible");
    } else {
      console.log("⚠️  API server responded but with non-200 status");
    }
  } catch (_error) {
    console.log(
      "⚠️  API server is not accessible - tests will run with simulated violations"
    );
    console.log("   This is expected when running locally without starting the server");
    console.log("   In CI/CD, the server will be started before running these tests\n");
  }

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
      console.log("   - The tests are not properly recording results");
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
