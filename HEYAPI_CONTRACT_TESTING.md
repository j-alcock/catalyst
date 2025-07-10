# HeyAPI Bi-Directional Contract Testing

This document describes the bi-directional contract testing implementation using HeyAPI, which provides type-safe API client generation with built-in contract validation.

## Overview

The HeyAPI contract testing system provides:

- **Type-safe API client**: Auto-generated from OpenAPI specifications
- **Request validation**: Validates outgoing requests against Zod schemas
- **Response validation**: Validates incoming responses against Zod schemas
- **Context-aware behavior**: Fails in CI/test, logs in development
- **Automatic schema mapping**: Maps endpoints to appropriate schemas

## Architecture

### Core Components

1. **Contract Validation Utility** (`src/lib/heyapi/contract-validation.ts`)
   - Defines endpoint-to-schema mapping
   - Provides context-aware validation functions
   - Creates contract-aware fetch implementation

2. **Enhanced HeyAPI Client** (`src/lib/heyapi/client.gen.ts`)
   - Integrates contract validation into the client
   - Uses custom fetch for request/response validation

3. **Auto-generated SDK** (`src/lib/heyapi/sdk.gen.ts`)
   - Provides type-safe methods for all API endpoints
   - Includes built-in request/response validators

## Usage

### Basic Usage

```typescript
import { postApiProducts, getApiProducts } from "@/lib/heyapi/sdk.gen";

// Valid request - passes validation
const validProduct = {
  name: "Test Product",
  description: "A test product",
  price: 99.99,
  stockQuantity: 10,
  categoryId: "00000000-0000-0000-0000-000000000000",
};

const response = await postApiProducts({
  body: validProduct,
});

// Invalid request - fails validation (context-aware)
const invalidProduct = {
  name: "", // Invalid: empty string
  price: -10, // Invalid: negative price
  // Missing required fields
};

try {
  await postApiProducts({
    body: invalidProduct as any,
  });
} catch (error) {
  // In CI: throws error
  // In dev: logs error, continues
  console.error("Validation failed:", error);
}
```

### GET Requests

```typescript
// Valid GET request
const products = await getApiProducts({
  query: {
    page: 1,
    pageSize: 10,
  },
});

// Invalid GET request (wrong query params)
try {
  await getApiProducts({
    query: {
      page: 0, // Invalid: should be positive
      pageSize: 1000, // Invalid: too large
    },
  });
} catch (error) {
  // Handled based on environment
}
```

## Configuration

### Environment Variables

```bash
# Enable strict mode (fail on contract violations)
CI=true
NODE_ENV=test

# Development mode (log violations, continue execution)
NODE_ENV=development
```

### Schema Mapping

The contract validation system uses a mapping of endpoints to schemas:

```typescript
export const ENDPOINT_SCHEMAS: EndpointSchemaMap = {
  "/api/products": {
    request: {
      GET: undefined, // No request body for GET
      POST: CreateProductRequestSchema,
    },
    response: {
      GET: PaginatedProductsResponseSchema,
      POST: ProductSchema,
    },
  },
  "/api/products/{id}": {
    request: {
      GET: undefined,
      PUT: UpdateProductRequestSchema,
      DELETE: undefined,
    },
    response: {
      GET: ProductWithCategorySchema,
      PUT: ProductSchema,
      DELETE: z.object({ message: z.string() }),
    },
  },
  // ... more endpoints
};
```

## Testing

### Run Contract Validation Tests

```bash
npm run test:heyapi-contract
```

This will test:
- Valid requests and responses
- Invalid requests (context-aware behavior)
- Different HTTP methods
- Various data types

### Test Output Example

```
🧪 Testing HeyAPI Contract Validation...

✅ Test 1: Valid product creation
   ✓ Valid product creation passed validation
   Response: { id: "...", name: "Test Product", ... }

⚠️  Test 2: Invalid product creation (missing fields)
[REQUEST CONTRACT VIOLATION] POST /api/products: name: String must contain at least 1 character(s), price: Number must be greater than 0
   ✓ Request continued despite validation errors (development mode)

✅ Test 3: Valid GET request
   ✓ Valid GET request passed validation
   Response structure: { data: true, page: "number", total: "number" }

🎉 HeyAPI Contract Validation Testing Completed!
```

