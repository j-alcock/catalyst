import { z } from "zod";
import * as api from "../heyapi/sdk.gen";
import { contractTester } from "./contract-tester";

// Create Zod schemas from HeyAPI types for validation
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  stockQuantity: z.number().int().min(0),
  categoryId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ProductWithCategorySchema = ProductSchema.extend({
  category: CategorySchema,
});

const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const OrderItemWithProductSchema = OrderItemSchema.extend({
  product: ProductSchema,
});

const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  total: z.number().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const OrderWithItemsSchema = OrderSchema.extend({
  user: UserSchema,
  items: z.array(OrderItemWithProductSchema),
});

const PaginatedProductsResponseSchema = z.object({
  data: z.array(ProductWithCategorySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

const _ErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

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
   * Run all contract tests using HeyAPI client
   */
  async runAllTests(): Promise<void> {
    console.log("🚀 Starting HeyAPI Contract Test Suite...");

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
   * Test Products API endpoints using HeyAPI client
   */
  private async testProductsEndpoints(): Promise<void> {
    console.log("\n📦 Testing Products endpoints with HeyAPI...");

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
          PaginatedProductsResponseSchema,
          Date.now() - startTime
        );
      }

      // POST /api/products - Create product
      const createProductData = {
        name: "HeyAPI Test Product",
        description: "A test product created via HeyAPI",
        price: 29.99,
        stockQuantity: 100,
        categoryId: this.testData.categories[0]?.id || "test-category-id",
      };

      const createProductResponse = await api.postApiProducts({
        body: createProductData,
        baseUrl: this.baseUrl,
      });

      if (createProductResponse.data) {
        contractTester.validateResponse(
          "/api/products",
          "POST",
          201,
          createProductResponse.data,
          ProductWithCategorySchema
        );

        // Store created product for later tests
        this.testData.products.push(createProductResponse.data);

        // GET /api/products/:id - Get single product
        const productId = createProductResponse.data.id;
        const singleProductResponse = await api.getApiProductsById({
          path: { id: productId },
          baseUrl: this.baseUrl,
        });

        if (singleProductResponse.data) {
          contractTester.validateResponse(
            `/api/products/${productId}`,
            "GET",
            200,
            singleProductResponse.data,
            ProductWithCategorySchema
          );
        }

        // PUT /api/products/:id - Update product
        const updateProductData = {
          name: "Updated HeyAPI Test Product",
          price: 39.99,
        };

        const updateProductResponse = await api.putApiProductsById({
          path: { id: productId },
          body: updateProductData,
          baseUrl: this.baseUrl,
        });

        if (updateProductResponse.data) {
          contractTester.validateResponse(
            `/api/products/${productId}`,
            "PUT",
            200,
            updateProductResponse.data,
            ProductWithCategorySchema
          );
        }
      }

      console.log("✅ Products endpoints tested successfully");
    } catch (error) {
      console.error("❌ Products endpoint tests failed:", error);
    }
  }

  /**
   * Test Categories API endpoints using HeyAPI client
   */
  private async testCategoriesEndpoints(): Promise<void> {
    console.log("\n📂 Testing Categories endpoints with HeyAPI...");

    try {
      // GET /api/categories - List categories
      const categoriesResponse = await api.getApiCategories({
        baseUrl: this.baseUrl,
      });

      if (categoriesResponse.data) {
        contractTester.validateResponse(
          "/api/categories",
          "GET",
          200,
          categoriesResponse.data,
          z.array(CategorySchema)
        );

        // Store categories for later tests
        this.testData.categories = categoriesResponse.data || [];
      }

      // POST /api/categories - Create category
      const createCategoryData = {
        name: "HeyAPI Test Category",
        description: "A test category created via HeyAPI",
      };

      const createCategoryResponse = await api.postApiCategories({
        body: createCategoryData,
        baseUrl: this.baseUrl,
      });

      if (createCategoryResponse.data) {
        contractTester.validateResponse(
          "/api/categories",
          "POST",
          201,
          createCategoryResponse.data,
          CategorySchema
        );

        // GET /api/categories/:id - Get single category
        const categoryId = createCategoryResponse.data.id;
        const singleCategoryResponse = await api.getApiCategoriesById({
          path: { id: categoryId },
          baseUrl: this.baseUrl,
        });

        if (singleCategoryResponse.data) {
          contractTester.validateResponse(
            `/api/categories/${categoryId}`,
            "GET",
            200,
            singleCategoryResponse.data,
            CategorySchema
          );
        }
      }

      console.log("✅ Categories endpoints tested successfully");
    } catch (error) {
      console.error("❌ Categories endpoint tests failed:", error);
    }
  }

  /**
   * Test Orders API endpoints using HeyAPI client
   */
  private async testOrdersEndpoints(): Promise<void> {
    console.log("\n📋 Testing Orders endpoints with HeyAPI...");

    try {
      // GET /api/orders - List orders
      const ordersResponse = await api.getApiOrders({
        baseUrl: this.baseUrl,
      });

      if (ordersResponse.data) {
        contractTester.validateResponse(
          "/api/orders",
          "GET",
          200,
          ordersResponse.data,
          z.array(OrderWithItemsSchema)
        );

        // Store orders for later tests
        this.testData.orders = ordersResponse.data || [];
      }

      // POST /api/orders - Create order
      const createOrderData = {
        userId: this.testData.users[0]?.id || "test-user-id",
        orderItems: [
          {
            productId: this.testData.products[0]?.id || "test-product-id",
            quantity: 2,
          },
        ],
      };

      const createOrderResponse = await api.postApiOrders({
        body: createOrderData,
        baseUrl: this.baseUrl,
      });

      if (createOrderResponse.data) {
        contractTester.validateResponse(
          "/api/orders",
          "POST",
          201,
          createOrderResponse.data,
          OrderWithItemsSchema
        );

        // GET /api/orders/:id - Get single order
        const orderId = createOrderResponse.data.id;
        const singleOrderResponse = await api.getApiOrdersById({
          path: { id: orderId },
          baseUrl: this.baseUrl,
        });

        if (singleOrderResponse.data) {
          contractTester.validateResponse(
            `/api/orders/${orderId}`,
            "GET",
            200,
            singleOrderResponse.data,
            OrderWithItemsSchema
          );
        }

        // PUT /api/orders/:id/status - Update order status
        const updateOrderData = {
          status: "PROCESSING" as const,
        };

        const updateOrderResponse = await api.putApiOrdersByIdStatus({
          path: { id: orderId },
          body: updateOrderData,
          baseUrl: this.baseUrl,
        });

        if (updateOrderResponse.data) {
          contractTester.validateResponse(
            `/api/orders/${orderId}/status`,
            "PUT",
            200,
            updateOrderResponse.data,
            OrderWithItemsSchema
          );
        }
      }

      console.log("✅ Orders endpoints tested successfully");
    } catch (error) {
      console.error("❌ Orders endpoint tests failed:", error);
    }
  }

  /**
   * Test Users API endpoints using HeyAPI client
   */
  private async testUsersEndpoints(): Promise<void> {
    console.log("\n👥 Testing Users endpoints with HeyAPI...");

    try {
      // POST /api/users - Create user
      const createUserData = {
        name: "HeyAPI Test User",
        email: "heyapi-test@example.com",
        password: "testpassword123",
      };

      const createUserResponse = await api.postApiUsers({
        body: createUserData,
        baseUrl: this.baseUrl,
      });

      if (createUserResponse.data) {
        contractTester.validateResponse(
          "/api/users",
          "POST",
          201,
          createUserResponse.data,
          UserSchema
        );

        // Store user for later tests
        this.testData.users.push(createUserResponse.data);

        // GET /api/users/:id - Get single user
        const userId = createUserResponse.data.id;
        const singleUserResponse = await api.getApiUsersById({
          path: { id: userId },
          baseUrl: this.baseUrl,
        });

        if (singleUserResponse.data) {
          contractTester.validateResponse(
            `/api/users/${userId}`,
            "GET",
            200,
            singleUserResponse.data,
            UserSchema
          );
        }
      }

      console.log("✅ Users endpoints tested successfully");
    } catch (error) {
      console.error("❌ Users endpoint tests failed:", error);
    }
  }

  /**
   * Test error scenarios using HeyAPI client
   */
  private async testErrorScenarios(): Promise<void> {
    console.log("\n🚨 Testing Error Scenarios with HeyAPI...");

    try {
      // Test 404 - Non-existent resource
      try {
        await api.getApiProductsById({
          path: { id: "non-existent-id" },
          baseUrl: this.baseUrl,
        });
      } catch (error: any) {
        if (error.status === 404) {
          contractTester.validateErrorResponse(
            "/api/products/non-existent-id",
            "GET",
            404,
            error.data,
            [404]
          );
          console.log("✅ 404 error handling works correctly");
        }
      }

      // Test 400 - Invalid data
      try {
        await api.postApiProducts({
          body: {
            name: "", // Invalid: empty name
            price: -10, // Invalid: negative price
            stockQuantity: 100,
            categoryId: "test-category-id",
          },
          baseUrl: this.baseUrl,
        });
      } catch (error: any) {
        if (error.status === 400) {
          contractTester.validateErrorResponse(
            "/api/products",
            "POST",
            400,
            error.data,
            [400]
          );
          console.log("✅ 400 error handling works correctly");
        }
      }

      // Test 409 - Duplicate email
      try {
        await api.postApiUsers({
          body: {
            name: "Duplicate User",
            email: "existing@example.com", // Assuming this email exists
            password: "password123",
          },
          baseUrl: this.baseUrl,
        });
      } catch (error: any) {
        if (error.status === 409) {
          contractTester.validateErrorResponse(
            "/api/users",
            "POST",
            409,
            error.data,
            [409]
          );
          console.log("✅ 409 error handling works correctly");
        }
      }

      console.log("✅ Error scenarios tested successfully");
    } catch (error) {
      console.error("❌ Error scenario tests failed:", error);
    }
  }
}

// Export test suite instance
export const heyAPIContractTestSuite = new HeyAPIContractTestSuite();
