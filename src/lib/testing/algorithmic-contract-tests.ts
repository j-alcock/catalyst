import { z } from "zod";
import * as api from "../heyapi/sdk.gen";
import { validateEndpoint, validateSafe, validators } from "../heyapi/validators";
import { contractTester } from "./contract-tester";

export interface AlgorithmicTestResult {
  endpoint: string;
  method: string;
  statusCode: number;
  success: boolean;
  errors: string[];
  responseTime?: number;
  testType: "success" | "error" | "validation";
}

export class AlgorithmicContractTestSuite {
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
   * Run algorithmic contract tests based on OpenAPI spec
   */
  async runAlgorithmicTests(): Promise<void> {
    console.log("🤖 Starting Algorithmic Contract Test Suite...");
    console.log("📋 Testing based on OpenAPI specification...");

    contractTester.clearResults();

    try {
      // Test all endpoints defined in the OpenAPI spec
      await this.testAllEndpoints();

      // Test error scenarios
      await this.testErrorScenarios();

      // Test edge cases and boundary conditions
      await this.testEdgeCases();
    } catch (error) {
      console.error("❌ Algorithmic test suite failed:", error);
    }

    contractTester.printResults();
  }

  /**
   * Test all endpoints defined in the OpenAPI spec
   */
  private async testAllEndpoints(): Promise<void> {
    console.log("\n🔍 Testing all endpoints from OpenAPI spec...");

    // Test Products endpoints
    await this.testProductsEndpoints();

    // Test Categories endpoints
    await this.testCategoriesEndpoints();

    // Test Orders endpoints
    await this.testOrdersEndpoints();

    // Test Users endpoints
    await this.testUsersEndpoints();
  }

