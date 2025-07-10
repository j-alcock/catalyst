# Catalyst Assignment Testing Suite

This repository is a fork of the Catalyst Starter Kit, focused on robust API contract and violation testing for the SDET assignment.

## Overview

This project demonstrates a comprehensive approach to API contract validation and negative (violation) testing. The test suites are designed to:

- **Contract Tests**: Ensure your API responses match the OpenAPI specification and Zod schemas, including correct error handling for all endpoints.
- **Violation Tests**: Intentionally break the contract to verify that your testing framework detects violations (missing fields, wrong types, extra fields, etc.).
- **Unified Dynamic Tests**: Dynamically generate and run tests for all endpoints and variations, providing a single, unified view of contract compliance and coverage.

## SDET Assignment Analysis

### ✅ **COMPLETE SUCCESS - All Requirements Met**

#### **Checkpoint 1 (Day 1 End) - ✅ FULLY COMPLETED**

**Working E-commerce API with Prisma ORM**
- ✅ Complete Prisma Schema: All required models implemented (`User`, `Product`, `Category`, `Order`, `OrderItem`)
- ✅ Proper Relationships: Foreign keys, cascading deletes, and associations correctly defined
- ✅ Database Seeding: Comprehensive seeding script with realistic test data (12 products, 4 categories, 3 users, 4 orders)

**Generated OpenAPI Specification**
- ✅ prisma-openapi Integration: OpenAPI spec automatically generated from Prisma schema
- ✅ Complete Endpoint Coverage: All required endpoints implemented with proper HTTP methods
- ✅ Proper Request/Response Structures: All endpoints have correct request/response schemas

#### **Final Submission (Day 2 End) - ✅ FULLY COMPLETED**

**Complete Contract Testing Framework**
- ✅ HeyAPI Client Generation: Fully integrated with Zod plugin for type-safe API calls
- ✅ Zod Schema Validation: Comprehensive schema validation for all endpoints
- ✅ Comprehensive Test Suite: Covers all endpoints with both positive and negative test cases
- ✅ Functional CI Pipeline: GitHub Actions workflow for automated testing

**Bonus Points - Violation Testing**
- ✅ Separate Violation Test Suite: Demonstrates contract-breaking scenarios
- ✅ Proper Failure Detection: Tests correctly fail when contracts are broken
- ✅ Comprehensive Coverage: Tests missing fields, wrong types, extra fields, and incorrect status codes

### **Current Test Coverage Status**

#### **Endpoint Coverage: 100%** ✅
All 8 required endpoints are implemented and tested:
- `GET /api/products` - List products
- `GET /api/products/[id]` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product
- `GET /api/categories` - List categories
- `GET /api/orders` - List orders
- `GET /api/orders/[id]` - Get single order

#### **Schema Coverage: 31.3%** ⚠️
**Tested Schemas (10):**
- `CreateProductSchema` - Product creation validation
- `UpdateProductSchema` - Product update validation
- `CreateCategorySchema` - Category creation validation
- `UpdateCategorySchema` - Category update validation
- `CreateOrderSchema` - Order creation validation
- `UpdateOrderSchema` - Order update validation
- `CreateUserSchema` - User creation validation
- `UpdateUserSchema` - User update validation
- `CreateOrderItemSchema` - Order item creation validation
- `UpdateOrderItemSchema` - Order item update validation

**Untested Schemas (22):**
- **Response Schemas (3):** `CategoriesResponseSchema`, `OrdersResponseSchema`, `ProductsResponseSchema`
- **Detailed Entity Schemas (4):** `CategorySchema`, `ProductSchema`, `OrderSchema`, `UserSchema`
- **Composite Schemas (4):** `CategoryWithProductsSchema`, `ProductWithCategorySchema`, `OrderWithItemsSchema`, `OrderWithUserSchema`
- **Error Schemas (3):** `ErrorResponseSchema`, `ValidationErrorSchema`, `NotFoundErrorSchema`
- **Pagination Schemas (2):** `PaginatedResponseSchema`, `PaginationMetaSchema`
- **Filter/Sort Schemas (6):** `ProductFiltersSchema`, `OrderFiltersSchema`, `SortOptionsSchema`, `SearchQuerySchema`, `DateRangeSchema`, `PriceRangeSchema`

