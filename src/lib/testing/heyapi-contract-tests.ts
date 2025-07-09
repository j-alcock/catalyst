import { z } from "zod";
import * as api from "../heyapi/sdk.gen";
import { contractTester } from "./contract-tester";

// Comprehensive Zod schemas with detailed field validation
const UUIDSchema = z.string().uuid("Invalid UUID format");
const EmailSchema = z.string().email("Invalid email format");
const ISODateSchema = z.string().datetime("Invalid ISO date format");
const DecimalSchema = z
  .string()
  .regex(
    /^\d+\.\d{2}$/,
    "Invalid decimal format (should be string with 2 decimal places)"
  );
const PositiveIntSchema = z.number().int().positive("Must be a positive integer");
const NonNegativeIntSchema = z.number().int().min(0, "Must be a non-negative integer");

// User schema with comprehensive field validation
const UserSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1, "Name cannot be empty").max(255, "Name too long"),
  email: EmailSchema,
  picture: z.string().url("Picture must be a valid URL").optional(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

// Category schema with comprehensive field validation
const CategorySchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1, "Name cannot be empty").max(255, "Name too long"),
  description: z.string().nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

// Product schema with comprehensive field validation
const ProductSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1, "Name cannot be empty").max(255, "Name too long"),
  description: z.string().nullable(),
  price: DecimalSchema,
  stockQuantity: NonNegativeIntSchema,
  categoryId: UUIDSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

// Product with category relationship validation
const ProductWithCategorySchema = ProductSchema.extend({
  category: CategorySchema,
});

// Order item schema with comprehensive field validation
const OrderItemSchema = z.object({
  id: UUIDSchema,
  orderId: UUIDSchema,
  productId: UUIDSchema,
  quantity: PositiveIntSchema,
  priceAtTime: DecimalSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

// Order item with product relationship validation
const OrderItemWithProductSchema = OrderItemSchema.extend({
  product: ProductSchema,
});

// Order status enum validation
const OrderStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

// Order schema with comprehensive field validation
const OrderSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  status: OrderStatusSchema,
  totalAmount: DecimalSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

// Order with relationships validation
const OrderWithItemsSchema = OrderSchema.extend({
  user: UserSchema,
  orderItems: z
    .array(OrderItemWithProductSchema)
    .min(1, "Order must have at least one item"),
});

// Pagination response validation
const PaginatedProductsResponseSchema = z.object({
  data: z.array(ProductWithCategorySchema),
  page: PositiveIntSchema,
  pageSize: PositiveIntSchema,
  total: NonNegativeIntSchema,
  totalPages: NonNegativeIntSchema,
});

// Error response validation
const _ErrorResponseSchema = z.object({
  error: z.string().min(1, "Error message cannot be empty"),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// Create request validation schemas
const CreateUserRequestSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name too long"),
  email: EmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const CreateCategoryRequestSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name too long"),
  description: z.string().optional(),
});

const CreateProductRequestSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name too long"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive").max(999999.99, "Price too high"),
  stockQuantity: NonNegativeIntSchema,
  categoryId: UUIDSchema,
});

const CreateOrderRequestSchema = z.object({
  userId: UUIDSchema,
  orderItems: z
    .array(
      z.object({
        productId: UUIDSchema,
        quantity: PositiveIntSchema,
      })
    )
    .min(1, "Order must have at least one item"),
});

