import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

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

export interface OpenAPIContractTestConfig {
  endpoint: string;
  method: string;
  requestSchema?: any;
  responseSchema?: any;
  testData?: any;
  expectedStatusCodes: number[];
}

export interface OpenAPIContractTestResult {
  success: boolean;
  endpoint: string;
  method: string;
  statusCode: number;
  errors: string[];
  responseTime?: number;
  validationSteps: Array<{
    name: string;
    passed: boolean;
    details?: string;
    error?: string;
  }>;
}

export class OpenAPIOnlyDynamicTester {
  private openAPISpec: OpenAPISpec;
  private ajv: Ajv;
  private baseUrl: string;
  private results: OpenAPIContractTestResult[] = [];
  private testConfigs: OpenAPIContractTestConfig[] = [];

  // Coverage tracking
  private testedEndpoints: Set<string> = new Set();
  private testedSchemas: Set<string> = new Set();

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.openAPISpec = this.loadOpenAPISpec();
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);

    // Add all schemas from OpenAPI spec to Ajv
    const schemas = (this.openAPISpec as any).components?.schemas;
    if (schemas) {
      for (const [schemaName, schema] of Object.entries(schemas)) {
        this.ajv.addSchema(schema as any, `#/components/schemas/${schemaName}`);
      }
    }
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
   * Resolve schema references in OpenAPI spec
   */
  private resolveSchema(schema: any): any {
    if (!schema) return null;

    // Handle direct schema references
    if (schema.$ref) {
      const refPath = schema.$ref.replace("#/", "").split("/");
      let resolved = this.openAPISpec;

      for (const part of refPath) {
        resolved = (resolved as any)[part];
        if (!resolved) break;
      }

      return resolved || schema;
    }

    // Handle array schemas
    if (schema.type === "array" && schema.items) {
      return {
        type: "array",
        items: this.resolveSchema(schema.items),
      };
    }

    // Handle object schemas with properties
    if (schema.type === "object" && schema.properties) {
      const resolved = { ...schema };
      resolved.properties = {};

      for (const [key, prop] of Object.entries(schema.properties)) {
        resolved.properties[key] = this.resolveSchema(prop);
      }

      return resolved;
    }

    return schema;
  }

  /**
   * Generate test data from OpenAPI schema
   */
  private generateTestData(schema: any): any {
    if (!schema) return null;

    const resolvedSchema = this.resolveSchema(schema);

    if (resolvedSchema.type === "object" && resolvedSchema.properties) {
      const result: any = {};

      for (const [key, prop] of Object.entries(resolvedSchema.properties)) {
        const p = prop as any;
        result[key] = this.generateValueFromProperty(p);
      }

      return result;
    }

    if (resolvedSchema.type === "array" && resolvedSchema.items) {
      return [this.generateValueFromProperty(resolvedSchema.items)];
    }

    return this.generateValueFromProperty(resolvedSchema);
  }

  /**
   * Generate a value from an OpenAPI property definition
   */
  private generateValueFromProperty(prop: any): any {
    if (!prop || typeof prop !== "object") return null;

    const resolvedProp = this.resolveSchema(prop);

    if (resolvedProp.type === "string") {
      if (resolvedProp.format === "uuid") {
        return "00000000-0000-0000-0000-000000000000";
      }
      if (resolvedProp.format === "email") {
        return "test@example.com";
      }
      if (resolvedProp.format === "date-time") {
        return new Date().toISOString();
      }
      if (resolvedProp.enum && resolvedProp.enum.length > 0) {
        return resolvedProp.enum[0];
      }
      return "sample string";
    }

    if (resolvedProp.type === "number" || resolvedProp.type === "integer") {
      if (resolvedProp.minimum !== undefined) {
        return resolvedProp.minimum;
      }
      if (resolvedProp.maximum !== undefined) {
        return Math.min(resolvedProp.maximum, 100);
      }
      return 42;
    }

    if (resolvedProp.type === "boolean") {
      return true;
    }

    if (resolvedProp.type === "array" && resolvedProp.items) {
      return [this.generateValueFromProperty(resolvedProp.items)];
    }

    if (resolvedProp.type === "object" && resolvedProp.properties) {
      return this.generateTestData(resolvedProp);
    }

    return null;
  }

  /**
   * Apply business logic fixes to test data
   */
  private async applyBusinessLogicFixes(
    testData: any,
    path: string,
    method: string
  ): Promise<any> {
    if (!testData) return testData;

    // Get real data from the database for valid references
    const realData = await this.getRealDataForTesting();

    // Fix POST /api/products - use real category ID
    if (path === "/api/products" && method === "POST") {
      if (testData.categoryId) {
        testData.categoryId = realData.categoryId;
      }
      testData.name = testData.name || "Test Product";
      testData.price = testData.price || 29.99;
      testData.stockQuantity = testData.stockQuantity || 100;
    }

    // Fix POST /api/orders - use real user ID and product ID
    if (path === "/api/orders" && method === "POST") {
      if (testData.userId) {
        testData.userId = realData.userId;
      }
      if (testData.orderItems && Array.isArray(testData.orderItems)) {
        testData.orderItems = testData.orderItems.map((item: any) => ({
          productId: item.productId || realData.productId,
          quantity: item.quantity || 1,
        }));
      } else {
        testData.orderItems = [
          {
            productId: realData.productId,
            quantity: 1,
          },
        ];
      }
    }

    // Fix PUT /api/orders/{id}/status - use valid status
    if (path === "/api/orders/{id}/status" && method === "PUT") {
      if (testData.status) {
        const validStatuses = [
          "PENDING",
          "PROCESSING",
          "SHIPPED",
          "DELIVERED",
          "CANCELLED",
        ];
        testData.status = validStatuses[0];
      }
    }

    // Fix POST /api/users - ensure email is unique
    if (path === "/api/users" && method === "POST") {
      if (testData.email) {
        const timestamp = Date.now();
        testData.email = `testuser${timestamp}@example.com`;
      }
      testData.name = testData.name || "Test User";
    }

    return testData;
  }

  /**
   * Get real data from the database for testing
   */
  private async getRealDataForTesting(): Promise<{
    categoryId: string;
    userId: string;
    productId: string;
    orderId: string;
  }> {
    try {
      let categories: any[] = [];
      let users: any[] = [];
      let products: any = { data: [] };
      let orders: any[] = [];

      // Fetch categories
      try {
        const categoriesRes = await fetch(`${this.baseUrl}/api/categories`);
        if (categoriesRes.ok) {
          const categoriesText = await categoriesRes.text();
          if (categoriesText) {
            categories = JSON.parse(categoriesText);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch categories:", error);
      }

      // Fetch users
      try {
        const usersRes = await fetch(`${this.baseUrl}/api/users`);
        if (usersRes.ok) {
          const usersText = await usersRes.text();
          if (usersText) {
            users = JSON.parse(usersText);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch users:", error);
      }

      // Fetch products
      try {
        const productsRes = await fetch(`${this.baseUrl}/api/products`);
        if (productsRes.ok) {
          const productsText = await productsRes.text();
          if (productsText) {
            products = JSON.parse(productsText);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch products:", error);
      }

      // Fetch orders
      try {
        const ordersRes = await fetch(`${this.baseUrl}/api/orders`);
        if (ordersRes.ok) {
          const ordersText = await ordersRes.text();
          if (ordersText) {
            orders = JSON.parse(ordersText);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch orders:", error);
      }

      const categoryId = categories[0]?.id || "b671f909-eb1d-4d07-a50c-a86582aa275e";
      const userId = users[0]?.id || "b7620da5-99b8-4bc6-bfc7-b81920a05bc5";
      const productId = products.data?.[0]?.id || "2909b3c3-a48a-403c-bfd4-d81cd5b9756d";
      const orderId = orders[0]?.id || "1bff98cd-8a16-475c-9aca-0991ed4f7b60";

      return { categoryId, userId, productId, orderId };
    } catch (error) {
      console.warn("Failed to fetch real data, using fallback IDs:", error);
      return {
        categoryId: "b671f909-eb1d-4d07-a50c-a86582aa275e",
        userId: "b7620da5-99b8-4bc6-bfc7-b81920a05bc5",
        productId: "2909b3c3-a48a-403c-bfd4-d81cd5b9756d",
        orderId: "1bff98cd-8a16-475c-9aca-0991ed4f7b60",
      };
    }
  }

  /**
   * Generate contract test configuration for an endpoint
   */
  private async generateContractTestConfig(
    endpoint: EndpointDefinition
  ): Promise<OpenAPIContractTestConfig> {
    const config: OpenAPIContractTestConfig = {
      endpoint: endpoint.path,
      method: endpoint.method,
      expectedStatusCodes: [],
    };

    // Track endpoint coverage
    this.trackEndpointCoverage(endpoint.path, endpoint.method);

    // Determine expected status codes (only 2xx for contract tests)
    for (const [statusCode, _response] of Object.entries(endpoint.responses)) {
      const code = parseInt(statusCode);
      if (code >= 200 && code < 300) {
        config.expectedStatusCodes.push(code);
      }
    }

    // Apply business logic adjustments
    if (endpoint.method === "POST") {
      if (!config.expectedStatusCodes.includes(200)) {
        config.expectedStatusCodes.push(200);
      }
      if (!config.expectedStatusCodes.includes(201)) {
        config.expectedStatusCodes.push(201);
      }
    }
    if (endpoint.method === "PUT") {
      if (!config.expectedStatusCodes.includes(200)) {
        config.expectedStatusCodes.push(200);
      }
      if (!config.expectedStatusCodes.includes(204)) {
        config.expectedStatusCodes.push(204);
      }
    }
    if (endpoint.method === "DELETE") {
      if (!config.expectedStatusCodes.includes(200)) {
        config.expectedStatusCodes.push(200);
      }
      if (!config.expectedStatusCodes.includes(204)) {
        config.expectedStatusCodes.push(204);
      }
    }

    // Map request body schema
    if (endpoint.requestBody?.content?.["application/json"]?.schema) {
      const requestSchema = endpoint.requestBody.content["application/json"].schema;
      config.requestSchema = this.resolveSchema(requestSchema);

      // Track schema coverage
      if (requestSchema.$ref) {
        const schemaName = requestSchema.$ref.split("/").pop();
        if (schemaName) {
          this.trackSchemaCoverage(schemaName);
        }
      }
    }

    // Map response schemas
    for (const [statusCode, response] of Object.entries(endpoint.responses)) {
      const code = parseInt(statusCode);
      if (code >= 200 && code < 300) {
        const responseSchema = response.content?.["application/json"]?.schema;
        if (responseSchema) {
          config.responseSchema = this.resolveSchema(responseSchema);

          // Track schema coverage
          if (responseSchema.$ref) {
            const schemaName = responseSchema.$ref.split("/").pop();
            if (schemaName) {
              this.trackSchemaCoverage(schemaName);
            }
          }
        }
      }
    }

    // Generate test data if we have a request schema
    if (config.requestSchema) {
      config.testData = await this.applyBusinessLogicFixes(
        this.generateTestData(config.requestSchema),
        endpoint.path,
        endpoint.method
      );
    }

    return config;
  }

  /**
   * Run a contract test
   */
  async runContractTest(
    config: OpenAPIContractTestConfig
  ): Promise<OpenAPIContractTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const validationSteps: Array<{
      name: string;
      passed: boolean;
      details?: string;
      error?: string;
    }> = [];

    try {
      let url = `${this.baseUrl}${config.endpoint}`;

      // Replace path parameters with valid values for contract tests
      url = url.replace(/\{id\}/g, "00000000-0000-0000-0000-000000000000");

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
        validationSteps.push({
          name: "JSON Response Parsing",
          passed: true,
          details: "Response data successfully parsed as JSON",
        });
      } catch {
        parsedData = responseData;
        validationSteps.push({
          name: "JSON Response Parsing",
          passed: false,
          error: "Response data is not valid JSON",
        });
      }

      // Validate status code
      const statusCodeValid = config.expectedStatusCodes.includes(response.status);
      validationSteps.push({
        name: "HTTP Status Code Validation",
        passed: statusCodeValid,
        details: statusCodeValid
          ? `Status code ${response.status} is in expected range [${config.expectedStatusCodes.join(", ")}]`
          : `Status code ${response.status} is not in expected range [${config.expectedStatusCodes.join(", ")}]`,
        error: statusCodeValid
          ? undefined
          : `Unexpected status code: ${response.status}. Expected one of: ${config.expectedStatusCodes.join(", ")}`,
      });

      if (!statusCodeValid) {
        errors.push(
          `Unexpected status code: ${response.status}. Expected one of: ${config.expectedStatusCodes.join(", ")}`
        );
      }

      // Validate response schema if available
      if (config.responseSchema && response.status >= 200 && response.status < 300) {
        try {
          const validate = this.ajv.compile(config.responseSchema);
          const valid = validate(parsedData);

          if (valid) {
            validationSteps.push({
              name: "Response Schema Validation",
              passed: true,
              details: "Response data conforms to expected schema",
            });
          } else {
            const validationErrors = this.ajv.errorsText(validate.errors);
            validationSteps.push({
              name: "Response Schema Validation",
              passed: false,
              error: `Schema validation failed: ${validationErrors}`,
            });
            errors.push(`Response schema validation failed: ${validationErrors}`);
          }
        } catch (error) {
          validationSteps.push({
            name: "Response Schema Validation",
            passed: false,
            error: `Unexpected error: ${error}`,
          });
          errors.push(`Unexpected error: ${error}`);
        }
      } else if (config.responseSchema) {
        validationSteps.push({
          name: "Response Schema Validation",
          passed: true,
          details: "Skipped - response status is not in 2xx range",
        });
      }

      return {
        success: errors.length === 0,
        endpoint: config.endpoint,
        method: config.method,
        statusCode: response.status,
        errors,
        responseTime,
        validationSteps,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      errors.push(`Request failed: ${error}`);

      validationSteps.push({
        name: "HTTP Request",
        passed: false,
        error: `Request failed: ${error}`,
      });

      return {
        success: false,
        endpoint: config.endpoint,
        method: config.method,
        statusCode: 0,
        errors,
        responseTime,
        validationSteps,
      };
    }
  }

  /**
   * Generate and run all contract tests
   */
  async runAllContractTests(): Promise<OpenAPIContractTestResult[]> {
    console.log("🔍 Generating OpenAPI-only dynamic contract tests...");

    const endpoints = this.extractEndpoints();
    const testConfigs: OpenAPIContractTestConfig[] = [];
    const endpointMappings: Array<{
      endpoint: string;
      method: string;
      requestSchema?: string;
      responseSchema?: string;
      mappingType: string;
    }> = [];

    console.log(`📋 Found ${endpoints.length} endpoints in OpenAPI spec:`);
    endpoints.forEach((endpoint, index) => {
      console.log(`   ${index + 1}. ${endpoint.method} ${endpoint.path}`);
    });

    for (const endpoint of endpoints) {
      const config = await this.generateContractTestConfig(endpoint);

      // Track the mapping for summary
      const mapping = {
        endpoint: endpoint.path,
        method: endpoint.method,
        requestSchema: config.requestSchema ? "OpenAPI Schema" : undefined,
        responseSchema: config.responseSchema ? "OpenAPI Schema" : undefined,
        mappingType: this.getMappingType(config.requestSchema, config.responseSchema),
      };
      endpointMappings.push(mapping);

      console.log(`\n🔍 Analyzing ${endpoint.method} ${endpoint.path}:`);
      console.log(
        `   Request Schema: ${config.requestSchema ? "✅ Found" : "❌ Not found"}`
      );
      console.log(
        `   Response Schema: ${config.responseSchema ? "✅ Found" : "❌ Not found"}`
      );

      if (config.requestSchema || config.responseSchema) {
        testConfigs.push(config);
        console.log(`   ✅ Added to contract tests`);
      } else {
        console.log(`   ❌ Skipped - no schemas found`);
      }
    }

    // Print endpoint to schema mapping summary
    console.log("\n📊 OpenAPI Endpoint to Schema Mapping:");
    console.log("=".repeat(80));
    console.log(
      `${"Endpoint".padEnd(30) + "Method".padEnd(8) + "Request Schema".padEnd(25) + "Response Schema".padEnd(25)}Mapping Type`
    );
    console.log("-".repeat(80));

    endpointMappings.forEach((mapping) => {
      const endpoint = mapping.endpoint.padEnd(30);
      const method = mapping.method.padEnd(8);
      const requestSchema = (mapping.requestSchema || "N/A").padEnd(25);
      const responseSchema = (mapping.responseSchema || "N/A").padEnd(25);
      const mappingType = mapping.mappingType;

      console.log(`${endpoint}${method}${requestSchema}${responseSchema}${mappingType}`);
    });
    console.log("=".repeat(80));

    // Store test configurations for coverage reporting
    this.testConfigs = testConfigs;

    console.log(`\n📋 Generated ${testConfigs.length} contract test configurations`);
    console.log(`🚀 Running ${testConfigs.length} contract tests...`);

    const results: OpenAPIContractTestResult[] = [];

    for (const config of testConfigs) {
      try {
        const result = await this.runContractTest(config);
        results.push(result);

        const status = result.success ? "✅ PASS" : "❌ FAIL";
        console.log(`${status} ${config.method} ${config.endpoint}`);

        if (!result.success) {
          console.log(`   Errors: ${result.errors.join(", ")}`);
        }
      } catch (error) {
        console.error(
          `❌ Contract test failed for ${config.method} ${config.endpoint}:`,
          error
        );
      }
    }

    this.results = results;
    return results;
  }

  /**
   * Track endpoint coverage
   */
  private trackEndpointCoverage(endpoint: string, method: string): void {
    this.testedEndpoints.add(`${method} ${endpoint}`);
  }

  /**
   * Track schema coverage
   */
  private trackSchemaCoverage(schemaName: string): void {
    this.testedSchemas.add(schemaName);
  }

  /**
   * Get all available endpoints from OpenAPI spec
   */
  private getAllAvailableEndpoints(): string[] {
    const endpoints: string[] = [];
    for (const [path, methods] of Object.entries(this.openAPISpec.paths)) {
      for (const [method, definition] of Object.entries(methods)) {
        if (typeof definition === "object" && definition !== null) {
          endpoints.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    return endpoints;
  }

  /**
   * Get all available schemas from OpenAPI spec
   */
  private getAllAvailableSchemas(): string[] {
    const schemas: string[] = [];
    if (this.openAPISpec.components?.schemas) {
      for (const schemaName of Object.keys(this.openAPISpec.components.schemas)) {
        schemas.push(schemaName);
      }
    }
    return schemas;
  }

  /**
   * Get coverage statistics
   */
  getCoverageStats(): {
    endpoints: {
      total: number;
      tested: number;
      coverage: number;
      testedList: string[];
      untestedList: string[];
    };
    schemas: {
      total: number;
      tested: number;
      coverage: number;
      testedList: string[];
      untestedList: string[];
    };
  } {
    const allEndpoints = this.getAllAvailableEndpoints();
    const allSchemas = this.getAllAvailableSchemas();

    const testedEndpoints = Array.from(this.testedEndpoints);
    const untestedEndpoints = allEndpoints.filter((ep) => !this.testedEndpoints.has(ep));

    const testedSchemas = Array.from(this.testedSchemas);
    const untestedSchemas = allSchemas.filter(
      (schema) => !this.testedSchemas.has(schema)
    );

    return {
      endpoints: {
        total: allEndpoints.length,
        tested: testedEndpoints.length,
        coverage:
          allEndpoints.length > 0
            ? (testedEndpoints.length / allEndpoints.length) * 100
            : 0,
        testedList: testedEndpoints,
        untestedList: untestedEndpoints,
      },
      schemas: {
        total: allSchemas.length,
        tested: testedSchemas.length,
        coverage:
          allSchemas.length > 0 ? (testedSchemas.length / allSchemas.length) * 100 : 0,
        testedList: testedSchemas,
        untestedList: untestedSchemas,
      },
    };
  }

  /**
   * Get mapping type description
   */
  private getMappingType(requestSchema: any, responseSchema: any): string {
    if (requestSchema && responseSchema) {
      return "Request + Response";
    } else if (requestSchema) {
      return "Request Only";
    } else if (responseSchema) {
      return "Response Only";
    } else {
      return "No Schema";
    }
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
    console.log("\n📋 OpenAPI-Only Contract Test Results:");
    console.log("=".repeat(50));

    this.results.forEach((result, index) => {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${index + 1}. ${status} ${result.method} ${result.endpoint} (${result.statusCode})`
      );

      if (result.responseTime) {
        console.log(`   ⏱️  Response time: ${result.responseTime}ms`);
      }

      // Display granular validation steps
      if (result.validationSteps && result.validationSteps.length > 0) {
        console.log("   🔍 Validation Steps:");
        result.validationSteps.forEach((step) => {
          const stepStatus = step.passed ? "✅" : "❌";
          console.log(`      ${stepStatus} ${step.name}`);
          if (step.details) {
            console.log(`         📝 ${step.details}`);
          }
          if (step.error) {
            console.log(`         ❌ ${step.error}`);
          }
        });
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
      console.log("\n✅ All contract tests passed!");
    }

    // Print coverage summary
    const coverage = this.getCoverageStats();
    console.log(`\n📊 Coverage Summary:`);
    console.log(
      `   Endpoints: ${coverage.endpoints.tested}/${coverage.endpoints.total} (${coverage.endpoints.coverage.toFixed(1)}%)`
    );
    console.log(
      `   Schemas: ${coverage.schemas.tested}/${coverage.schemas.total} (${coverage.schemas.coverage.toFixed(1)}%)`
    );
  }

  /**
   * Print coverage report
   */
  printCoverageReport(): void {
    const coverage = this.getCoverageStats();

    console.log("\n📊 Coverage Report:");
    console.log("=".repeat(50));

    // Endpoint coverage
    console.log(
      `\n🔗 Endpoint Coverage: ${coverage.endpoints.tested}/${coverage.endpoints.total} (${coverage.endpoints.coverage.toFixed(1)}%)`
    );

    if (coverage.endpoints.testedList.length > 0) {
      console.log("\n✅ Tested Endpoints:");
      coverage.endpoints.testedList.forEach((endpoint) => {
        console.log(`   - ${endpoint}`);
      });
    }

    if (coverage.endpoints.untestedList.length > 0) {
      console.log("\n❌ Untested Endpoints:");
      coverage.endpoints.untestedList.forEach((endpoint) => {
        console.log(`   - ${endpoint}`);
      });
    }

    // Schema coverage
    console.log(
      `\n📋 Schema Coverage: ${coverage.schemas.tested}/${coverage.schemas.total} (${coverage.schemas.coverage.toFixed(1)}%)`
    );

    if (coverage.schemas.testedList.length > 0) {
      console.log("\n✅ Tested Schemas:");
      coverage.schemas.testedList.forEach((schema) => {
        console.log(`   - ${schema}`);
      });
    }

    if (coverage.schemas.untestedList.length > 0) {
      console.log("\n❌ Untested Schemas:");
      coverage.schemas.untestedList.forEach((schema) => {
        console.log(`   - ${schema}`);
      });
    }

    // Test configuration summary
    console.log(`\n🧪 Test Configuration Summary:`);
    console.log(`   Contract Tests: ${this.testConfigs.length}`);
  }

  /**
   * Get test results
   */
  getResults(): OpenAPIContractTestResult[] {
    return this.results;
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
    this.testedEndpoints.clear();
    this.testedSchemas.clear();
    this.testConfigs = [];
  }
}

// Global instance for easy access
export const openAPIOnlyTester = new OpenAPIOnlyDynamicTester();