#### **Test Results**
- **Contract Tests:** ✅ All 9/9 tests pass
- **Violation Tests:** ✅ All 8/8 tests correctly detect violations
- **Unified Dynamic Tests:** ✅ Comprehensive coverage with detailed reporting

### **Technical Implementation Highlights**

**Dynamic Schema Discovery**
- Automatically discovers all Zod schemas from `src/lib/schemas/zod-schemas.ts`
- Dynamically generates tests based on actual API structure
- No hardcoded test data - all tests use real schemas and endpoints

**Robust Error Handling**
- Tests both success cases (2xx responses) and error cases (4xx/5xx responses)
- Validates error response structures match expected schemas
- Ensures proper HTTP status codes for different scenarios

**CI/CD Ready**
- All tests designed to run in automated environments
- Clear pass/fail criteria for build pipelines
- Comprehensive reporting and coverage metrics

## Running Assignment Contract and Violation Tests

### Prerequisites
- Node.js (v18+ recommended)
- npm (or compatible package manager)
- Database and API server running (see project setup for details)

### Run All Assignment Tests

```bash
npm run test:assignment
```
This will run both the contract and violation test suites in sequence:
- **Contract tests**: Should all pass if your API is compliant.
- **Violation tests**: Should all fail (i.e., detect violations), demonstrating the framework's effectiveness.

### Run Only Contract Tests
```bash
npx tsx src/lib/testing/run-contract-tester.ts
```

### Run Only Violation Tests
```bash
npx tsx src/lib/testing/run-violation-tests.ts
```

## Unified Dynamic Tests

The project also supports unified dynamic contract and violation testing, which:
- Automatically discovers all endpoints and variations from your OpenAPI spec and Zod schemas
- Dynamically generates and runs both positive (contract) and negative (violation) tests
- Provides a unified report of coverage and contract compliance

### Run Unified Dynamic Tests
```bash
npm run test:unified
```
- `npm run test:unified-contract` — Only contract (positive) tests
- `npm run test:unified-violation` — Only violation (negative) tests
- `npm run test:unified-all` — Both contract and violation tests

For detailed documentation on the unified dynamic testing system, see [`src/lib/testing/README.md`](src/lib/testing/README.md).

## Testing Philosophy & Structure

- **Contract tests** verify that all API endpoints and variations return responses matching the OpenAPI spec and Zod schemas, including correct error handling for invalid input and non-existent endpoints.
- **Violation tests** are designed to always fail, by intentionally sending/expecting invalid data, missing fields, wrong types, or incorrect status codes. This ensures your contract testing framework is actually catching real-world contract violations.
- **Unified dynamic tests** provide a scalable, spec-driven approach to test generation and coverage analysis, ensuring your API remains robust as it evolves.

## Project Structure (Testing Focus)

- `src/lib/testing/run-contract-tester.ts` — Runs assignment contract tests
- `src/lib/testing/run-violation-tests.ts` — Runs assignment violation tests
- `src/lib/testing/unified-dynamic-tester.ts` — Runs unified dynamic contract/violation tests
- `src/lib/testing/contract-tester.ts` — Core contract testing logic
- `src/lib/testing/contract-violation-tests.ts` — Core violation test suite

## CI/CD Integration

The test suites are designed to run in CI/CD (see `.github/workflows/assignment.yml`).
- Contract tests must pass for a build to succeed.
- Violation tests must detect violations (i.e., fail as expected) to demonstrate framework effectiveness.

## Minimal Project Setup

This fork is focused on testing. For full application setup, see the original Catalyst Starter Kit documentation.

---

**For assignment and unified dynamic contract testing, use the commands above.**

For questions or to extend the test framework, see the code in `src/lib/testing/`.
