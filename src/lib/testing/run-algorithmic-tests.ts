#!/usr/bin/env tsx

import { createAlgorithmicContractTester } from "./algorithmic-contract-tester";

async function main() {
  console.log("🤖 Starting Algorithmic Contract Test Runner...");
  console.log("=".repeat(60));

  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const specPath = process.env.OPENAPI_SPEC_PATH || "src/lib/openapi/api-spec.yaml";

  console.log(`📍 Testing API at: ${baseUrl}`);
  console.log(`📋 Using OpenAPI spec: ${specPath}`);

  try {
    const tester = createAlgorithmicContractTester(specPath, baseUrl);
    await tester.runAllTests();

    const results = tester.getResults();
    const failedTests = results.filter((r) => !r.success);

    if (failedTests.length > 0) {
      console.log(
        `\n❌ Algorithmic Contract Test Runner failed: ${failedTests.length} test(s) failed`
      );
      process.exit(1);
    } else {
      console.log(`\n✅ Algorithmic Contract Test Runner completed successfully!`);
    }
  } catch (error) {
    console.error("❌ Algorithmic Contract Test Runner failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
