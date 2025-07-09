# Zod-Only Contract Testing

This document explains how to create full contract tests using **only Zod schemas** without relying on OpenAPI specifications.

## Overview

The Zod-only contract testing approach provides a **simpler, more maintainable** way to test your API contracts by using Zod schemas as the single source of truth for validation.

### Key Benefits

1. **Single Source of Truth**: Zod schemas are the only validation rules you need
2. **No OpenAPI Dependency**: Works without OpenAPI specifications
3. **Type Safety**: Full TypeScript support with runtime validation
4. **Automatic Test Generation**: Tests are generated from your Zod schemas
5. **Simplified Maintenance**: Update schemas, tests update automatically
6. **Better Performance**: No need to parse OpenAPI specs

## How It Works

### 1. Schema Discovery

The system automatically discovers all Zod schemas from your generated `zod.gen.ts` file:

```typescript
private discoverZodSchemas(): Record<string, z.ZodSchema<any>> {
  const schemas: Record<string, z.ZodSchema<any>> = {};

  // Iterate through all exports from the ZodSchemas module
  for (const [name, schema] of Object.entries(ZodSchemas)) {
    // Only include actual Zod schemas (not types or other exports)
    if (schema && typeof schema === "object" && "_def" in schema) {
      schemas[name] = schema as z.ZodSchema<any>;
    }
  }

  return schemas;
}
```

### 2. Test Configuration Generation

Tests are automatically generated based on available request/response schema pairs:

```typescript
// Example: Products endpoint
if (this.availableSchemas.zPostApiProductsData && this.availableSchemas.zPostApiProductsResponse) {
  tests.push({
    endpoint: "/api/products",
    method: "POST",
    requestSchema: this.availableSchemas.zPostApiProductsData,
    responseSchema: this.availableSchemas.zPostApiProductsResponse,
    testData: this.generateTestDataFromSchema(this.availableSchemas.zPostApiProductsData),
    expectedStatusCodes: [200, 201],
    description: "Create product using Zod schemas",
  });
}
```

### 3. Test Data Generation

Test data is automatically generated from Zod schemas:

```typescript
private generateTestDataFromSchema(schema: z.ZodSchema<any>): any {
  if (schema instanceof z.ZodObject) {
    const result: any = {};
    const shape = schema.shape;

    for (const [key, field] of Object.entries(shape)) {
      result[key] = this.generateSampleValue(field as z.ZodTypeAny);
    }

    return result;
  }

  return this.generateSampleValue(schema as z.ZodTypeAny);
}
```

### 4. Smart Value Generation

The system intelligently generates appropriate test values based on Zod field types and constraints:

```typescript
private generateSampleValue(field: z.ZodTypeAny): any {
  if (field instanceof z.ZodString) {
    // Check for specific string formats
    if (field._def.checks) {
      const checks = field._def.checks;
      if (checks.some((c: any) => c.kind === "uuid")) {
        return "123e4567-e89b-12d3-a456-426614174000";
      }
      if (checks.some((c: any) => c.kind === "email")) {
        return "test@example.com";
      }
      if (checks.some((c: any) => c.kind === "datetime")) {
        return "2024-01-01T00:00:00Z";
      }
    }
    return "sample string";
  } else if (field instanceof z.ZodNumber) {
    // Check for constraints
    if (field._def.checks) {
      const checks = field._def.checks;
      if (checks.some((c: any) => c.kind === "gte" && c.minimum === 0)) {
        return 42; // Non-negative number
      }
      if (checks.some((c: any) => c.kind === "int")) {
        return 100; // Integer
      }
    }
    return 42;
  }
  // ... more type handling
}
```

## Usage

### Running Zod-Only Tests

```bash
# Run all Zod-only contract tests
npm run test:zod-only

# Or run directly
npx tsx src/lib/testing/run-zod-only-tests.ts
```

### Example Output

```
🚀 Starting Zod-Only Contract Test Suite
==================================================
This test suite uses ONLY Zod schemas for validation
No OpenAPI specification is required!
==================================================

🔍 Discovered 25 Zod schemas: [
  'zUser', 'zProduct', 'zCategory', 'zOrder', 'zOrderItem',
  'zOrderStatus', 'zPostApiProductsData', 'zGetApiProductsResponse',
  // ... more schemas
]

🔍 Generating Zod-only contract tests...
📋 Generated 12 Zod contract test configurations
🚀 Running 12 Zod contract tests...

🔍 Testing: Create product using Zod schemas
✅ PASS POST /api/products
   🔍 Validation Steps:
      ✅ Request Schema Validation
         📝 Request data conforms to expected schema
      ✅ JSON Response Parsing
         📝 Response data successfully parsed as JSON
      ✅ HTTP Status Code Validation
         📝 Status code 200 is in expected range [200, 201]
      ✅ Response Schema Validation
         📝 Response data conforms to expected schema

🔍 Testing: Get products using Zod schemas
✅ PASS GET /api/products
   🔍 Validation Steps:
      ✅ Request Schema Validation
         📝 Request data conforms to expected schema
      ✅ JSON Response Parsing
         📝 Response data successfully parsed as JSON
      ✅ HTTP Status Code Validation
         📝 Status code 200 is in expected range [200]
      ✅ Response Schema Validation
         📝 Response data conforms to expected schema

📋 Zod-Only Contract Test Results:
==================================================
1. ✅ PASS POST /api/products (200)
   ⏱️  Response time: 45ms
   🔍 Validation Steps:
      ✅ Request Schema Validation
         📝 Request data conforms to expected schema
      ✅ JSON Response Parsing
         📝 Response data successfully parsed as JSON
      ✅ HTTP Status Code Validation
         📝 Status code 200 is in expected range [200, 201]
      ✅ Response Schema Validation
         📝 Response data conforms to expected schema

2. ✅ PASS GET /api/products (200)
   ⏱️  Response time: 32ms
   🔍 Validation Steps:
      ✅ Request Schema Validation
         📝 Request data conforms to expected schema
      ✅ JSON Response Parsing
         📝 Response data successfully parsed as JSON
      ✅ HTTP Status Code Validation
         📝 Status code 200 is in expected range [200]
      ✅ Response Schema Validation
         📝 Response data conforms to expected schema

📊 Summary:
   Total tests: 12
   Passed: 12
   Failed: 0
   Success rate: 100.0%

✅ All Zod contract tests passed!
```

