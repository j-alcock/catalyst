import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { z } from "zod";
import {
  CategorySchema,
  CreateCategoryRequestSchema,
  CreateOrderRequestSchema,
  CreateProductRequestSchema,
  CreateUserRequestSchema,
  ErrorResponseSchema,
  OrderSchema,
  OrderStatusSchema,
  OrderWithItemsSchema,
  PaginatedProductsResponseSchema,
  ProductSchema,
  ProductWithCategorySchema,
  UpdateOrderStatusRequestSchema,
  UpdateProductRequestSchema,
  UserSchema,
} from "../schemas/zod-schemas";

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, any>;
  };
}

export interface EndpointDefinition {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
}

export interface DynamicTestConfig {
  endpoint: string;
  method: string;
  requestSchema?: z.ZodSchema<any> | null;
  responseSchema?: z.ZodSchema<any> | null;
  errorSchema?: z.ZodSchema<any> | null;
  testData?: any;
  expectedStatusCodes: number[];
  errorStatusCodes: number[];
}

export interface DynamicTestResult {
  success: boolean;
  endpoint: string;
  method: string;
  statusCode: number;
  errors: string[];
  responseTime?: number;
  testType: string;
}

export class DynamicContractTester {
  private openAPISpec: OpenAPISpec;
  private zodSchemas: Record<string, z.ZodSchema<any>>;
  private results: DynamicTestResult[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.openAPISpec = this.loadOpenAPISpec();
    this.zodSchemas = this.loadZodSchemas();
  }

  /**
   * Load OpenAPI specification from YAML file
   */
  private loadOpenAPISpec(): OpenAPISpec {
    try {
      const specPath = path.join(process.cwd(), "src/lib/openapi/api-spec.yaml");
      const specContent = fs.readFileSync(specPath, "utf8");
      return yaml.load(specContent) as OpenAPISpec;
    } catch (error) {
      throw new Error(`Failed to load OpenAPI spec: ${error}`);
    }
  }

  /**
   * Load all Zod schemas
   */
  private loadZodSchemas(): Record<string, z.ZodSchema<any>> {
    return {
      User: UserSchema,
      Category: CategorySchema,
      Product: ProductSchema,
      Order: OrderSchema,
      ProductWithCategory: ProductWithCategorySchema,
      OrderWithItems: OrderWithItemsSchema,
      CreateProductRequest: CreateProductRequestSchema,
      UpdateProductRequest: UpdateProductRequestSchema,
      CreateCategoryRequest: CreateCategoryRequestSchema,
      CreateUserRequest: CreateUserRequestSchema,
      CreateOrderRequest: CreateOrderRequestSchema,
      UpdateOrderStatusRequest: UpdateOrderStatusRequestSchema,
      PaginatedProductsResponse: PaginatedProductsResponseSchema,
      ErrorResponse: ErrorResponseSchema,
      OrderStatus: OrderStatusSchema,
    };
  }

