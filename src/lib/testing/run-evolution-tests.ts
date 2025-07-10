#!/usr/bin/env node

import { contractEvolutionTests } from "./contract-evolution-tests";

async function main() {
  try {
    console.log("🔄 Starting Contract Evolution Testing Suite");
    console.log("=".repeat(60));

    const results = await contractEvolutionTests.runAllEvolutionTests();

    // Exit with appropriate code
    const overallSuccess = results.every((r) => r.success);
    process.exit(overallSuccess ? 0 : 1);
  } catch (error) {
    console.error("❌ Evolution test suite failed with error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as runEvolutionTests };
