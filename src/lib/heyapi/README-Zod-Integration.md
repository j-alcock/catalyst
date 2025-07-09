# Zod Plugin Integration with HeyAPI

This document explains how to use the Zod plugin with HeyAPI for automatic request and response validation.

## Overview

The Zod plugin for HeyAPI provides:
- **Automatic request validation** - validates data before sending to the API
- **Automatic response validation** - validates data after receiving from the API
- **Type safety** - TypeScript types with runtime validation
- **Error handling** - Detailed validation error messages
- **Generated schemas** - Zod schemas automatically generated from your OpenAPI spec

## Configuration

### 1. Update HeyAPI Configuration

In your `heyapi.config.ts`:

```typescript
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./src/lib/openapi/api-spec.yaml",
  output: "./src/lib/heyapi",
  plugins: [
    'zod', // Enable Zod plugin
    {
      name: '@hey-api/sdk',
      validator: true, // Enable validators in SDK
    },
  ],
});
```

### 2. Regenerate the Client

```bash
npx @hey-api/openapi-ts -f heyapi.config.ts
```

This will generate:
- `zod.gen.ts` - Zod schemas for all your API endpoints
- Updated `sdk.gen.ts` - SDK functions with built-in validation

## Generated Files

### Zod Schemas (`zod.gen.ts`)

The plugin generates Zod schemas for:

#### Entity Schemas
```typescript
export const zUser = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  picture: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const zProduct = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  stockQuantity: z.number().int(),
  categoryId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
```

#### Request Schemas
```typescript
export const zPostApiProductsData = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    price: z.number().gte(0),
    stockQuantity: z.number().int().gte(0),
    categoryId: z.string().uuid()
  }),
  path: z.never().optional(),
  query: z.never().optional()
});
```

#### Response Schemas
```typescript
export const zPostApiProductsResponse = zProduct;
```

### SDK Functions with Validation

Each SDK function now includes automatic validation:

```typescript
export const postApiProducts = <ThrowOnError extends boolean = false>(
  options: Options<PostApiProductsData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<PostApiProductsResponses, PostApiProductsErrors, ThrowOnError>({
    requestValidator: async (data) => {
      return await zPostApiProductsData.parseAsync(data);
    },
    responseValidator: async (data) => {
      return await zPostApiProductsResponse.parseAsync(data);
    },
    url: '/api/products',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};
```

## Usage Examples

### Basic API Call with Validation

```typescript
import * as api from './sdk.gen';

// This automatically validates both request and response
const response = await api.postApiProducts({
  body: {
    name: "Sample Product",
    description: "A sample product",
    price: 29.99,
    stockQuantity: 100,
    categoryId: "123e4567-e89b-12d3-a456-426614174000"
  }
});

// response.data is validated and typed
console.log(response.data);
```

### Error Handling

```typescript
try {
  const response = await api.postApiProducts({
    body: {
      name: "Invalid Product",
      price: -10, // This will fail validation
      stockQuantity: 100,
      categoryId: "123e4567-e89b-12d3-a456-426614174000"
    }
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("Validation errors:");
    error.errors.forEach(err => {
      console.log(`- ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error("API error:", error);
  }
}
```

### Query Parameter Validation

```typescript
// Query parameters are automatically validated
const response = await api.getApiProducts({
  query: {
    page: 1,
    pageSize: 10 // Must be between 1-100
  }
});
```

### Path Parameter Validation

```typescript
// Path parameters are automatically validated
const response = await api.getApiProductsById({
  path: {
    id: "123e4567-e89b-12d3-a456-426614174000" // Must be valid UUID
  }
});
```

### Complex Validation

```typescript
// Nested objects and arrays are validated
const response = await api.postApiOrders({
  body: {
    userId: "123e4567-e89b-12d3-a456-426614174000",
    orderItems: [
      {
        productId: "123e4567-e89b-12d3-a456-426614174001",
        quantity: 2 // Must be >= 1
      }
    ] // Array must have at least 1 item
  }
});
```

## Using Generated Schemas Directly

You can also use the generated Zod schemas directly:

```typescript
import { zUser, zProduct, zOrderStatus } from './zod.gen';

// Validate user data
const userData = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "John Doe",
  email: "john@example.com",
  picture: "https://example.com/avatar.jpg",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
};

try {
  const validatedUser = zUser.parse(userData);
  console.log("Valid user:", validatedUser);
} catch (error) {
  console.error("Invalid user data:", error);
}

// Validate enum values
const status = zOrderStatus.parse("PENDING");
```

## Extending Generated Schemas

You can extend the generated schemas for custom validation:

```typescript
import { zUser } from './zod.gen';
import { z } from 'zod';

// Create a custom schema that extends the generated one
const zUserWithPassword = zUser.extend({
  password: z.string().min(8)
});

// Use it for validation
const userWithPassword = {
  ...userData,
  password: "securepassword123"
};

const validated = zUserWithPassword.parse(userWithPassword);
```

## Custom Client with Validation

```typescript
import { createClient } from './client';

// Create a custom client
const customClient = createClient({
  baseUrl: 'http://localhost:3000',
});

// Use the custom client with validation
const response = await api.getApiProducts({
  client: customClient,
  query: { page: 1, pageSize: 5 }
});
```

## Validation Features

### Request Validation
- **Body validation** - Validates request body against schema
- **Query validation** - Validates query parameters
- **Path validation** - Validates path parameters
- **Header validation** - Validates request headers (if defined)

### Response Validation
- **Data validation** - Validates response data structure
- **Type checking** - Ensures response matches expected types
- **Required fields** - Validates required fields are present
- **Optional fields** - Handles optional fields correctly

### Error Handling
- **Detailed error messages** - Specific validation error messages
- **Field-level errors** - Errors for specific fields
- **Nested object errors** - Errors for nested objects and arrays
- **Type errors** - Errors for type mismatches

## Benefits

1. **Runtime Safety** - Catch validation errors at runtime
2. **Type Safety** - TypeScript types with runtime validation
3. **Automatic Validation** - No need to manually validate requests/responses
4. **Consistent Validation** - Same validation rules across all endpoints
5. **Error Handling** - Detailed error messages for debugging
6. **Generated Code** - No need to write validation schemas manually
7. **OpenAPI Integration** - Validation based on your OpenAPI specification

## Best Practices

1. **Always handle validation errors** - Catch and handle `ZodError` instances
2. **Use TypeScript** - Leverage type safety with runtime validation
3. **Test validation** - Test both valid and invalid data scenarios
4. **Customize schemas** - Extend generated schemas for custom validation
5. **Error logging** - Log validation errors for debugging
6. **User feedback** - Provide user-friendly error messages

## Troubleshooting

### Common Issues

1. **Validation errors not caught** - Make sure to catch `ZodError` instances
2. **Type mismatches** - Check that your data matches the expected types
3. **Missing fields** - Ensure required fields are provided
4. **Invalid formats** - Check UUID, email, and date formats

### Debugging

```typescript
try {
  const response = await api.postApiProducts(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("Validation errors:");
    console.log(JSON.stringify(error.errors, null, 2));
  }
}
```

## Migration from Manual Validation

If you were previously using manual validation:

1. **Remove manual validation** - Delete custom validation code
2. **Update error handling** - Handle `ZodError` instead of custom errors
3. **Update types** - Use generated types instead of manual types
4. **Test thoroughly** - Ensure all validation scenarios work correctly

## Performance Considerations

- **Validation overhead** - Minimal performance impact for most use cases
- **Error handling** - Validation errors are thrown, not returned
- **Caching** - Generated schemas are cached for performance
- **Bundle size** - Zod adds to bundle size but provides significant benefits 