# Enhanced Bidirectional Contract Testing with HeyAPI

## Overview

This document describes the comprehensive bidirectional contract testing system implemented using HeyAPI, Zod schemas, and advanced testing techniques. The system provides real-time contract validation, property-based testing, performance testing, and comprehensive monitoring capabilities.

## Architecture

### Core Components

1. **Dynamic Schema Discovery** (`src/lib/testing/dynamic-schema-discovery.ts`)
   - Automatically maps OpenAPI endpoints to HeyAPI generated schemas
   - Supports pattern matching for parameterized endpoints
   - Provides fallback mappings for endpoints not in OpenAPI spec

2. **Enhanced Contract Validation** (`src/lib/testing/enhanced-contract-validation.ts`)
   - Real-time request and response validation
   - Contract violation tracking and reporting
   - Context-aware error handling (CI vs development)

3. **Contract-Aware Client** (`src/lib/heyapi/contract-aware-client.ts`)
   - HeyAPI client with automatic contract validation
   - Request and response interceptors
   - Configurable validation options

4. **Server-Side Middleware** (`src/lib/middleware/contract-validation.ts`)
   - Next.js API route middleware for contract validation
   - Higher-order functions for easy integration
   - Decorator support for class-based APIs

5. **Property-Based Testing** (`src/lib/testing/property-based-tests.ts`)
   - Comprehensive property-based testing using fast-check
   - Boundary value testing
   - Schema round-trip validation

6. **Performance Testing** (`src/lib/testing/performance-tests.ts`)
   - Load testing with contract validation
   - Stress testing with increasing concurrency
   - Performance metrics and reporting

7. **Unified Test Runner** (`src/lib/testing/unified-enhanced-tester.ts`)
   - Comprehensive test suite orchestration
   - Detailed reporting and statistics
   - Integration of all testing capabilities

## Features

### 🔄 Bidirectional Validation
- **Request Validation**: Validates incoming requests against endpoint schemas
- **Response Validation**: Validates API responses against expected schemas
- **Real-time Monitoring**: Tracks contract violations in real-time
- **Context Awareness**: Different behavior in CI vs development environments

### 🧪 Advanced Testing
- **Property-Based Testing**: Uses fast-check for comprehensive test coverage
- **Boundary Testing**: Tests edge cases and invalid data scenarios
- **Performance Testing**: Load and stress testing with contract validation
- **Schema Round-trip**: Validates schema serialization/deserialization

### 📊 Monitoring & Reporting
- **Violation Tracking**: Records and categorizes contract violations
- **Performance Metrics**: Response times, throughput, error rates
- **Comprehensive Reports**: Detailed test results with success rates
- **Statistics**: Violation trends and endpoint coverage

### 🚀 Runtime Enforcement
- **Client Integration**: Automatic validation in HeyAPI client
- **Server Middleware**: Request/response validation in API routes
- **Configurable Options**: Granular control over validation behavior
- **Error Handling**: Graceful degradation and error reporting

## Usage

### Basic Setup

1. **Initialize the system**:
```typescript
import { enhancedContractValidation } from './src/lib/testing/enhanced-contract-validation';

await enhancedContractValidation.initialize();
```

2. **Validate requests**:
```typescript
const validation = enhancedContractValidation.validateRequest(
  '/api/products',
  'POST',
  requestData
);

if (!validation.success) {
  console.error('Contract violation:', validation.errors);
}
```

3. **Validate responses**:
```typescript
const validation = enhancedContractValidation.validateResponse(
  '/api/products',
  'GET',
  responseData
);

if (!validation.success) {
  console.error('Response violation:', validation.errors);
}
```

### Contract-Aware Client

```typescript
import { createContractAwareClient } from './src/lib/heyapi/contract-aware-client';

const client = await createContractAwareClient({
  baseUrl: 'http://localhost:3000'
});

// All requests and responses are automatically validated
const response = await client.post('/api/products', {
  body: productData
});
```

### Server-Side Middleware

```typescript
import { withContractValidation } from './src/lib/middleware/contract-validation';

export const POST = withContractValidation(async (request: NextRequest) => {
  // Your API logic here
  return NextResponse.json(product);
});
```

### Property-Based Testing

```typescript
import { propertyBasedTests } from './src/lib/testing/property-based-tests';

await propertyBasedTests.initialize();
const results = await propertyBasedTests.runAllTests();
```

### Performance Testing

```typescript
import { performanceTests } from './src/lib/testing/performance-tests';

await performanceTests.initialize();
const results = await performanceTests.runPerformanceTestSuite();
```

