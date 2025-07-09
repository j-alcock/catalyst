#!/usr/bin/env tsx

import { unifiedTester } from "./unified-dynamic-tester";

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0]?.toLowerCase();

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
    let _results: any[] = [];

    switch (testType) {
      case "contract":
        console.log("🔗 Running contract tests only...");
        _results = await unifiedTester.runAllContractTests();
        break;

      case "violation":
        console.log("🚨 Running violation tests only...");
        _results = await unifiedTester.runAllViolationTests();
        break;

      case "both":
      case "all":
      case undefined:
        console.log("🔗🚨 Running both contract and violation tests...");
        _results = await unifiedTester.runAllTests();
        break;

      default:
        console.error("❌ Invalid test type. Use: contract, violation, both, or all");
        console.log(
          "Usage: npx tsx run-specific-tests.ts [contract|violation|both|all] [--port=3000]"
        );
        process.exit(1);
    }

    // Print results
    unifiedTester.printResults();

    // Exit with appropriate code
    const summary = unifiedTester.getSummary();
    if (testType === "contract" && summary.contract.failed > 0) {
      console.log("\n❌ Contract tests failed. Exiting with code 1.");
      process.exit(1);
    } else if (testType === "violation" && summary.violation.failed > 0) {
      console.log("\n❌ Violation tests failed. Exiting with code 1.");
      process.exit(1);
    } else if (
      (testType === "both" || testType === "all" || !testType) &&
      summary.overall.failed > 0
    ) {
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
