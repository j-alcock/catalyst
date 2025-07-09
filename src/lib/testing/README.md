# Unified Dynamic API Testing System

This directory contains a comprehensive testing system that dynamically discovers and tests your API endpoints using both contract and violation testing approaches.

## Overview

The unified testing system combines the best of both contract testing (valid requests) and violation testing (invalid requests) into a single, maintainable codebase that:

- **Dynamically discovers** all API endpoints from your OpenAPI specification
- **Automatically discovers** all Zod schemas from your schema files
- **Generates tests** based on the actual API structure
- **Runs both contract and violation tests** using shared logic
- **Provides detailed reporting** with success rates and error details

## Key Features

### 🔍 Dynamic Discovery
- **OpenAPI Integration**: Reads your `api-spec.yaml` to discover all endpoints
- **Zod Schema Discovery**: Automatically finds all Zod schemas in your codebase
- **Smart Mapping**: Maps OpenAPI schemas to Zod schemas for validation

### 🔗 Contract Testing
- **Valid Request Testing**: Tests that valid requests return expected responses
- **Schema Validation**: Validates responses against Zod schemas
- **Status Code Verification**: Ensures endpoints return correct HTTP status codes
- **Response Time Tracking**: Monitors API performance

### 🚨 Violation Testing
- **Missing Fields**: Tests that missing required fields are rejected
- **Wrong Types**: Tests that wrong data types are rejected
- **Extra Fields**: Tests that extra fields are rejected (strict validation)
- **Invalid Enums**: Tests that invalid enum values are rejected
- **Malformed JSON**: Tests that malformed JSON is handled gracefully
- **Invalid UUIDs**: Tests that invalid path parameters are rejected

## Usage

### Quick Start

```bash
# Run all tests (contract + violation)
npm run test:unified

# Run only contract tests
npm run test:unified-contract

# Run only violation tests
npm run test:unified-violation

# Run both with specific command
npm run test:unified-all
```

### Programmatic Usage

```typescript
import { unifiedTester } from './unified-dynamic-tester';

// Run all tests
const results = await unifiedTester.runAllTests();

// Run specific test types
const contractResults = await unifiedTester.runAllContractTests();
const violationResults = await unifiedTester.runAllViolationTests();

// Get results
const summary = unifiedTester.getSummary();
unifiedTester.printResults();
```

## Test Configuration

### Contract Tests
Contract tests are automatically generated based on your OpenAPI specification:

- **GET endpoints**: Test successful responses with proper schemas
- **POST/PUT endpoints**: Test with generated valid request data
- **Path parameters**: Automatically replaced with valid UUIDs
- **Response validation**: Validates against expected Zod schemas

### Violation Tests
Violation tests are generated to ensure your API properly rejects invalid data:

- **Missing required fields**: Sends requests without required fields
- **Wrong data types**: Sends strings where numbers are expected, etc.
- **Extra fields**: Sends additional fields not in the schema
- **Invalid enums**: Sends invalid enum values
- **Malformed JSON**: Sends invalid JSON strings
- **Invalid UUIDs**: Tests path parameter validation

## Output Format

The system provides detailed output including:

```
🚀 Unified Dynamic API Testing System
==================================================

🔗 Contract Tests:
1. ✅ PASS GET /api/products (200)
   ⏱️  Response time: 24ms
2. ❌ FAIL PUT /api/orders/{id}/status (404)
   ⏱️  Response time: 3ms
   Errors:
     - Unexpected status code: 404. Expected one of: 200

🚨 Violation Tests:
1. ✅ PASS POST /api/products - violation
   ⏱️  Response time: 2ms
   📝 Wrong status code for invalid request in POST /api/products
   🎯 Expected: Invalid request should return 4xx status code
   📊 Actual: Status: 400, Expected: 4xx

📊 Summary:
   Contract Tests: 3/4 passed (75.0%)
   Violation Tests: 28/28 passed (100.0%)
   Overall: 31/32 passed (96.9%)
```

## Architecture

### Core Classes

- **`UnifiedDynamicTester`**: Main testing class that orchestrates all tests
- **`ContractTestConfig`**: Configuration for contract tests
- **`ViolationTestConfig`**: Configuration for violation tests
- **`UnifiedTestResult`**: Union type for all test results

### Key Methods

- **`discoverZodSchemas()`**: Automatically finds all Zod schemas
- **`extractEndpoints()`**: Reads OpenAPI spec to find endpoints
- **`generateContractTestConfig()`**: Creates contract test configurations
- **`generateViolationTestConfigs()`**: Creates violation test configurations
- **`runContractTest()`**: Executes a single contract test
- **`runViolationTest()`**: Executes a single violation test

## Benefits

### 🎯 Unified Approach
- **Single codebase**: No duplication between contract and violation testing
- **Shared discovery**: Both test types use the same endpoint and schema discovery
- **Consistent reporting**: Unified results format and summary

### 🔄 Maintainability
- **Automatic updates**: Tests automatically adapt when you add new endpoints
- **Schema-driven**: Tests are generated from your actual schemas
- **No manual configuration**: No need to manually specify test cases

### 📊 Comprehensive Coverage
- **Full API coverage**: Tests all endpoints discovered in OpenAPI
- **Multiple violation types**: Tests various ways APIs can be misused
- **Performance monitoring**: Tracks response times

### 🚀 Developer Experience
- **Clear output**: Easy to understand test results
- **Fast execution**: Efficient test generation and execution
- **CI/CD ready**: Proper exit codes for automation

## Migration from Legacy Tests

The unified system replaces the need for separate:
- `dynamic-contract-tester.ts`
- `dynamic-violation-tester.ts`
- `run-dynamic-contract-tests.ts`
- `run-dynamic-violation-tests.ts`

### Migration Steps

1. **Update scripts**: Use the new unified test commands
2. **Remove old files**: Delete the legacy test files
3. **Update CI/CD**: Replace old test commands with unified ones

## Configuration

### Base URL
The tester defaults to `http://localhost:3000`. You can customize this:

```typescript
const tester = new UnifiedDynamicTester('http://localhost:3001');
```

### OpenAPI Spec Path
The system expects your OpenAPI spec at `src/lib/openapi/api-spec.yaml`.

### Zod Schemas
The system automatically discovers all Zod schemas exported from `src/lib/schemas/zod-schemas.ts`.

## Troubleshooting

### Common Issues

1. **404 errors in contract tests**: Expected for non-existent resources
2. **Schema mapping failures**: Check that your OpenAPI refs match Zod schema names
3. **Test generation failures**: Ensure your OpenAPI spec is valid

### Debug Mode

Add debug logging to see what's happening:

```typescript
// In the tester class, add console.log statements
console.log('Discovered schemas:', Object.keys(this.availableSchemas));
console.log('Generated test config:', config);
```

## Future Enhancements

- **Custom test data generators**: Allow custom test data for specific fields
- **Performance benchmarks**: Track and report performance regressions
- **Coverage reporting**: Show which endpoints/schemas are tested
- **Parallel execution**: Run tests in parallel for faster execution
- **Custom validators**: Allow custom validation rules beyond Zod schemas 