### Unified Testing

```typescript
import { unifiedEnhancedTester } from './src/lib/testing/unified-enhanced-tester';

const results = await unifiedEnhancedTester.runAllTests();
```

## Test Scripts

### Available Commands

```bash
# Run enhanced unified test suite
npm run test:enhanced

# Run property-based tests only
npm run test:property

# Run performance tests only
npm run test:performance

# Run basic contract tests
npm run test:contract

# Generate HeyAPI schemas
npm run generate:heyapi

# Generate Zod schemas
npm run generate:zod
```

### GitHub Actions Integration

The system includes a GitHub workflow (`.github/workflows/contract-tests.yml`) that provides:

- **Manual Triggers**: Run tests on-demand via GitHub Actions
- **Environment Selection**: Test against local, staging, or production
- **Test Type Selection**: Run specific test suites
- **Artifact Upload**: Save test results and reports
- **PR Integration**: Comment on pull requests with test results

## Configuration

### Environment Variables

```bash
# Enable strict contract validation in CI
CI=true

# Base URL for testing
TEST_BASE_URL=http://localhost:3000

# Performance test configuration
PERF_CONCURRENCY=10
PERF_DURATION=30000
```

### Validation Options

```typescript
// Client configuration
const client = createCustomContractClient(config, {
  validateRequests: true,
  validateResponses: true,
  throwOnViolation: false
});

// Middleware configuration
const middleware = contractValidationMiddleware({
  validateRequests: true,
  validateResponses: true,
  throwOnViolation: false,
  logViolations: true
});
```

## Monitoring & Debugging

### Violation Statistics

```typescript
const stats = enhancedContractValidation.getViolationStats();
console.log('Violation stats:', stats);
// {
//   total: 5,
//   request: 2,
//   response: 3,
//   errors: 4,
//   warnings: 1
// }
```

### Get Violations

```typescript
const violations = enhancedContractValidation.getViolations();
violations.forEach(violation => {
  console.log(`${violation.type} violation on ${violation.method} ${violation.endpoint}`);
  console.log('Errors:', violation.errors.errors);
});
```

### Performance Metrics

```typescript
const results = await performanceTests.runLoadTest('/api/products', 'GET');
console.log('Performance metrics:', results.metrics[0]);
// {
//   avgResponseTime: 45.2,
//   p95ResponseTime: 89.1,
//   throughput: 22.1,
//   errorRate: 0.5
// }
```

## Best Practices

### 1. Schema Management
- Use HeyAPI for automatic schema generation
- Keep schemas in sync with OpenAPI specifications
- Version schemas appropriately for breaking changes

### 2. Testing Strategy
- Run property-based tests in CI/CD pipeline
- Use performance tests for load testing
- Monitor contract violations in production

### 3. Error Handling
- Log violations for debugging
- Don't fail requests on validation errors in development
- Use strict validation in CI environments

### 4. Performance Considerations
- Cache schema validations where possible
- Use async validation for large payloads
- Monitor validation performance impact

## Troubleshooting

### Common Issues

1. **Schema Not Found**
   - Ensure HeyAPI schemas are generated
   - Check endpoint mapping in dynamic schema discovery
   - Verify OpenAPI specification is up to date

2. **Validation Performance**
   - Use caching for frequently accessed schemas
   - Consider async validation for large payloads
   - Monitor validation overhead

3. **False Positives**
   - Review schema definitions
   - Check for optional fields
   - Verify data transformations

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG_CONTRACT_VALIDATION = 'true';

// Or enable in code
enhancedContractValidation.setDebugMode(true);
```

## Future Enhancements

### Planned Features

1. **Schema Evolution**
   - Automatic schema versioning
   - Backward compatibility checking
   - Migration path validation

2. **Advanced Monitoring**
   - Real-time dashboard
   - Alerting for contract violations
   - Trend analysis

3. **Integration Enhancements**
   - GraphQL support
   - gRPC contract validation
   - WebSocket validation

4. **Testing Improvements**
   - Mutation testing
   - Chaos engineering integration
   - Contract drift detection

## Contributing

When contributing to the contract testing system:

1. **Add Tests**: Include property-based tests for new features
2. **Update Schemas**: Keep schemas in sync with API changes
3. **Document Changes**: Update this documentation
4. **Performance**: Consider impact on validation performance
5. **Backward Compatibility**: Maintain compatibility with existing tests

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review test logs and violation reports
3. Verify schema generation and mapping
4. Test with minimal examples
5. Check GitHub issues for known problems 