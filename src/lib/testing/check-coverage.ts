import { UnifiedDynamicTester } from "./unified-dynamic-tester";

async function checkCoverage() {
  const tester = new UnifiedDynamicTester();

  // Get all available schemas from OpenAPI spec
  const allSchemas = tester["getAllAvailableSchemas"]();
  console.log("📋 All available schemas from OpenAPI spec:");
  allSchemas.forEach((schema) => console.log(`   - ${schema}`));

  // Get all available Zod schemas
  const zodSchemas = Object.keys(tester["availableSchemas"]);
  console.log("\n🔍 All available Zod schemas:");
  zodSchemas.forEach((schema) => console.log(`   - ${schema}`));

  // Run contract tests to populate coverage data
  console.log("\n🔗 Running Contract Tests...");
  console.log("=".repeat(50));
  await tester.runAllContractTests();

  // Run violation tests to populate additional coverage data
  console.log("\n🚨 Running Violation Tests...");
  console.log("=".repeat(50));
  await tester.runAllViolationTests();

  // Get coverage stats
  const coverage = tester.getCoverageStats();

  console.log("\n📊 Schema Coverage Details:");
  console.log(`   Total OpenAPI schemas: ${coverage.schemas.total}`);
  console.log(`   Tested schemas: ${coverage.schemas.tested}`);
  console.log(`   Coverage: ${coverage.schemas.coverage.toFixed(1)}%`);

  console.log("\n✅ Tested Schemas:");
  coverage.schemas.testedList.forEach((schema) => console.log(`   - ${schema}`));

  console.log("\n❌ Untested Schemas:");
  coverage.schemas.untestedList.forEach((schema) => console.log(`   - ${schema}`));

  // Check which Zod schemas are not being used
  const testedZodSchemas = new Set();
  for (const [schemaName, schema] of Object.entries(tester["availableSchemas"])) {
    // Check if this schema is used in any test config
    const isUsed = tester["contractTestConfigs"].some(
      (config) => config.requestSchema === schema || config.responseSchema === schema
    );
    if (isUsed) {
      testedZodSchemas.add(schemaName);
    }
  }

  console.log("\n🔍 Zod Schema Usage:");
  console.log("✅ Used Zod schemas:");
  Array.from(testedZodSchemas).forEach((schema) => console.log(`   - ${schema}`));

  console.log("\n❌ Unused Zod schemas:");
  zodSchemas
    .filter((schema) => !testedZodSchemas.has(schema))
    .forEach((schema) => console.log(`   - ${schema}`));
}

checkCoverage().catch(console.error);