  /**
   * Extract endpoint definitions from OpenAPI spec
   */
  private extractEndpoints(): EndpointDefinition[] {
    const endpoints: EndpointDefinition[] = [];

    for (const [path, methods] of Object.entries(this.openAPISpec.paths)) {
      for (const [method, definition] of Object.entries(methods)) {
        if (typeof definition === "object" && definition !== null) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: definition.summary || "",
            description: definition.description || "",
            tags: definition.tags || [],
            parameters: definition.parameters || [],
            requestBody: definition.requestBody,
            responses: definition.responses || {},
          });
        }
      }
    }

    return endpoints;
  }

  /**
   * Map OpenAPI schema references to Zod schemas
   */
  private mapSchemaReference(ref: string): z.ZodSchema<any> | null {
    // Extract schema name from reference (e.g., "#/components/schemas/Product" -> "Product")
    const schemaName = ref.split("/").pop();
    if (schemaName && this.zodSchemas[schemaName]) {
      return this.zodSchemas[schemaName];
    }
    return null;
  }

  /**
   * Generate test configuration for an endpoint
   */
  private generateTestConfig(endpoint: EndpointDefinition): DynamicTestConfig {
    const config: DynamicTestConfig = {
      endpoint: endpoint.path,
      method: endpoint.method,
      expectedStatusCodes: [],
      errorStatusCodes: [],
    };

    // Determine expected status codes
    for (const [statusCode, _response] of Object.entries(endpoint.responses)) {
      const code = parseInt(statusCode);
      if (code >= 200 && code < 300) {
        config.expectedStatusCodes.push(code);
      } else if (code >= 400) {
        config.errorStatusCodes.push(code);
      }
    }

    // Map request body schema
    if (endpoint.requestBody?.content?.["application/json"]?.schema) {
      const requestSchema = endpoint.requestBody.content["application/json"].schema;
      if (requestSchema.$ref) {
        config.requestSchema = this.mapSchemaReference(requestSchema.$ref);
      } else {
        // Handle inline schemas by mapping to appropriate Zod schema
        config.requestSchema = this.mapInlineSchemaToZod(
          requestSchema,
          endpoint.path,
          endpoint.method
        );
      }
    }

    // Map response schemas
    for (const [statusCode, response] of Object.entries(endpoint.responses)) {
      const code = parseInt(statusCode);
      if (code >= 200 && code < 300) {
        const responseSchema = response.content?.["application/json"]?.schema;
        if (responseSchema?.$ref) {
          config.responseSchema = this.mapSchemaReference(responseSchema.$ref);
        } else if (responseSchema) {
          config.responseSchema = this.mapInlineSchemaToZod(
            responseSchema,
            endpoint.path,
            endpoint.method
          );
        }
        break; // Use first success response
      }
    }

    // Map error response schema
    config.errorSchema = ErrorResponseSchema;

    // Generate test data
    config.testData = this.generateTestData(
      config.requestSchema || null,
      endpoint.path,
      endpoint.method
    );

    return config;
  }

  /**
   * Map inline OpenAPI schemas to Zod schemas
   */
  private mapInlineSchemaToZod(
    schema: any,
    path: string,
    method: string
  ): z.ZodSchema<any> | null {
    // Simple mapping based on path and method patterns
    if (path.includes("/products") && method === "GET") {
      if (schema.properties?.data) {
        return PaginatedProductsResponseSchema;
      }
      return ProductWithCategorySchema;
    }

    if (path.includes("/categories") && method === "GET") {
      return z.array(CategorySchema);
    }

    if (path.includes("/orders") && method === "GET") {
      return z.array(OrderWithItemsSchema);
    }

    if (path.includes("/users") && method === "GET") {
      return z.array(UserSchema);
    }

    // Default to any schema for unknown patterns
    return z.any();
  }

  /**
   * Generate test data based on Zod schema
   */
  private generateTestData(
    schema: z.ZodSchema<any> | null,
    path: string,
    method: string
  ): any {
    if (!schema) return null;

    // Generate sample data based on schema type
    try {
      if (schema === CreateProductRequestSchema) {
        return {
          name: "Test Product",
          description: "A test product for contract testing",
          price: 29.99,
          stockQuantity: 100,
          categoryId: "550e8400-e29b-41d4-a716-446655440000", // Sample UUID
        };
      }

      if (schema === CreateCategoryRequestSchema) {
        return {
          name: "Test Category",
          description: "A test category for contract testing",
        };
      }

      if (schema === CreateUserRequestSchema) {
        return {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        };
      }

      if (schema === CreateOrderRequestSchema) {
        return {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          orderItems: [
            {
              productId: "550e8400-e29b-41d4-a716-446655440001",
              quantity: 2,
            },
          ],
        };
      }

      if (schema === UpdateOrderStatusRequestSchema) {
        return {
          status: "PROCESSING",
        };
      }

      // For other schemas, try to generate from schema shape
      return this.generateFromSchemaShape(schema);
    } catch (error) {
      console.warn(`Failed to generate test data for ${path} ${method}:`, error);
      return null;
    }
  }

  /**
   * Generate test data from schema shape
   */
  private generateFromSchemaShape(_schema: z.ZodSchema<any>): any {
    // This is a simplified implementation
    // In a real system, you'd want more sophisticated schema analysis
    return {};
  }

  /**
   * Run a single dynamic test
   */
  async runDynamicTest(config: DynamicTestConfig): Promise<DynamicTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const url = `${this.baseUrl}${config.endpoint}`;
      const options: RequestInit = {
        method: config.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (config.testData && ["POST", "PUT", "PATCH"].includes(config.method)) {
        options.body = JSON.stringify(config.testData);
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      const responseData = await response.text();

      let parsedData: any;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData; // Handle non-JSON responses
      }

      // Validate status code
      const isExpectedStatus = config.expectedStatusCodes.includes(response.status);
      const isErrorStatus = config.errorStatusCodes.includes(response.status);

      if (!isExpectedStatus && !isErrorStatus) {
        errors.push(`Unexpected status code: ${response.status}`);
      }

      // Validate response schema
      if (isExpectedStatus && config.responseSchema) {
        try {
          config.responseSchema.parse(parsedData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Response validation failed: ${error.message}`);
          }
        }
      }

      // Validate error response schema
      if (isErrorStatus && config.errorSchema) {
        try {
          config.errorSchema.parse(parsedData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Error response validation failed: ${error.message}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        endpoint: config.endpoint,
        method: config.method,
        statusCode: response.status,
        errors,
        responseTime,
        testType: "dynamic",
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      errors.push(`Request failed: ${error}`);

      return {
        success: false,
        endpoint: config.endpoint,
        method: config.method,
        statusCode: 0,
        errors,
        responseTime,
        testType: "dynamic",
      };
    }
  }

  /**
   * Generate and run all dynamic tests
   */
  async runAllDynamicTests(): Promise<DynamicTestResult[]> {
    console.log(
      "🔍 Generating dynamic contract tests from OpenAPI spec and Zod schemas..."
    );

    const endpoints = this.extractEndpoints();
    console.log(`📋 Found ${endpoints.length} endpoints in OpenAPI spec`);

    const testConfigs: DynamicTestConfig[] = [];

    for (const endpoint of endpoints) {
      try {
        const config = this.generateTestConfig(endpoint);
        testConfigs.push(config);
        console.log(`✅ Generated test config for ${config.method} ${config.endpoint}`);
      } catch (error) {
        console.warn(
          `⚠️  Failed to generate test config for ${endpoint.method} ${endpoint.path}:`,
          error
        );
      }
    }

    console.log(`\n🚀 Running ${testConfigs.length} dynamic contract tests...`);

    const results: DynamicTestResult[] = [];

    for (const config of testConfigs) {
      try {
        const result = await this.runDynamicTest(config);
        results.push(result);

        const status = result.success ? "✅ PASS" : "❌ FAIL";
        console.log(
          `${status} ${config.method} ${config.endpoint} (${result.statusCode})`
        );

        if (!result.success && result.errors.length > 0) {
          console.log("   Errors:");
          result.errors.forEach((error) => console.log(`     - ${error}`));
        }
      } catch (error) {
        console.error(`❌ Test failed for ${config.method} ${config.endpoint}:`, error);
      }
    }

    this.results = results;
    return results;
  }

  /**
   * Get test results
   */
  getResults(): DynamicTestResult[] {
    return this.results;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.success).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      successRate,
    };
  }

  /**
   * Print test results
   */
  printResults(): void {
    console.log("\n📋 Dynamic Contract Test Results:");
    console.log("=".repeat(50));

    this.results.forEach((result, index) => {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${index + 1}. ${status} ${result.method} ${result.endpoint} (${result.statusCode})`
      );

      if (result.responseTime) {
        console.log(`   ⏱️  Response time: ${result.responseTime}ms`);
      }

      if (!result.success && result.errors.length > 0) {
        console.log("   Errors:");
        result.errors.forEach((error) => {
          console.log(`     - ${error}`);
        });
      }
    });

    const summary = this.getSummary();
    console.log("\n📊 Summary:");
    console.log(`   Total tests: ${summary.total}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Success rate: ${summary.successRate.toFixed(1)}%`);

    if (summary.failed > 0) {
      console.log("\n❌ Contract violations detected!");
      console.log("Please fix the API responses to match the expected schemas.");
    } else {
      console.log("\n✅ All dynamic contract tests passed!");
    }
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }
}

// Global instance for easy access
export const dynamicContractTester = new DynamicContractTester();
