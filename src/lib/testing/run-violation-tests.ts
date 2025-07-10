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

    // Exit with success since violations were detected (this is expected)
    console.log("\n🎉 Contract violation testing completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Violation test runner failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