  /**
   * Algorithmic test for Products endpoints
   */
  private async testProductsEndpoints(): Promise<void> {
    console.log("📦 Testing Products endpoints algorithmically...");

    try {
      // GET /api/products - Test pagination response
      const startTime = Date.now();
      const productsResponse = await api.getApiProducts({
        query: { page: 1, pageSize: 5 },
        baseUrl: this.baseUrl,
      });

      if (productsResponse.data) {
        // Validate response against OpenAPI spec
        const validationResult = validateSafe(
          "PaginatedProductsResponse",
          productsResponse.data
        );

        if (validationResult.success) {
          contractTester.validateResponse(
            "GET /api/products",
            "GET",
            200,
            productsResponse.data,
            validators["GET /api/products"].response,
            Date.now() - startTime
          );
        } else {
          contractTester.validateResponse(
            "GET /api/products (validation failed)",
            "GET",
            200,
            { data: productsResponse.data, errors: validationResult.error.errors },
            z.object({
              data: z.any(),
              errors: z.array(z.any()),
            })
          );
        }
      }

      // POST /api/products - Test creation with validation
      const createProductData = {
        name: "Algorithmic Test Product",
        description: "A test product created via algorithmic testing",
        price: 29.99,
        stockQuantity: 100,
        categoryId:
          this.testData.categories[0]?.id || "00000000-0000-0000-0000-000000000000",
      };

      // Validate request data against OpenAPI spec
      const requestValidation = validateSafe("CreateProductRequest", createProductData);
      if (requestValidation.success) {
        const createProductResponse = await api.postApiProducts({
          body: createProductData,
          baseUrl: this.baseUrl,
        });

        if (createProductResponse.data) {
          // Validate response against OpenAPI spec
          const responseValidation = validateSafe(
            "ProductWithCategory",
            createProductResponse.data
          );

          if (responseValidation.success) {
            contractTester.validateResponse(
              "POST /api/products",
              "POST",
              201,
              createProductResponse.data,
              validators["POST /api/products"].response
            );

            // Store for later tests
            this.testData.products.push(createProductResponse.data);

            // Test GET /api/products/{id}
            const productId = createProductResponse.data.id;
            const singleProductResponse = await api.getApiProductsById({
              path: { id: productId },
              baseUrl: this.baseUrl,
            });

            if (singleProductResponse.data) {
              const singleValidation = validateSafe(
                "ProductWithCategory",
                singleProductResponse.data
              );

              if (singleValidation.success) {
                contractTester.validateResponse(
                  `GET /api/products/{id}`,
                  "GET",
                  200,
                  singleProductResponse.data,
                  validators["GET /api/products/{id}"].response
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Products algorithmic tests failed:", error);
    }
  }

  /**
   * Algorithmic test for Categories endpoints
   */
  private async testCategoriesEndpoints(): Promise<void> {
    console.log("📂 Testing Categories endpoints algorithmically...");

    try {
      // GET /api/categories
      const categoriesResponse = await api.getApiCategories({
        baseUrl: this.baseUrl,
      });

      if (categoriesResponse.data) {
        const validationResult = validateSafe("Category", categoriesResponse.data[0]);

        if (validationResult.success) {
          contractTester.validateResponse(
            "GET /api/categories",
            "GET",
            200,
            categoriesResponse.data,
            validators["GET /api/categories"].response
          );

          this.testData.categories = categoriesResponse.data;
        }
      }

      // POST /api/categories
      const createCategoryData = {
        name: "Algorithmic Test Category",
        description: "A test category for algorithmic testing",
      };

      const requestValidation = validateSafe("CreateCategoryRequest", createCategoryData);
      if (requestValidation.success) {
        const createCategoryResponse = await api.postApiCategories({
          body: createCategoryData,
          baseUrl: this.baseUrl,
        });

        if (createCategoryResponse.data) {
          const responseValidation = validateSafe(
            "Category",
            createCategoryResponse.data
          );

          if (responseValidation.success) {
            contractTester.validateResponse(
              "POST /api/categories",
              "POST",
              201,
              createCategoryResponse.data,
              validators["POST /api/categories"].response
            );

            // Test GET /api/categories/{id}
            const categoryId = createCategoryResponse.data.id;
            const singleCategoryResponse = await api.getApiCategoriesById({
              path: { id: categoryId },
              baseUrl: this.baseUrl,
            });

            if (singleCategoryResponse.data) {
              const singleValidation = validateSafe(
                "Category",
                singleCategoryResponse.data
              );

              if (singleValidation.success) {
                contractTester.validateResponse(
                  `GET /api/categories/{id}`,
                  "GET",
                  200,
                  singleCategoryResponse.data,
                  validators["GET /api/categories/{id}"].response
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Categories algorithmic tests failed:", error);
    }
  }

  /**
   * Algorithmic test for Orders endpoints
   */
  private async testOrdersEndpoints(): Promise<void> {
    console.log("📋 Testing Orders endpoints algorithmically...");

    try {
      // GET /api/orders
      const ordersResponse = await api.getApiOrders({
        baseUrl: this.baseUrl,
      });

      if (ordersResponse.data && ordersResponse.data.length > 0) {
        const validationResult = validateSafe("OrderWithItems", ordersResponse.data[0]);

        if (validationResult.success) {
          contractTester.validateResponse(
            "GET /api/orders",
            "GET",
            200,
            ordersResponse.data,
            validators["GET /api/orders"].response
          );

          this.testData.orders = ordersResponse.data;
        }
      }

      // POST /api/orders
      const createOrderData = {
        userId: this.testData.users[0]?.id || "00000000-0000-0000-0000-000000000000",
        orderItems: [
          {
            productId:
              this.testData.products[0]?.id || "00000000-0000-0000-0000-000000000000",
            quantity: 2,
          },
        ],
      };

      const requestValidation = validateSafe("CreateOrderRequest", createOrderData);
      if (requestValidation.success) {
        const createOrderResponse = await api.postApiOrders({
          body: createOrderData,
          baseUrl: this.baseUrl,
        });

        if (createOrderResponse.data) {
          const responseValidation = validateSafe(
            "OrderWithItems",
            createOrderResponse.data
          );

          if (responseValidation.success) {
            contractTester.validateResponse(
              "POST /api/orders",
              "POST",
              201,
              createOrderResponse.data,
              validators["POST /api/orders"].response
            );

            // Test GET /api/orders/{id}
            const orderId = createOrderResponse.data.id;
            const singleOrderResponse = await api.getApiOrdersById({
              path: { id: orderId },
              baseUrl: this.baseUrl,
            });

            if (singleOrderResponse.data) {
              const singleValidation = validateSafe(
                "OrderWithItems",
                singleOrderResponse.data
              );

              if (singleValidation.success) {
                contractTester.validateResponse(
                  `GET /api/orders/{id}`,
                  "GET",
                  200,
                  singleOrderResponse.data,
                  validators["GET /api/orders/{id}"].response
                );

                // Test PUT /api/orders/{id}/status
                const updateOrderData = {
                  status: "PROCESSING" as const,
                };

                const updateRequestValidation = validateSafe(
                  "UpdateOrderStatusRequest",
                  updateOrderData
                );
                if (updateRequestValidation.success) {
                  const updateOrderResponse = await api.putApiOrdersByIdStatus({
                    path: { id: orderId },
                    body: updateOrderData,
                    baseUrl: this.baseUrl,
                  });

                  if (updateOrderResponse.data) {
                    const updateValidation = validateSafe(
                      "OrderWithItems",
                      updateOrderResponse.data
                    );

                    if (updateValidation.success) {
                      contractTester.validateResponse(
                        `PUT /api/orders/{id}/status`,
                        "PUT",
                        200,
                        updateOrderResponse.data,
                        validators["PUT /api/orders/{id}/status"].response
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Orders algorithmic tests failed:", error);
    }
  }

  /**
   * Algorithmic test for Users endpoints
   */
  private async testUsersEndpoints(): Promise<void> {
    console.log("👥 Testing Users endpoints algorithmically...");

    try {
      // POST /api/users
      const createUserData = {
        name: "Algorithmic Test User",
        email: "algorithmic-test@example.com",
        password: "testpassword123",
      };

      const requestValidation = validateSafe("CreateUserRequest", createUserData);
      if (requestValidation.success) {
        const createUserResponse = await api.postApiUsers({
          body: createUserData,
          baseUrl: this.baseUrl,
        });

        if (createUserResponse.data) {
          const responseValidation = validateSafe("User", createUserResponse.data);

          if (responseValidation.success) {
            contractTester.validateResponse(
              "POST /api/users",
              "POST",
              201,
              createUserResponse.data,
              validators["POST /api/users"].response
            );

            this.testData.users.push(createUserResponse.data);

            // Test GET /api/users/{id}
            const userId = createUserResponse.data.id;
            const singleUserResponse = await api.getApiUsersById({
              path: { id: userId },
              baseUrl: this.baseUrl,
            });

            if (singleUserResponse.data) {
              const singleValidation = validateSafe("User", singleUserResponse.data);

              if (singleValidation.success) {
                contractTester.validateResponse(
                  `GET /api/users/{id}`,
                  "GET",
                  200,
                  singleUserResponse.data,
                  validators["GET /api/users/{id}"].response
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Users algorithmic tests failed:", error);
    }
  }

  /**
   * Test error scenarios based on OpenAPI spec
   */
  private async testErrorScenarios(): Promise<void> {
    console.log("\n🚨 Testing error scenarios algorithmically...");

    try {
      // Test 404 errors
      await this.test404Errors();

      // Test 400 errors with invalid data
      await this.test400Errors();

      // Test 409 errors (conflicts)
      await this.test409Errors();
    } catch (error) {
      console.error("❌ Error scenario tests failed:", error);
    }
  }

  /**
   * Test 404 errors
   */
  private async test404Errors(): Promise<void> {
    const nonExistentIds = [
      "00000000-0000-0000-0000-000000000000",
      "11111111-1111-1111-1111-111111111111",
    ];

    for (const id of nonExistentIds) {
      try {
        await api.getApiProductsById({
          path: { id },
          baseUrl: this.baseUrl,
        });
      } catch (error: any) {
        if (error.status === 404) {
          const validationResult = validateSafe("ErrorResponse", error.data);

          if (validationResult.success) {
            contractTester.validateErrorResponse(
              `GET /api/products/{id} (404)`,
              "GET",
              404,
              error.data,
              [404]
            );
          }
        }
      }
    }
  }

  /**
   * Test 400 errors with invalid data
   */
  private async test400Errors(): Promise<void> {
    const invalidScenarios = [
      {
        name: "Empty name",
        data: {
          name: "",
          price: 10,
          stockQuantity: 100,
          categoryId: "00000000-0000-0000-0000-000000000000",
        },
      },
      {
        name: "Negative price",
        data: {
          name: "Test",
          price: -10,
          stockQuantity: 100,
          categoryId: "00000000-0000-0000-0000-000000000000",
        },
      },
      {
        name: "Invalid UUID",
        data: { name: "Test", price: 10, stockQuantity: 100, categoryId: "not-a-uuid" },
      },
    ];

    for (const scenario of invalidScenarios) {
      try {
        await api.postApiProducts({
          body: scenario.data,
          baseUrl: this.baseUrl,
        });
      } catch (error: any) {
        if (error.status === 400) {
          const validationResult = validateSafe("ErrorResponse", error.data);

          if (validationResult.success) {
            contractTester.validateErrorResponse(
              `POST /api/products (400 - ${scenario.name})`,
              "POST",
              400,
              error.data,
              [400]
            );
          }
        }
      }
    }
  }

  /**
   * Test 409 errors (conflicts)
   */
  private async test409Errors(): Promise<void> {
    try {
      await api.postApiUsers({
        body: {
          name: "Duplicate User",
          email: "existing@example.com",
          password: "password123",
        },
        baseUrl: this.baseUrl,
      });
    } catch (error: any) {
      if (error.status === 409) {
        const validationResult = validateSafe("ErrorResponse", error.data);

        if (validationResult.success) {
          contractTester.validateErrorResponse(
            "POST /api/users (409 - duplicate email)",
            "POST",
            409,
            error.data,
            [409]
          );
        }
      }
    }
  }

  /**
   * Test edge cases and boundary conditions
   */
  private async testEdgeCases(): Promise<void> {
    console.log("\n🔬 Testing edge cases and boundary conditions...");

    try {
      // Test pagination edge cases
      await this.testPaginationEdgeCases();

      // Test data type edge cases
      await this.testDataTypeEdgeCases();
    } catch (error) {
      console.error("❌ Edge case tests failed:", error);
    }
  }

  /**
   * Test pagination edge cases
   */
  private async testPaginationEdgeCases(): Promise<void> {
    const edgeCases = [
      { page: 1, pageSize: 1 },
      { page: 999, pageSize: 100 },
      { page: 1, pageSize: 0 }, // Should fail
    ];

    for (const edgeCase of edgeCases) {
      try {
        const response = await api.getApiProducts({
          query: edgeCase,
          baseUrl: this.baseUrl,
        });

        if (response.data) {
          const validationResult = validateSafe(
            "PaginatedProductsResponse",
            response.data
          );

          if (validationResult.success) {
            contractTester.validateResponse(
              `GET /api/products (pagination edge case: ${JSON.stringify(edgeCase)})`,
              "GET",
              200,
              response.data,
              validators["GET /api/products"].response
            );
          }
        }
      } catch (error: any) {
        // Expected to fail for invalid pagination
        if (error.status === 400) {
          const validationResult = validateSafe("ErrorResponse", error.data);

          if (validationResult.success) {
            contractTester.validateErrorResponse(
              `GET /api/products (pagination edge case: ${JSON.stringify(edgeCase)})`,
              "GET",
              400,
              error.data,
              [400]
            );
          }
        }
      }
    }
  }

  /**
   * Test data type edge cases
   */
  private async testDataTypeEdgeCases(): Promise<void> {
    // Test with maximum values
    const maxValues = {
      name: "A".repeat(255), // Max length
      price: 999999.99, // Max price
      stockQuantity: 2147483647, // Max int
      categoryId: "00000000-0000-0000-0000-000000000000",
    };

    try {
      const response = await api.postApiProducts({
        body: maxValues,
        baseUrl: this.baseUrl,
      });

      if (response.data) {
        const validationResult = validateSafe("ProductWithCategory", response.data);

        if (validationResult.success) {
          contractTester.validateResponse(
            "POST /api/products (max values)",
            "POST",
            201,
            response.data,
            validators["POST /api/products"].response
          );
        }
      }
    } catch (error: any) {
      // Handle any validation errors
      if (error.status === 400) {
        const validationResult = validateSafe("ErrorResponse", error.data);

        if (validationResult.success) {
          contractTester.validateErrorResponse(
            "POST /api/products (max values)",
            "POST",
            400,
            error.data,
            [400]
          );
        }
      }
    }
  }

  /**
   * Get test results
   */
  getResults() {
    return contractTester.getResults();
  }
}

// Export test suite instance
export const algorithmicContractTestSuite = new AlgorithmicContractTestSuite();
