#!/usr/bin/env tsx

import { DynamicContractTester } from "./dynamic-contract-tester";

/**
 * Demonstration of the Dynamic Contract Testing System
 *
 * This script shows how the system:
 * 1. Reads the OpenAPI specification
 * 2. Loads Zod schemas
 * 3. Generates test configurations
 * 4. Runs tests dynamically
 */

async function demonstrateDynamicTesting() {
  console.log("🎯 Dynamic Contract Testing System Demonstration");
  console.log("=".repeat(60));

  // Create a new tester instance
  const tester = new DynamicContractTester("http://localhost:3000");

  console.log("\n📋 Step 1: Loading OpenAPI Specification");
  console.log("- Reading api-spec.yaml file");
  console.log("- Parsing YAML content");
  console.log("- Extracting endpoint definitions");

  console.log("\n📋 Step 2: Loading Zod Schemas");
  console.log("- Importing all Zod validation schemas");
  console.log("- Creating schema mapping");
  console.log("- Setting up validation rules");

  console.log("\n📋 Step 3: Generating Test Configurations");
  console.log("- Extracting endpoints from OpenAPI spec");
  console.log("- Mapping schema references to Zod schemas");
  console.log("- Generating test data for each endpoint");
  console.log("- Setting up expected status codes");

  console.log("\n📋 Step 4: Running Dynamic Tests");
  console.log("- Making HTTP requests to API endpoints");
  console.log("- Validating responses against Zod schemas");
  console.log("- Checking status codes and error responses");
  console.log("- Measuring response times");

  console.log("\n🚀 Running the demonstration...");

  try {
    // Run all dynamic tests
    const _results = await tester.runAllDynamicTests();

    console.log("\n📊 Demonstration Results:");
    console.log("=".repeat(40));

    const summary = tester.getSummary();
    console.log(`Total endpoints tested: ${summary.total}`);
    console.log(`Successful validations: ${summary.passed}`);
    console.log(`Failed validations: ${summary.failed}`);
    console.log(`Success rate: ${summary.successRate.toFixed(1)}%`);

    console.log("\n🎯 Key Benefits of Dynamic Testing:");
    console.log("✅ No hard-coded test cases");
    console.log("✅ Automatically adapts to API changes");
    console.log("✅ Reads specifications directly");
    console.log("✅ Generates appropriate test data");
    console.log("✅ Validates against actual schemas");
    console.log("✅ Provides detailed error reporting");

    console.log("\n🔄 How to Use in Your Workflow:");
    console.log("1. Update your OpenAPI specification");
    console.log("2. Update your Zod schemas");
    console.log("3. Run: npm run test:contract-dynamic");
    console.log("4. Review results and fix any violations");

    if (summary.failed > 0) {
      console.log("\n❌ Contract violations detected!");
      console.log(
        "This demonstrates that the system correctly identifies API contract issues."
      );
    } else {
      console.log("\n✅ All contracts are valid!");
      console.log("Your API implementation matches the specifications perfectly.");
    }
  } catch (error) {
    console.error("❌ Demonstration failed:", error);
  }
}

// Run demonstration if called directly
if (require.main === module) {
  demonstrateDynamicTesting().catch((error) => {
    console.error("❌ Unhandled error in demonstration:", error);
    process.exit(1);
  });
}

export { demonstrateDynamicTesting };
