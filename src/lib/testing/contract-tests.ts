import { createServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import request from "supertest";
import {
  CategoriesResponseSchema,
  CategorySchema,
  CategoryWithProductsSchema,
  CreateCategoryRequestSchema,
  CreateOrderRequestSchema,
  CreateProductRequestSchema,
  CreateUserRequestSchema,
  ErrorResponseSchema,
  OrderWithItemsSchema,
  OrdersResponseSchema,
  PaginatedProductsResponseSchema,
  ProductWithCategorySchema,
  ProductsResponseSchema,
  UpdateOrderStatusRequestSchema,
  UserSchema,
} from "../schemas/zod-schemas";
import { contractTester } from "./contract-tester";

// Mock Next.js app for testing
// In a real scenario, you'd import your actual Next.js app
const _mockApp = {
  // This would be your actual Next.js app
};

export class ContractTestSuite {
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
   * Run all contract tests
   */
  async runAllTests(): Promise<void> {
    console.log("🚀 Starting Contract Test Suite...");
    console.log(`📍 Testing API at: ${this.baseUrl}`);

    contractTester.clearResults();

    try {
      // Test Products endpoints
      await this.testProductsEndpoints();

      // Test Categories endpoints
      await this.testCategoriesEndpoints();

      // Test Orders endpoints
      await this.testOrdersEndpoints();

      // Test Users endpoints
      await this.testUsersEndpoints();

      // Test error scenarios
      await this.testErrorScenarios();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    }

    // Print results
    contractTester.printResults();
  }

  /**
   * Test Products API endpoints
   */
  private async testProductsEndpoints(): Promise<void> {
    console.log("\n📦 Testing Products endpoints...");

    // GET /api/products - List products with pagination
    const startTime = Date.now();
    const productsResponse = await request(this.baseUrl)
      .get("/api/products?page=1&pageSize=5")
      .expect(200);

    contractTester.validateResponse(
      "/api/products",
      "GET",
      productsResponse.status,
      productsResponse.body,
      PaginatedProductsResponseSchema,
      Date.now() - startTime
    );

    // POST /api/products - Create product
    const createProductData = {
      name: "Test Product",
      description: "A test product for contract testing",
      price: 29.99,
      stockQuantity: 100,
      categoryId: this.testData.categories[0]?.id || "test-category-id",
    };

    const createProductResponse = await request(this.baseUrl)
      .post("/api/products")
      .send(createProductData)
      .expect(201);

    contractTester.validateResponse(
      "/api/products",
      "POST",
      createProductResponse.status,
      createProductResponse.body,
      ProductWithCategorySchema
    );

    // Store created product for later tests
    this.testData.products.push(createProductResponse.body);

    // GET /api/products/:id - Get single product
    const productId = createProductResponse.body.id;
    const singleProductResponse = await request(this.baseUrl)
      .get(`/api/products/${productId}`)
      .expect(200);

    contractTester.validateResponse(
      `/api/products/${productId}`,
      "GET",
      singleProductResponse.status,
      singleProductResponse.body,
      ProductWithCategorySchema
    );

    // PUT /api/products/:id - Update product
    const updateProductData = {
      name: "Updated Test Product",
      price: 39.99,
    };

    const updateProductResponse = await request(this.baseUrl)
      .put(`/api/products/${productId}`)
      .send(updateProductData)
      .expect(200);

    contractTester.validateResponse(
      `/api/products/${productId}`,
      "PUT",
      updateProductResponse.status,
      updateProductResponse.body,
      ProductWithCategorySchema
    );
  }

  /**
   * Test Categories API endpoints
   */
  private async testCategoriesEndpoints(): Promise<void> {
    console.log("\n📂 Testing Categories endpoints...");

    // GET /api/categories - List categories
    const categoriesResponse = await request(this.baseUrl)
      .get("/api/categories")
      .expect(200);

    contractTester.validateResponse(
      "/api/categories",
      "GET",
      categoriesResponse.status,
      categoriesResponse.body,
      CategoriesResponseSchema
    );

    // Store categories for later tests
    this.testData.categories = categoriesResponse.body;

    // POST /api/categories - Create category
    const createCategoryData = {
      name: "Test Category",
      description: "A test category for contract testing",
    };

    const createCategoryResponse = await request(this.baseUrl)
      .post("/api/categories")
      .send(createCategoryData)
      .expect(201);

    contractTester.validateResponse(
      "/api/categories",
      "POST",
      createCategoryResponse.status,
      createCategoryResponse.body,
      CategorySchema
    );

    // GET /api/categories/:id - Get category with products
    const categoryId = createCategoryResponse.body.id;
    const singleCategoryResponse = await request(this.baseUrl)
      .get(`/api/categories/${categoryId}`)
      .expect(200);

    contractTester.validateResponse(
      `/api/categories/${categoryId}`,
      "GET",
      singleCategoryResponse.status,
      singleCategoryResponse.body,
      CategoryWithProductsSchema
    );
  }

  /**
   * Test Orders API endpoints
   */
  private async testOrdersEndpoints(): Promise<void> {
    console.log("\n🛒 Testing Orders endpoints...");

    // GET /api/orders - List orders
    const ordersResponse = await request(this.baseUrl).get("/api/orders").expect(200);

    contractTester.validateResponse(
      "/api/orders",
      "GET",
      ordersResponse.status,
      ordersResponse.body,
      OrdersResponseSchema
    );

    // Store orders for later tests
    this.testData.orders = ordersResponse.body;

    // POST /api/orders - Create order
    if (this.testData.users.length > 0 && this.testData.products.length > 0) {
      const createOrderData = {
        userId: this.testData.users[0].id,
        orderItems: [
          {
            productId: this.testData.products[0].id,
            quantity: 2,
          },
        ],
      };

      const createOrderResponse = await request(this.baseUrl)
        .post("/api/orders")
        .send(createOrderData)
        .expect(201);

      contractTester.validateResponse(
        "/api/orders",
        "POST",
        createOrderResponse.status,
        createOrderResponse.body,
        OrderWithItemsSchema
      );

      // GET /api/orders/:id - Get single order
      const orderId = createOrderResponse.body.id;
      const singleOrderResponse = await request(this.baseUrl)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      contractTester.validateResponse(
        `/api/orders/${orderId}`,
        "GET",
        singleOrderResponse.status,
        singleOrderResponse.body,
        OrderWithItemsSchema
      );

      // PUT /api/orders/:id/status - Update order status
      const updateStatusData = {
        status: "PROCESSING" as const,
      };

      const updateStatusResponse = await request(this.baseUrl)
        .put(`/api/orders/${orderId}/status`)
        .send(updateStatusData)
        .expect(200);

      contractTester.validateResponse(
        `/api/orders/${orderId}/status`,
        "PUT",
        updateStatusResponse.status,
        updateStatusResponse.body,
        OrderWithItemsSchema
      );
    }
  }

  /**
   * Test Users API endpoints
   */
  private async testUsersEndpoints(): Promise<void> {
    console.log("\n👥 Testing Users endpoints...");

    // POST /api/users - Create user
    const createUserData = {
      name: "Test User",
      email: "test.user@example.com",
      picture: "https://example.com/avatar.jpg",
    };

    const createUserResponse = await request(this.baseUrl)
      .post("/api/users")
      .send(createUserData)
      .expect(201);

    contractTester.validateResponse(
      "/api/users",
      "POST",
      createUserResponse.status,
      createUserResponse.body,
      UserSchema
    );

    // Store user for later tests
    this.testData.users.push(createUserResponse.body);

    // GET /api/users/:id - Get user profile
    const userId = createUserResponse.body.id;
    const singleUserResponse = await request(this.baseUrl)
      .get(`/api/users/${userId}`)
      .expect(200);

    contractTester.validateResponse(
      `/api/users/${userId}`,
      "GET",
      singleUserResponse.status,
      singleUserResponse.body,
      UserSchema
    );
  }

  /**
   * Test error scenarios
   */
  private async testErrorScenarios(): Promise<void> {
    console.log("\n⚠️  Testing error scenarios...");

    // Test 404 - Product not found
    const notFoundResponse = await request(this.baseUrl)
      .get("/api/products/non-existent-id")
      .expect(404);

    contractTester.validateErrorResponse(
      "/api/products/non-existent-id",
      "GET",
      notFoundResponse.status,
      notFoundResponse.body,
      [404]
    );

    // Test 400 - Invalid product data
    const invalidProductData = {
      name: "", // Invalid: empty name
      price: -10, // Invalid: negative price
    };

    const badRequestResponse = await request(this.baseUrl)
      .post("/api/products")
      .send(invalidProductData)
      .expect(400);

    contractTester.validateErrorResponse(
      "/api/products",
      "POST",
      badRequestResponse.status,
      badRequestResponse.body,
      [400]
    );

    // Test 409 - Duplicate email
    const duplicateUserData = {
      name: "Duplicate User",
      email: "test.user@example.com", // Same email as before
    };

    const conflictResponse = await request(this.baseUrl)
      .post("/api/users")
      .send(duplicateUserData)
      .expect(409);

    contractTester.validateErrorResponse(
      "/api/users",
      "POST",
      conflictResponse.status,
      conflictResponse.body,
      [409]
    );
  }
}

// Export test suite instance
export const contractTestSuite = new ContractTestSuite();
