#!/usr/bin/env node

import { unifiedEnhancedTester } from "./unified-enhanced-tester";

async function main() {
  try {
    console.log("🚀 Starting Enhanced Bidirectional Contract Testing Suite");
    console.log("=".repeat(60));

    const results = await unifiedEnhancedTester.runAllTests();

    // Exit with appropriate code
    const overallSuccess = results.failedSuites === 0;
    process.exit(overallSuccess ? 0 : 1);
  } catch (error) {
    console.error("❌ Test suite failed with error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as runEnhancedTests };