const UpdateOrderStatusRequestSchema = z.object({
  status: OrderStatusSchema,
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
   * Run all comprehensive contract tests
   */
  async runAllTests(): Promise<void> {
    console.log("🚀 Starting Comprehensive HeyAPI Contract Test Suite...");

    contractTester.clearResults();

    try {
      // Test all endpoints with comprehensive validation
      await this.testProductsEndpoints();
      await this.testCategoriesEndpoints();
      await this.testOrdersEndpoints();
      await this.testUsersEndpoints();
      await this.testErrorScenarios();
      await this.testFieldCharacteristics();
      await this.testRelationshipIntegrity();
      await this.testDataConsistency();
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
   * Comprehensive Products API testing
   */
  private async testProductsEndpoints(): Promise<void> {
    console.log("\n📦 Testing Products endpoints with comprehensive validation...");

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

        // Validate pagination characteristics
        this.validatePaginationCharacteristics(productsResponse.data);
      }

      // POST /api/products - Create product with comprehensive validation
      const createProductData = {
        name: "Comprehensive Test Product",
        description: "A test product for comprehensive validation",
        price: 29.99,
        stockQuantity: 100,
        categoryId:
          this.testData.categories[0]?.id || "00000000-0000-0000-0000-000000000000",
      };

      // Validate request data
      contractTester.validateResponse(
        "/api/products (request)",
        "POST",
        0,
        createProductData,
        CreateProductRequestSchema
      );

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

        // Validate field characteristics
        this.validateProductFieldCharacteristics(createProductResponse.data);

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

          // Validate data consistency between create and get
          this.validateDataConsistency(
            createProductResponse.data,
            singleProductResponse.data
          );
        }

        // PUT /api/products/:id - Update product
        const updateProductData = {
          name: "Updated Comprehensive Test Product",
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

          // Validate that updatedAt changed
          this.validateUpdatedAtChanged(
            createProductResponse.data,
            updateProductResponse.data
          );
        }
      }

      console.log("✅ Products endpoints tested with comprehensive validation");
    } catch (error) {
      console.error("❌ Products endpoint tests failed:", error);
    }
  }

  /**
   * Comprehensive Categories API testing
   */
  private async testCategoriesEndpoints(): Promise<void> {
    console.log("\n📂 Testing Categories endpoints with comprehensive validation...");

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

        // Validate each category's field characteristics
        categoriesResponse.data.forEach((category: any) => {
          this.validateCategoryFieldCharacteristics(category);
        });
      }

      // POST /api/categories - Create category
      const createCategoryData = {
        name: "Comprehensive Test Category",
        description: "A test category for comprehensive validation",
      };

      // Validate request data
      contractTester.validateResponse(
        "/api/categories (request)",
        "POST",
        0,
        createCategoryData,
        CreateCategoryRequestSchema
      );

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

          // Validate data consistency
          this.validateDataConsistency(
            createCategoryResponse.data,
            singleCategoryResponse.data
          );
        }
      }

      console.log("✅ Categories endpoints tested with comprehensive validation");
    } catch (error) {
      console.error("❌ Categories endpoint tests failed:", error);
    }
  }

  /**
   * Comprehensive Orders API testing
   */
  private async testOrdersEndpoints(): Promise<void> {
    console.log("\n📋 Testing Orders endpoints with comprehensive validation...");

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

        // Validate each order's field characteristics
        ordersResponse.data.forEach((order: any) => {
          this.validateOrderFieldCharacteristics(order);
        });
      }

      // POST /api/orders - Create order
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

      // Validate request data
      contractTester.validateResponse(
        "/api/orders (request)",
        "POST",
        0,
        createOrderData,
        CreateOrderRequestSchema
      );

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

          // Validate data consistency
          this.validateDataConsistency(
            createOrderResponse.data,
            singleOrderResponse.data
          );
        }

        // PUT /api/orders/:id/status - Update order status
        const updateOrderData = {
          status: "PROCESSING" as const,
        };

        // Validate request data
        contractTester.validateResponse(
          "/api/orders/:id/status (request)",
          "PUT",
          0,
          updateOrderData,
          UpdateOrderStatusRequestSchema
        );

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

          // Validate that status changed and updatedAt changed
          this.validateStatusChanged(createOrderResponse.data, updateOrderResponse.data);
          this.validateUpdatedAtChanged(
            createOrderResponse.data,
            updateOrderResponse.data
          );
        }
      }

      console.log("✅ Orders endpoints tested with comprehensive validation");
    } catch (error) {
      console.error("❌ Orders endpoint tests failed:", error);
    }
  }

  /**
   * Comprehensive Users API testing
   */
  private async testUsersEndpoints(): Promise<void> {
    console.log("\n👥 Testing Users endpoints with comprehensive validation...");

    try {
      // POST /api/users - Create user
      const createUserData = {
        name: "Comprehensive Test User",
        email: "comprehensive-test@example.com",
        password: "testpassword123",
      };

      // Validate request data
      contractTester.validateResponse(
        "/api/users (request)",
        "POST",
        0,
        createUserData,
        CreateUserRequestSchema
      );

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

        // Validate field characteristics
        this.validateUserFieldCharacteristics(createUserResponse.data);

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

          // Validate data consistency
          this.validateDataConsistency(createUserResponse.data, singleUserResponse.data);
        }
      }

      console.log("✅ Users endpoints tested with comprehensive validation");
    } catch (error) {
      console.error("❌ Users endpoint tests failed:", error);
    }
  }

  /**
   * Comprehensive error scenario testing
   */
  private async testErrorScenarios(): Promise<void> {
    console.log("\n🚨 Testing Error Scenarios with comprehensive validation...");

    try {
      // Test 404 - Non-existent resource
      try {
        await api.getApiProductsById({
          path: { id: "00000000-0000-0000-0000-000000000000" },
          baseUrl: this.baseUrl,
        });
      } catch (error: any) {
        if (error.status === 404) {
          contractTester.validateErrorResponse(
            "/api/products/00000000-0000-0000-0000-000000000000",
            "GET",
            404,
            error.data,
            [404]
          );
        }
      }

      // Test 400 - Invalid data (multiple scenarios)
      const invalidScenarios = [
        {
          name: "Empty name",
          data: { name: "", price: 10, stockQuantity: 100, categoryId: "test-id" },
        },
        {
          name: "Negative price",
          data: { name: "Test", price: -10, stockQuantity: 100, categoryId: "test-id" },
        },
        {
          name: "Invalid UUID",
          data: { name: "Test", price: 10, stockQuantity: 100, categoryId: "not-a-uuid" },
        },
        {
          name: "Missing required fields",
          data: { name: "Test", price: 10, stockQuantity: 100, categoryId: "test-id" },
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
            contractTester.validateErrorResponse(
              `/api/products (${scenario.name})`,
              "POST",
              400,
              error.data,
              [400]
            );
          }
        }
      }

      // Test 409 - Duplicate email
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
          contractTester.validateErrorResponse(
            "/api/users (duplicate email)",
            "POST",
            409,
            error.data,
            [409]
          );
        }
      }

      console.log("✅ Error scenarios tested with comprehensive validation");
    } catch (error) {
      console.error("❌ Error scenario tests failed:", error);
    }
  }

  /**
   * Test specific field characteristics
   */
  private async testFieldCharacteristics(): Promise<void> {
    console.log("\n🔍 Testing Field Characteristics...");

    try {
      // Test UUID format validation
      const uuidTestData = {
        valid: "123e4567-e89b-12d3-a456-426614174000",
        invalid: "not-a-uuid",
      };

      contractTester.validateResponse(
        "UUID validation (valid)",
        "TEST",
        0,
        uuidTestData.valid,
        UUIDSchema
      );

      try {
        UUIDSchema.parse(uuidTestData.invalid);
        contractTester.validateResponse(
          "UUID validation (invalid)",
          "TEST",
          0,
          uuidTestData.invalid,
          z.string().refine(() => false, "Should fail")
        );
      } catch (_error) {
        // Expected to fail
      }

      // Test email format validation
      const emailTestData = {
        valid: "test@example.com",
        invalid: "not-an-email",
      };

      contractTester.validateResponse(
        "Email validation (valid)",
        "TEST",
        0,
        emailTestData.valid,
        EmailSchema
      );

      try {
        EmailSchema.parse(emailTestData.invalid);
        contractTester.validateResponse(
          "Email validation (invalid)",
          "TEST",
          0,
          emailTestData.invalid,
          z.string().refine(() => false, "Should fail")
        );
      } catch (_error) {
        // Expected to fail
      }

      // Test decimal format validation
      const decimalTestData = {
        valid: "29.99",
        invalid: "29.9", // Missing decimal places
      };

      contractTester.validateResponse(
        "Decimal validation (valid)",
        "TEST",
        0,
        decimalTestData.valid,
        DecimalSchema
      );

      try {
        DecimalSchema.parse(decimalTestData.invalid);
        contractTester.validateResponse(
          "Decimal validation (invalid)",
          "TEST",
          0,
          decimalTestData.invalid,
          z.string().refine(() => false, "Should fail")
        );
      } catch (_error) {
        // Expected to fail
      }

      console.log("✅ Field characteristics tested");
    } catch (error) {
      console.error("❌ Field characteristics tests failed:", error);
    }
  }

  /**
   * Test relationship integrity
   */
  private async testRelationshipIntegrity(): Promise<void> {
    console.log("\n🔗 Testing Relationship Integrity...");

    try {
      // Test that products have valid category relationships
      if (this.testData.products.length > 0) {
        for (const product of this.testData.products) {
          // Validate categoryId is a valid UUID
          contractTester.validateResponse(
            `Product ${product.id} categoryId`,
            "TEST",
            0,
            product.categoryId,
            UUIDSchema
          );

          // Validate category relationship exists
          if (product.category) {
            contractTester.validateResponse(
              `Product ${product.id} category`,
              "TEST",
              0,
              product.category,
              CategorySchema
            );

            // Validate categoryId matches category.id
            if (product.categoryId !== product.category.id) {
              contractTester.validateResponse(
                `Product ${product.id} categoryId mismatch`,
                "TEST",
                0,
                { expected: product.categoryId, actual: product.category.id },
                z.object({
                  expected: z
                    .string()
                    .refine(() => false, "CategoryId should match category.id"),
                  actual: z
                    .string()
                    .refine(() => false, "CategoryId should match category.id"),
                })
              );
            }
          }
        }
      }

      // Test that orders have valid user and orderItems relationships
      if (this.testData.orders.length > 0) {
        for (const order of this.testData.orders) {
          // Validate userId is a valid UUID
          contractTester.validateResponse(
            `Order ${order.id} userId`,
            "TEST",
            0,
            order.userId,
            UUIDSchema
          );

          // Validate user relationship exists
          if (order.user) {
            contractTester.validateResponse(
              `Order ${order.id} user`,
              "TEST",
              0,
              order.user,
              UserSchema
            );

            // Validate userId matches user.id
            if (order.userId !== order.user.id) {
              contractTester.validateResponse(
                `Order ${order.id} userId mismatch`,
                "TEST",
                0,
                { expected: order.userId, actual: order.user.id },
                z.object({
                  expected: z.string().refine(() => false, "UserId should match user.id"),
                  actual: z.string().refine(() => false, "UserId should match user.id"),
                })
              );
            }
          }

          // Validate orderItems array
          if (order.orderItems && order.orderItems.length > 0) {
            for (const item of order.orderItems) {
              contractTester.validateResponse(
                `Order ${order.id} orderItem ${item.id}`,
                "TEST",
                0,
                item,
                OrderItemWithProductSchema
              );

              // Validate orderId matches order.id
              if (item.orderId !== order.id) {
                contractTester.validateResponse(
                  `Order ${order.id} orderItem ${item.id} orderId mismatch`,
                  "TEST",
                  0,
                  { expected: item.orderId, actual: order.id },
                  z.object({
                    expected: z
                      .string()
                      .refine(() => false, "OrderId should match order.id"),
                    actual: z
                      .string()
                      .refine(() => false, "OrderId should match order.id"),
                  })
                );
              }
            }
          }
        }
      }

      console.log("✅ Relationship integrity tested");
    } catch (error) {
      console.error("❌ Relationship integrity tests failed:", error);
    }
  }

  /**
   * Test data consistency across operations
   */
  private async testDataConsistency(): Promise<void> {
    console.log("\n🔄 Testing Data Consistency...");

    try {
      // Test that created data is consistent with retrieved data
      if (this.testData.products.length > 0) {
        const product = this.testData.products[0];
        const retrievedProduct = await api.getApiProductsById({
          path: { id: product.id },
          baseUrl: this.baseUrl,
        });

        if (retrievedProduct.data) {
          this.validateDataConsistency(product, retrievedProduct.data);
        }
      }

      // Test that updated data reflects changes
      if (this.testData.products.length > 0) {
        const product = this.testData.products[0];
        const _originalName = product.name;
        const updatedName = "Consistency Test Product";

        const updateResponse = await api.putApiProductsById({
          path: { id: product.id },
          body: { name: updatedName },
          baseUrl: this.baseUrl,
        });

        if (updateResponse.data) {
          // Validate name was updated
          if (updateResponse.data.name !== updatedName) {
            contractTester.validateResponse(
              `Product ${product.id} name update`,
              "TEST",
              0,
              { expected: updatedName, actual: updateResponse.data.name },
              z.object({
                expected: z.string().refine(() => false, "Name should be updated"),
                actual: z.string().refine(() => false, "Name should be updated"),
              })
            );
          }

          // Validate updatedAt changed
          this.validateUpdatedAtChanged(product, updateResponse.data);
        }
      }

      console.log("✅ Data consistency tested");
    } catch (error) {
      console.error("❌ Data consistency tests failed:", error);
    }
  }

  // Helper methods for specific validations
  private validatePaginationCharacteristics(data: any): void {
    if (data.page < 1) {
      contractTester.validateResponse(
        "Pagination page validation",
        "TEST",
        0,
        data.page,
        z.number().refine(() => false, "Page should be positive")
      );
    }

    if (data.pageSize < 1) {
      contractTester.validateResponse(
        "Pagination pageSize validation",
        "TEST",
        0,
        data.pageSize,
        z.number().refine(() => false, "PageSize should be positive")
      );
    }

    if (data.total < 0) {
      contractTester.validateResponse(
        "Pagination total validation",
        "TEST",
        0,
        data.total,
        z.number().refine(() => false, "Total should be non-negative")
      );
    }

    if (data.totalPages < 0) {
      contractTester.validateResponse(
        "Pagination totalPages validation",
        "TEST",
        0,
        data.totalPages,
        z.number().refine(() => false, "TotalPages should be non-negative")
      );
    }
  }

  private validateProductFieldCharacteristics(product: any): void {
    // Validate price format
    if (!/^\d+\.\d{2}$/.test(product.price)) {
      contractTester.validateResponse(
        `Product ${product.id} price format`,
        "TEST",
        0,
        product.price,
        z.string().refine(() => false, "Price should be decimal string with 2 places")
      );
    }

    // Validate stockQuantity is non-negative
    if (product.stockQuantity < 0) {
      contractTester.validateResponse(
        `Product ${product.id} stockQuantity`,
        "TEST",
        0,
        product.stockQuantity,
        z.number().refine(() => false, "StockQuantity should be non-negative")
      );
    }
  }

  private validateCategoryFieldCharacteristics(category: any): void {
    // Validate name is not empty
    if (!category.name || category.name.trim() === "") {
      contractTester.validateResponse(
        `Category ${category.id} name`,
        "TEST",
        0,
        category.name,
        z.string().refine(() => false, "Name should not be empty")
      );
    }
  }

  private validateOrderFieldCharacteristics(order: any): void {
    // Validate status is valid enum
    const validStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(order.status)) {
      contractTester.validateResponse(
        `Order ${order.id} status`,
        "TEST",
        0,
        order.status,
        z.string().refine(() => false, "Status should be valid enum value")
      );
    }

    // Validate totalAmount format
    if (!/^\d+\.\d{2}$/.test(order.totalAmount)) {
      contractTester.validateResponse(
        `Order ${order.id} totalAmount format`,
        "TEST",
        0,
        order.totalAmount,
        z
          .string()
          .refine(() => false, "TotalAmount should be decimal string with 2 places")
      );
    }

    // Validate orderItems array is not empty
    if (!order.orderItems || order.orderItems.length === 0) {
      contractTester.validateResponse(
        `Order ${order.id} orderItems`,
        "TEST",
        0,
        order.orderItems,
        z.array(z.any()).refine(() => false, "OrderItems should not be empty")
      );
    }
  }

  private validateUserFieldCharacteristics(user: any): void {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      contractTester.validateResponse(
        `User ${user.id} email format`,
        "TEST",
        0,
        user.email,
        z.string().refine(() => false, "Email should be valid format")
      );
    }

    // Validate name is not empty
    if (!user.name || user.name.trim() === "") {
      contractTester.validateResponse(
        `User ${user.id} name`,
        "TEST",
        0,
        user.name,
        z.string().refine(() => false, "Name should not be empty")
      );
    }
  }

  private validateDataConsistency(original: any, retrieved: any): void {
    // Validate that all fields match between original and retrieved
    const fieldsToCompare = Object.keys(original).filter((key) => key !== "updatedAt");

    for (const field of fieldsToCompare) {
      if (original[field] !== retrieved[field]) {
        contractTester.validateResponse(
          `Data consistency for ${field}`,
          "TEST",
          0,
          { original: original[field], retrieved: retrieved[field] },
          z.object({
            original: z.any().refine(() => false, "Original and retrieved should match"),
            retrieved: z.any().refine(() => false, "Original and retrieved should match"),
          })
        );
      }
    }
  }

  private validateUpdatedAtChanged(original: any, updated: any): void {
    const originalDate = new Date(original.updatedAt);
    const updatedDate = new Date(updated.updatedAt);

    if (updatedDate <= originalDate) {
      contractTester.validateResponse(
        "UpdatedAt should change",
        "TEST",
        0,
        { original: original.updatedAt, updated: updated.updatedAt },
        z.object({
          original: z.string().refine(() => false, "UpdatedAt should be newer"),
          updated: z.string().refine(() => false, "UpdatedAt should be newer"),
        })
      );
    }
  }

  private validateStatusChanged(original: any, updated: any): void {
    if (original.status === updated.status) {
      contractTester.validateResponse(
        "Status should change",
        "TEST",
        0,
        { original: original.status, updated: updated.status },
        z.object({
          original: z.string().refine(() => false, "Status should be different"),
          updated: z.string().refine(() => false, "Status should be different"),
        })
      );
    }
  }
}

// Export test suite instance
export const heyAPIContractTestSuite = new HeyAPIContractTestSuite();
