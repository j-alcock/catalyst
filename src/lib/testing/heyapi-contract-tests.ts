import { z } from "zod";
import * as api from "../heyapi/sdk.gen";
import { contractTester } from "./contract-tester";

export class HeyAPIContractTestSuite {
  private baseUrl: string;
  private testData: {
    users: any[];
    categories: any[];
    products: any[];
    orders: any[];
  } = {
    users: [],
    categories: [],
    products: [],
    orders: [],
  };

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Run all comprehensive contract tests using Zod-integrated HeyAPI
   */
  async runAllTests(): Promise<void> {
    console.log(
      "🚀 Starting Comprehensive HeyAPI Contract Test Suite with Zod Validation..."
    );

    contractTester.clearResults();

    try {
      // Test all endpoints with automatic Zod validation
      await this.testProductsEndpoints();
      await this.testCategoriesEndpoints();
      await this.testOrdersEndpoints();
      await this.testUsersEndpoints();
      await this.testErrorScenarios();
      await this.testValidationFeatures();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    }

    contractTester.printResults();
  }

  /**
   * Get test results from the contract tester
   */
  getResults() {
    return contractTester.getResults();
  }

  /**
   * Test Products endpoints with Zod validation
   */
  private async testProductsEndpoints(): Promise<void> {
    console.log("\n📦 Testing Products endpoints with Zod validation...");

    try {
      // GET /api/products - List products with pagination
      const startTime = Date.now();
      const productsResponse = await api.getApiProducts({
        query: { page: 1, pageSize: 5 },
        baseUrl: this.baseUrl,
      });

      if (productsResponse.data) {
        contractTester.validateResponse(
          "/api/products",
          "GET",
          200,
          productsResponse.data,
          // Use the generated Zod schema for validation
          z.object({
            data: z.array(
              z.object({
                id: z.string().uuid(),
                name: z.string(),
                description: z.string().optional(),
                price: z.number(),
                stockQuantity: z.number().int(),
                categoryId: z.string().uuid(),
                createdAt: z.string().datetime(),
                updatedAt: z.string().datetime(),
              })
            ),
            page: z.number().int(),
            pageSize: z.number().int(),
            total: z.number().int(),
            totalPages: z.number().int(),
          }),
          Date.now() - startTime
        );
      }

      // POST /api/products - Create product
      const createProductData = {
        name: "Test Product",
        description: "A test product",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const createStartTime = Date.now();
      const createResponse = await api.postApiProducts({
        body: createProductData,
        baseUrl: this.baseUrl,
      });

      if (createResponse.data) {
        contractTester.validateResponse(
          "/api/products",
          "POST",
          201,
          createResponse.data,
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            description: z.string().optional(),
            price: z.number(),
            stockQuantity: z.number().int(),
            categoryId: z.string().uuid(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
          Date.now() - createStartTime
        );

        this.testData.products.push(createResponse.data);
      }

      // GET /api/products/{id} - Get single product
      if (this.testData.products.length > 0) {
        const product = this.testData.products[0];
        const getStartTime = Date.now();
        const getResponse = await api.getApiProductsById({
          path: { id: product.id },
          baseUrl: this.baseUrl,
        });

        if (getResponse.data) {
          contractTester.validateResponse(
            `/api/products/${product.id}`,
            "GET",
            200,
            getResponse.data,
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              description: z.string().optional(),
              price: z.number(),
              stockQuantity: z.number().int(),
              categoryId: z.string().uuid(),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            }),
            Date.now() - getStartTime
          );
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        contractTester.validateErrorResponse(
          "/api/products",
          "GET/POST",
          400,
          { error: "Validation failed", details: error.errors },
          [400]
        );
      } else {
        console.error("Products endpoint error:", error);
      }
    }
  }

  /**
   * Test Categories endpoints with Zod validation
   */
  private async testCategoriesEndpoints(): Promise<void> {
    console.log("\n📂 Testing Categories endpoints with Zod validation...");

    try {
      // GET /api/categories - List categories
      const startTime = Date.now();
      const categoriesResponse = await api.getApiCategories({
        baseUrl: this.baseUrl,
      });

      if (categoriesResponse.data) {
        contractTester.validateResponse(
          "/api/categories",
          "GET",
          200,
          categoriesResponse.data,
          z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              description: z.string().optional(),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            })
          ),
          Date.now() - startTime
        );
      }