## Integration with Existing Code

### React Components

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { getApiProducts, postApiProducts } from "@/lib/heyapi/sdk.gen";

// Query with automatic validation
const { data: products } = useQuery({
  queryKey: ["products"],
  queryFn: () => getApiProducts({ query: { page: 1, pageSize: 10 } }),
});

// Mutation with automatic validation
const createProduct = useMutation({
  mutationFn: (productData: any) => 
    postApiProducts({ body: productData }),
});
```

### Server Actions

```typescript
"use server";

import { postApiProducts } from "@/lib/heyapi/sdk.gen";

export async function createProduct(formData: FormData) {
  const productData = {
    name: formData.get("name") as string,
    price: parseFloat(formData.get("price") as string),
    stockQuantity: parseInt(formData.get("stockQuantity") as string),
    categoryId: formData.get("categoryId") as string,
  };

  // Automatic validation happens here
  const result = await postApiProducts({ body: productData });
  return result;
}
```

## Error Handling

### Context-Aware Error Handling

```typescript
try {
  await postApiProducts({ body: invalidData });
} catch (error) {
  if (error.message.includes("[REQUEST CONTRACT VIOLATION]")) {
    // Handle contract violation
    console.error("Request data doesn't match API contract:", error);
    
    // In development: continue with user-friendly message
    // In CI: fail the build
  } else {
    // Handle other errors (network, server, etc.)
    console.error("Request failed:", error);
  }
}
```

### Custom Error Handling

```typescript
// Override client configuration for specific requests
const response = await postApiProducts({
  body: productData,
  client: createClient({
    ...contractValidationConfig,
    throwOnError: true, // Always throw on validation errors
  }),
});
```

## Best Practices

### 1. Schema Design

- **Request schemas**: Focus on input validation and business rules
- **Response schemas**: Match the actual API response structure
- **Use transformations**: Convert between client and server data formats

### 2. Error Handling

```typescript
// Always handle contract violations gracefully
try {
  await postApiProducts({ body: data });
} catch (error) {
  if (error.message.includes("[REQUEST CONTRACT VIOLATION]")) {
    // Log for debugging, show user-friendly message
    console.error("Data validation failed:", error);
    throw new Error("Please check your input and try again");
  }
  throw error;
}
```

### 3. Testing Strategy

- **Unit tests**: Test individual schemas and transformations
- **Integration tests**: Use the contract validation tests
- **E2E tests**: Include contract validation in user workflows

### 4. Performance Considerations

- **Development**: Contract validation adds minimal overhead
- **Production**: Consider disabling validation for performance-critical paths
- **Caching**: Cache parsed schemas when possible

## Troubleshooting

### Common Issues

1. **Schema Mismatches**: Ensure request/response schemas match actual API behavior
2. **Type Errors**: Use proper TypeScript types derived from Zod schemas
3. **Environment Detection**: Verify `NODE_ENV` and `CI` variables are set correctly

### Debug Mode

Enable detailed logging:

```typescript
// In development
console.log("Endpoint:", endpoint);
console.log("Method:", method);
console.log("Request data:", requestData);
```

### Validation Errors

Common validation error patterns:

```typescript
// Missing required fields
"name: Required"

// Type mismatches  
"price: Expected number, received string"

// Format violations
"email: Invalid email"
"categoryId: Invalid uuid"
```

## Migration Guide

### From Manual Fetch

```typescript
// Before
const response = await fetch("/api/products", {
  method: "POST",
  body: JSON.stringify(data),
  headers: { "Content-Type": "application/json" }
});

// After
const response = await postApiProducts({ body: data });
```

### From Axios

```typescript
// Before
const response = await axios.post("/api/products", data);

// After
const response = await postApiProducts({ body: data });
```

## Future Enhancements

- **Automatic schema inference**: Generate schemas from TypeScript types
- **Performance monitoring**: Track validation overhead
- **Schema versioning**: Handle API version changes gracefully
- **Visual debugging**: Browser extension for contract violations

---

This HeyAPI bi-directional contract testing system ensures your API contracts are enforced at the client level, providing type safety and runtime validation with context-aware behavior. 