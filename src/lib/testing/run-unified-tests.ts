#!/usr/bin/env tsx

import { unifiedTester } from "./unified-dynamic-tester";

async function main() {
  // Check if port is specified via command line argument
  const portArg = process.argv.find((arg) => arg.startsWith("--port="));
  if (portArg) {
    const port = portArg.split("=")[1];
    process.env.TEST_PORT = port;
  }

  console.log("🚀 Unified Dynamic API Testing System");
  console.log("=".repeat(50));
  console.log(
    `🌐 Testing against: ${process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : "http://localhost:3001"}`
  );

  try {
    // Run all tests (both contract and violation)
    const _results = await unifiedTester.runAllTests();

    // Print results
    unifiedTester.printResults();

    // Cleanup resources
    await unifiedTester.cleanup();

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