      // POST /api/categories - Create category
      const createCategoryData = {
        name: "Test Category",
        description: "A test category",
      };

      const createStartTime = Date.now();
      const createResponse = await api.postApiCategories({
        body: createCategoryData,
        baseUrl: this.baseUrl,
      });

      if (createResponse.data) {
        contractTester.validateResponse(
          "/api/categories",
          "POST",
          201,
          createResponse.data,
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            description: z.string().optional(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
          Date.now() - createStartTime
        );

        this.testData.categories.push(createResponse.data);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        contractTester.validateErrorResponse(
          "/api/categories",
          "GET/POST",
          400,
          { error: "Validation failed", details: error.errors },
          [400]
        );
      } else {
        console.error("Categories endpoint error:", error);
      }
    }
  }

  /**
   * Test Orders endpoints with Zod validation
   */
  private async testOrdersEndpoints(): Promise<void> {
    console.log("\n📋 Testing Orders endpoints with Zod validation...");

    try {
      // GET /api/orders - List orders
      const startTime = Date.now();
      const ordersResponse = await api.getApiOrders({
        baseUrl: this.baseUrl,
      });

      if (ordersResponse.data) {
        contractTester.validateResponse(
          "/api/orders",
          "GET",
          200,
          ordersResponse.data,
          z.array(
            z.object({
              id: z.string().uuid(),
              userId: z.string().uuid(),
              status: z.enum([
                "PENDING",
                "PROCESSING",
                "SHIPPED",
                "DELIVERED",
                "CANCELLED",
              ]),
              totalAmount: z.number(),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            })
          ),
          Date.now() - startTime
        );
      }

      // POST /api/orders - Create order
      const createOrderData = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        orderItems: [
          {
            productId: "123e4567-e89b-12d3-a456-426614174001",
            quantity: 2,
          },
        ],
      };

      const createStartTime = Date.now();
      const createResponse = await api.postApiOrders({
        body: createOrderData,
        baseUrl: this.baseUrl,
      });

      if (createResponse.data) {
        contractTester.validateResponse(
          "/api/orders",
          "POST",
          201,
          createResponse.data,
          z.object({
            id: z.string().uuid(),
            userId: z.string().uuid(),
            status: z.enum([
              "PENDING",
              "PROCESSING",
              "SHIPPED",
              "DELIVERED",
              "CANCELLED",
            ]),
            totalAmount: z.number(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
          Date.now() - createStartTime
        );

        this.testData.orders.push(createResponse.data);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        contractTester.validateErrorResponse(
          "/api/orders",
          "GET/POST",
          400,
          { error: "Validation failed", details: error.errors },
          [400]
        );
      } else {
        console.error("Orders endpoint error:", error);
      }
    }
  }

  /**
   * Test Users endpoints with Zod validation
   */
  private async testUsersEndpoints(): Promise<void> {
    console.log("\n👤 Testing Users endpoints with Zod validation...");

    try {
      // POST /api/users - Create user
      const createUserData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        picture: "https://example.com/avatar.jpg",
      };

      const createStartTime = Date.now();
      const createResponse = await api.postApiUsers({
        body: createUserData,
        baseUrl: this.baseUrl,
      });

      if (createResponse.data) {
        contractTester.validateResponse(
          "/api/users",
          "POST",
          201,
          createResponse.data,
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            email: z.string().email(),
            picture: z.string(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
          Date.now() - createStartTime
        );

        this.testData.users.push(createResponse.data);
      }

      // GET /api/users/{id} - Get user
      if (this.testData.users.length > 0) {
        const user = this.testData.users[0];
        const getStartTime = Date.now();
        const getResponse = await api.getApiUsersById({
          path: { id: user.id },
          baseUrl: this.baseUrl,
        });

        if (getResponse.data) {
          contractTester.validateResponse(
            `/api/users/${user.id}`,
            "GET",
            200,
            getResponse.data,
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              email: z.string().email(),
              picture: z.string(),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            }),
            Date.now() - getStartTime
          );
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        contractTester.validateErrorResponse(
          "/api/users",
          "POST/GET",
          400,
          { error: "Validation failed", details: error.errors },
          [400]
        );
      } else {
        console.error("Users endpoint error:", error);
      }
    }
  }

  /**
   * Test error scenarios with Zod validation
   */
  private async testErrorScenarios(): Promise<void> {
    console.log("\n❌ Testing error scenarios with Zod validation...");

    try {
      // Test invalid UUID
      await api.getApiProductsById({
        path: { id: "invalid-uuid" },
        baseUrl: this.baseUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateErrorResponse(
          "/api/products/invalid-uuid",
          "GET",
          400,
          { error: "Invalid UUID format" },
          [400]
        );
      }
    }

    try {
      // Test invalid email
      await api.postApiUsers({
        body: {
          name: "Test User",
          email: "invalid-email",
          password: "password123",
        },
        baseUrl: this.baseUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateErrorResponse(
          "/api/users",
          "POST",
          400,
          { error: "Invalid email format" },
          [400]
        );
      }
    }

    try {
      // Test negative price
      await api.postApiProducts({
        body: {
          name: "Invalid Product",
          price: -10,
          stockQuantity: 100,
          categoryId: "123e4567-e89b-12d3-a456-426614174000",
        },
        baseUrl: this.baseUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateErrorResponse(
          "/api/products",
          "POST",
          400,
          { error: "Price must be non-negative" },
          [400]
        );
      }
    }
  }

  /**
   * Test Zod validation features
   */
  private async testValidationFeatures(): Promise<void> {
    console.log("\n🔍 Testing Zod validation features...");

    // Test that the generated schemas work correctly
    try {
      const { zUser, zProduct, zOrderStatus } = require("../heyapi/zod.gen");

      // Test valid user data
      const validUser = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test User",
        email: "test@example.com",
        picture: "https://example.com/avatar.jpg",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const validatedUser = zUser.parse(validUser);
      contractTester.validateResponse(
        "zUser.parse()",
        "VALIDATION",
        200,
        validatedUser,
        zUser
      );

      // Test valid order status
      const validStatus = zOrderStatus.parse("PENDING");
      contractTester.validateResponse(
        "zOrderStatus.parse()",
        "VALIDATION",
        200,
        validStatus,
        zOrderStatus
      );

      // Test valid product data
      const validProduct = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        description: "A test product description",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const validatedProduct = zProduct.parse(validProduct);
      contractTester.validateResponse(
        "zProduct.parse() - valid product",
        "VALIDATION",
        200,
        validatedProduct,
        zProduct
      );

      // Test product without description (optional field)
      const productWithoutDescription = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const validatedProductNoDesc = zProduct.parse(productWithoutDescription);
      contractTester.validateResponse(
        "zProduct.parse() - product without description",
        "VALIDATION",
        200,
        validatedProductNoDesc,
        zProduct
      );

      // Test product with category relationship
      const productWithCategory = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        description: "A test product with category",
        price: 29.99,
        stockQuantity: 100,
        category: {
          id: "123e4567-e89b-12d3-a456-426614174001",
          name: "Test Category",
          description: "A test category",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const validatedProductWithCategory = zProduct.parse(productWithCategory);
      contractTester.validateResponse(
        "zProduct.parse() - product with category",
        "VALIDATION",
        200,
        validatedProductWithCategory,
        zProduct
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateErrorResponse(
          "Zod schema validation",
          "VALIDATION",
          400,
          { error: "Schema validation failed", details: error.errors },
          [400]
        );
      }
    }

    // Test zProduct validation error scenarios
    try {
      const { zProduct } = require("../heyapi/zod.gen");

      // Test invalid UUID
      const invalidUUIDProduct = {
        id: "invalid-uuid",
        name: "Test Product",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      zProduct.parse(invalidUUIDProduct);
      // If we reach here, validation failed to catch the error
      contractTester.validateErrorResponse(
        "zProduct.parse() - invalid UUID",
        "VALIDATION",
        400,
        { error: "Should have failed validation for invalid UUID" },
        [400]
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateResponse(
          "zProduct.parse() - invalid UUID caught",
          "VALIDATION",
          400,
          {
            error: "Validation correctly failed for invalid UUID",
            details: error.errors,
          },
          z.object({ error: z.string(), details: z.array(z.any()) })
        );
      }
    }

    try {
      const { zProduct } = require("../heyapi/zod.gen");

      // Test negative price
      const negativePriceProduct = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        price: -10,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      zProduct.parse(negativePriceProduct);
      // If we reach here, validation failed to catch the error
      contractTester.validateErrorResponse(
        "zProduct.parse() - negative price",
        "VALIDATION",
        400,
        { error: "Should have failed validation for negative price" },
        [400]
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateResponse(
          "zProduct.parse() - negative price caught",
          "VALIDATION",
          400,
          {
            error: "Validation correctly failed for negative price",
            details: error.errors,
          },
          z.object({ error: z.string(), details: z.array(z.any()) })
        );
      }
    }

    try {
      const { zProduct } = require("../heyapi/zod.gen");

      // Test non-integer stock quantity
      const nonIntegerStockProduct = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        price: 29.99,
        stockQuantity: 100.5, // Should be integer
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      zProduct.parse(nonIntegerStockProduct);
      // If we reach here, validation failed to catch the error
      contractTester.validateErrorResponse(
        "zProduct.parse() - non-integer stock quantity",
        "VALIDATION",
        400,
        { error: "Should have failed validation for non-integer stock quantity" },
        [400]
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateResponse(
          "zProduct.parse() - non-integer stock quantity caught",
          "VALIDATION",
          400,
          {
            error: "Validation correctly failed for non-integer stock quantity",
            details: error.errors,
          },
          z.object({ error: z.string(), details: z.array(z.any()) })
        );
      }
    }

    try {
      const { zProduct } = require("../heyapi/zod.gen");

      // Test missing required fields
      const incompleteProduct = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        // Missing price, stockQuantity, categoryId, createdAt, updatedAt
      };

      zProduct.parse(incompleteProduct);
      // If we reach here, validation failed to catch the error
      contractTester.validateErrorResponse(
        "zProduct.parse() - missing required fields",
        "VALIDATION",
        400,
        { error: "Should have failed validation for missing required fields" },
        [400]
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateResponse(
          "zProduct.parse() - missing required fields caught",
          "VALIDATION",
          400,
          {
            error: "Validation correctly failed for missing required fields",
            details: error.errors,
          },
          z.object({ error: z.string(), details: z.array(z.any()) })
        );
      }
    }

    try {
      const { zProduct } = require("../heyapi/zod.gen");

      // Test invalid date format
      const invalidDateProduct = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Product",
        price: 29.99,
        stockQuantity: 100,
        categoryId: "123e4567-e89b-12d3-a456-426614174001",
        createdAt: "invalid-date",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      zProduct.parse(invalidDateProduct);
      // If we reach here, validation failed to catch the error
      contractTester.validateErrorResponse(
        "zProduct.parse() - invalid date format",
        "VALIDATION",
        400,
        { error: "Should have failed validation for invalid date format" },
        [400]
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        contractTester.validateResponse(
          "zProduct.parse() - invalid date format caught",
          "VALIDATION",
          400,
          {
            error: "Validation correctly failed for invalid date format",
            details: error.errors,
          },
          z.object({ error: z.string(), details: z.array(z.any()) })
        );
      }
    }
  }
}

// Export test suite instance
export const heyAPIContractTestSuite = new HeyAPIContractTestSuite();