## Supported Endpoints

The Zod-only tester automatically generates tests for these endpoint types:

### Products
- `POST /api/products` - Create product
- `GET /api/products` - List products with pagination
- `GET /api/products/{id}` - Get product by ID
- `PUT /api/products/{id}` - Update product

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/categories/{id}` - Get category by ID

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order by ID
- `PUT /api/orders/{id}/status` - Update order status

### Users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user by ID

### Other Endpoints
- `POST /api/stripe` - Stripe webhook
- `GET /api/subscription/billing-portal` - Billing portal

## Validation Steps

Each test performs these validation steps:

1. **Request Schema Validation**: Validates test data against request schema
2. **JSON Response Parsing**: Ensures response is valid JSON
3. **HTTP Status Code Validation**: Checks status code is in expected range
4. **Response Schema Validation**: Validates response against response schema

## Extending the System

### Adding New Endpoints

To add tests for new endpoints, simply add them to the `generateZodContractTests()` method:

```typescript
// Example: Adding a new endpoint
if (this.availableSchemas.zGetApiNewEndpointData && this.availableSchemas.zGetApiNewEndpointResponse) {
  tests.push({
    endpoint: "/api/new-endpoint",
    method: "GET",
    requestSchema: this.availableSchemas.zGetApiNewEndpointData,
    responseSchema: this.availableSchemas.zGetApiNewEndpointResponse,
    testData: this.generateTestDataFromSchema(this.availableSchemas.zGetApiNewEndpointData),
    expectedStatusCodes: [200],
    description: "Get new endpoint using Zod schemas",
  });
}
```

### Custom Test Data

You can override the automatic test data generation for specific endpoints:

```typescript
// Example: Custom test data for specific endpoint
if (this.availableSchemas.zPostApiProductsData && this.availableSchemas.zPostApiProductsResponse) {
  tests.push({
    endpoint: "/api/products",
    method: "POST",
    requestSchema: this.availableSchemas.zPostApiProductsData,
    responseSchema: this.availableSchemas.zPostApiProductsResponse,
    testData: {
      body: {
        name: "Custom Test Product",
        description: "A custom test product",
        price: 99.99,
        stockQuantity: 50,
        categoryId: "123e4567-e89b-12d3-a456-426614174000"
      }
    },
    expectedStatusCodes: [200, 201],
    description: "Create product with custom test data",
  });
}
```

## Comparison with Other Approaches

| Feature | Zod-Only | OpenAPI + Zod | Manual Tests |
|---------|----------|---------------|--------------|
| **Setup Complexity** | Low | Medium | High |
| **Maintenance** | Low | Medium | High |
| **Type Safety** | High | High | Medium |
| **Runtime Validation** | High | High | Low |
| **OpenAPI Dependency** | None | Required | None |
| **Automatic Generation** | Yes | Yes | No |
| **Performance** | High | Medium | High |

## Best Practices

### 1. Keep Schemas Updated

Ensure your Zod schemas are always up-to-date with your API implementation:

```bash
# Regenerate Zod schemas when API changes
npx @hey-api/openapi-ts -f heyapi.config.ts
```

### 2. Use Descriptive Test Names

The `description` field helps identify what each test is validating:

```typescript
description: "Create product with required fields using Zod schemas"
```

### 3. Handle Business Logic

For endpoints that require specific business logic (like valid UUIDs), you can enhance the test data generation:

```typescript
// Example: Use real data for relationships
testData: {
  body: {
    name: "Test Product",
    categoryId: realCategoryId, // Use real category ID
    price: 29.99,
    stockQuantity: 100
  }
}
```

### 4. Monitor Test Performance

The system tracks response times for each endpoint:

```typescript
if (result.responseTime) {
  console.log(`   ⏱️  Response time: ${result.responseTime}ms`);
}
```

## Integration with CI/CD

Add Zod-only tests to your CI/CD pipeline:

```yaml
# Example: GitHub Actions
- name: Run Zod-only contract tests
  run: npm run test:zod-only
```

## Troubleshooting

### Common Issues

1. **Missing Schemas**: Ensure all required Zod schemas are generated
2. **Invalid Test Data**: Check that generated test data matches schema constraints
3. **API Not Running**: Make sure your API server is running on the expected URL
4. **Network Issues**: Verify network connectivity and CORS settings

### Debug Mode

Enable debug logging by modifying the test runner:

```typescript
// Add debug logging
console.log("Available schemas:", Object.keys(this.availableSchemas));
console.log("Generated test data:", JSON.stringify(testData, null, 2));
```

## Conclusion

Zod-only contract testing provides a **simple, powerful, and maintainable** approach to API contract testing. By using Zod schemas as the single source of truth, you get:

- **Automatic test generation** from your validation schemas
- **Type safety** with runtime validation
- **No external dependencies** on OpenAPI specifications
- **Easy maintenance** - update schemas, tests update automatically
- **Comprehensive coverage** of all your API endpoints

This approach is particularly well-suited for projects that already use Zod for validation and want a lightweight, focused testing solution. 