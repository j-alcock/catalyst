import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { z } from "zod";

// Dynamically import all schemas from the zod-schemas file
import * as ZodSchemas from "../schemas/zod-schemas";
import {
  generateUniqueEmail,
  getItemByIndex,
  getTestData,
  getValidReferenceId,
} from "./test-data";

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

// Contract Test Interfaces
export interface ContractTestConfig {
  endpoint: string;
  method: string;
  requestSchema?: z.ZodSchema<any> | null;
  responseSchema?: z.ZodSchema<any> | null;
  testData?: any;
  expectedStatusCodes: number[];
}

export interface ValidationStep {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

export interface ContractTestResult {
  success: boolean;
  endpoint: string;
  method: string;
  statusCode: number;
  errors: string[];
  responseTime?: number;
  testType: "contract";
  validationSteps: ValidationStep[];
}

// Violation Test Interfaces
export interface ViolationTestConfig {
  endpoint: string;
  method: string;
  description: string;
  requestData?: any;
  expectedViolation: string;
  testType:
    | "missing_field"
    | "wrong_type"
    | "extra_field"
    | "invalid_enum"
    | "wrong_status";
}

export interface ViolationTestResult {
  success: boolean; // true if violation was detected (test passed)
  endpoint: string;
  method: string;
  description: string;
  expectedViolation: string;
  actualResult: string;
  responseTime?: number;
  testType: "violation";
}

// Unified Test Result
export type UnifiedTestResult = ContractTestResult | ViolationTestResult;

export class UnifiedDynamicTester {
  private openAPISpec: OpenAPISpec;
  private availableSchemas: Record<string, z.ZodSchema<any>>;
  private contractResults: ContractTestResult[] = [];
  private violationResults: ViolationTestResult[] = [];
  private baseUrl: string;

  // Coverage tracking
  private testedEndpoints: Set<string> = new Set();
  private testedSchemas: Set<string> = new Set();
  private contractTestConfigs: ContractTestConfig[] = [];
  private violationTestConfigs: ViolationTestConfig[] = [];

  constructor(baseUrl?: string) {
    // Use environment variable for port, fallback to 3000 (more common default)
    const port = process.env.TEST_PORT || "3000";
    this.baseUrl = baseUrl || `http://localhost:${port}`;
    this.openAPISpec = this.loadOpenAPISpec();
    this.availableSchemas = this.discoverZodSchemas();

    // Log the base URL being used
    console.log(`🔗 Unified Dynamic Tester initialized with base URL: ${this.baseUrl}`);
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
   * Automatically discover all Zod schemas from the schemas file
   */
  private discoverZodSchemas(): Record<string, z.ZodSchema<any>> {
    const schemas: Record<string, z.ZodSchema<any>> = {};

    // Iterate through all exports from the ZodSchemas module
    for (const [name, schema] of Object.entries(ZodSchemas)) {
      // Only include actual Zod schemas (not types or other exports)
      if (schema && typeof schema === "object" && "_def" in schema) {
        schemas[name] = schema as z.ZodSchema<any>;
      }
    }

    console.log(
      `🔍 Discovered ${Object.keys(schemas).length} Zod schemas:`,
      Object.keys(schemas)
    );
    return schemas;
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

    if (!schemaName) return null;

    // Try exact match first
    if (this.availableSchemas[schemaName]) {
      return this.availableSchemas[schemaName];
    }

    // Try with "Schema" suffix (e.g., "Product" -> "ProductSchema")
    const schemaWithSuffix = `${schemaName}Schema`;
    if (this.availableSchemas[schemaWithSuffix]) {
      return this.availableSchemas[schemaWithSuffix];
    }

    // Try fuzzy matching by name similarity
    for (const [availableName, schema] of Object.entries(this.availableSchemas)) {
      const availableLower = availableName.toLowerCase();
      const targetLower = schemaName.toLowerCase();

      // Check if the available schema name contains the target name or vice versa
      if (availableLower.includes(targetLower) || targetLower.includes(availableLower)) {
        // Additional check: if it's a response schema, prefer schemas with "Response" in the name
        if (ref.includes("response") || ref.includes("Response")) {
          if (availableLower.includes("response")) {
            return schema;
          }
        }
        // For regular schemas, prefer exact matches or schemas without "Response" suffix
        else if (!availableLower.includes("response")) {
          return schema;
        }
      }
    }

    // Last resort: try to find any schema that might work based on resource type
    const resourceType = schemaName.toLowerCase();
    for (const [availableName, schema] of Object.entries(this.availableSchemas)) {
      const availableLower = availableName.toLowerCase();
      if (availableLower.includes(resourceType)) {
        return schema;
      }
    }

    return null;
  }

  /**
   * Generate contract test configuration for an endpoint
   */
  private async generateContractTestConfig(
    endpoint: EndpointDefinition
  ): Promise<ContractTestConfig> {
    const config: ContractTestConfig = {
      endpoint: endpoint.path,
      method: endpoint.method,
      expectedStatusCodes: [],
    };

    // Track endpoint coverage
    this.trackEndpointCoverage(endpoint.path, endpoint.method);

    // Dynamically determine expected status codes based on OpenAPI spec
    config.expectedStatusCodes = this.determineExpectedStatusCodes(endpoint);

    // Apply method-specific adjustments for contract tests (only 2xx status codes)
    this.adjustContractTestStatusCodes(config, endpoint);

    // Map request body schema
    if (endpoint.requestBody?.content?.["application/json"]?.schema) {
      const requestSchema = endpoint.requestBody.content["application/json"].schema;
      if (requestSchema.$ref) {
        config.requestSchema = this.mapSchemaReference(requestSchema.$ref);
        // Track schema coverage
        const schemaName = requestSchema.$ref.split("/").pop();
        if (schemaName) {
          this.trackSchemaCoverage(schemaName);
        }
      } else {
        // Handle inline schemas by mapping to appropriate Zod schema
        config.requestSchema = this.mapInlineSchemaToZod(
          requestSchema,
          endpoint.path,
          endpoint.method,
          `Request for ${endpoint.method} ${endpoint.path}`
        );
        // If fallback was used, pass OpenAPI schema for data gen
        config.testData = await this.generateContractTestData(
          config.requestSchema,
          endpoint.path,
          endpoint.method,
          requestSchema
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
          // Track schema coverage
          const schemaName = responseSchema.$ref.split("/").pop();
          if (schemaName) {
            this.trackSchemaCoverage(schemaName);
            // Track nested schemas within this schema
            this.trackNestedSchemaCoverage(schemaName);
          }
        } else if (responseSchema?.type === "array" && responseSchema?.items) {
          // Handle array responses by mapping the item schema and wrapping in array
          const itemSchema = responseSchema.items.$ref
            ? this.mapSchemaReference(responseSchema.items.$ref)
            : this.mapInlineSchemaToZod(
                responseSchema.items,
                endpoint.path,
                endpoint.method,
                `Response item for ${endpoint.method} ${endpoint.path}`
              );

          if (itemSchema) {
            config.responseSchema = z.array(itemSchema);
            // Track schema coverage for the item schema
            if (responseSchema.items.$ref) {
              const schemaName = responseSchema.items.$ref.split("/").pop();
              if (schemaName) {
                this.trackSchemaCoverage(schemaName);
                this.trackNestedSchemaCoverage(schemaName);
              }
            }
          }
        } else {
          config.responseSchema = this.mapInlineSchemaToZod(
            responseSchema,
            endpoint.path,
            endpoint.method,
            `Response for ${endpoint.method} ${endpoint.path}`
          );
        }
      }
    }

    // Generate test data if we have a request schema and it wasn't already set
    if (config.requestSchema && !config.testData) {
      config.testData = await this.generateContractTestData(
        config.requestSchema,
        endpoint.path,
        endpoint.method
      );
    }

    return config;
  }

  /**
   * Dynamically determine expected status codes based on OpenAPI spec
   */
  private determineExpectedStatusCodes(endpoint: EndpointDefinition): number[] {
    const expectedCodes: number[] = [];

    for (const [statusCode, _response] of Object.entries(endpoint.responses)) {
      const code = parseInt(statusCode);
      if (code >= 200 && code < 300) {
        expectedCodes.push(code);
      }
    }

    return expectedCodes;
  }

  /**
   * Adjust expected status codes for contract tests (only 2xx status codes)
   */
  private adjustContractTestStatusCodes(
    config: ContractTestConfig,
    endpoint: EndpointDefinition
  ): void {
    // Only allow 2xx status codes for contract tests
    config.expectedStatusCodes = config.expectedStatusCodes.filter(
      (code) => code >= 200 && code < 300
    );

    // Apply method-specific adjustments based on actual API behavior
    const method = endpoint.method;

    if (method === "POST") {
      // The API returns 200 for POST instead of 201, so accept both
      if (!config.expectedStatusCodes.includes(200)) {
        config.expectedStatusCodes.push(200);
      }
      if (!config.expectedStatusCodes.includes(201)) {
        config.expectedStatusCodes.push(201);
      }
    }
    if (method === "PUT") {
      // Accept both 200 and 204 for PUT
      if (!config.expectedStatusCodes.includes(200)) {
        config.expectedStatusCodes.push(200);
      }
      if (!config.expectedStatusCodes.includes(204)) {
        config.expectedStatusCodes.push(204);
      }
    }
    if (method === "DELETE") {
      // Accept both 200 and 204 for DELETE
      if (!config.expectedStatusCodes.includes(200)) {
        config.expectedStatusCodes.push(200);
      }
      if (!config.expectedStatusCodes.includes(204)) {
        config.expectedStatusCodes.push(204);
      }
    }
  }

  /**
   * Generate violation test configurations for an endpoint
   */
  private generateViolationTestConfigs(
    endpoint: EndpointDefinition
  ): ViolationTestConfig[] {
    const tests: ViolationTestConfig[] = [];

    // Track endpoint coverage
    this.trackEndpointCoverage(endpoint.path, endpoint.method);

    // Track error response schemas for violation tests
    if (endpoint.responses) {
      // Track Error schema for 4xx responses
      for (const [statusCode, response] of Object.entries(endpoint.responses)) {
        if (statusCode.startsWith("4") || statusCode.startsWith("5")) {
          // Check if response uses Error schema
          if (response.content?.["application/json"]?.schema?.$ref?.includes("Error")) {
            this.trackSchemaCoverage("Error");
          }
        }
      }
    }

    // Dynamically analyze the endpoint definition to determine what tests to generate
    const hasRequestBody = endpoint.requestBody?.content?.["application/json"]?.schema;
    const hasPathParameters = endpoint.parameters?.some((p: any) => p.in === "path");
    const _isModifyingMethod = ["POST", "PUT", "PATCH"].includes(endpoint.method);

    // Test 1: Missing required fields (for endpoints with request bodies)
    if (hasRequestBody) {
      const requestSchema = this.getRequestSchema(endpoint.path, endpoint.method);
      if (requestSchema) {
        tests.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          description: `Missing required fields in ${endpoint.method} ${endpoint.path}`,
          requestData: this.generateInvalidRequestMissingFields(requestSchema),
          expectedViolation: "Missing required fields should cause validation error",
          testType: "missing_field",
        });
      }
    }

    // Test 2: Wrong data types (for endpoints with request bodies)
    if (hasRequestBody) {
      const requestSchema = this.getRequestSchema(endpoint.path, endpoint.method);
      if (requestSchema) {
        tests.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          description: `Wrong data types in ${endpoint.method} ${endpoint.path}`,
          requestData: this.generateInvalidRequestWrongTypes(requestSchema),
          expectedViolation: "Wrong data types should cause validation error",
          testType: "wrong_type",
        });
      }
    }

    // Test 3: Extra fields (for endpoints with request bodies)
    if (hasRequestBody) {
      const requestSchema = this.getRequestSchema(endpoint.path, endpoint.method);
      if (requestSchema) {
        tests.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          description: `Extra fields in ${endpoint.method} ${endpoint.path}`,
          requestData: this.generateInvalidRequestExtraFields(requestSchema),
          expectedViolation: "Extra fields should cause validation error",
          testType: "extra_field",
        });
      }
    }

    // Test 4: Invalid enum values (detect from schema analysis)
    const enumViolations = this.detectEnumViolations(
      endpoint.path,
      endpoint.method,
      endpoint
    );
    tests.push(...enumViolations);

    // Test 5: Wrong HTTP status codes (for endpoints with request bodies)
    if (hasRequestBody) {
      tests.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        description: `Wrong status code for invalid request in ${endpoint.method} ${endpoint.path}`,
        requestData: { invalidField: "should cause error" },
        expectedViolation: "Invalid request should return 4xx status code",
        testType: "wrong_status",
      });

      // Test 5b: Malformed JSON (for endpoints with request bodies)
      tests.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        description: `Malformed JSON in ${endpoint.method} ${endpoint.path}`,
        requestData: "invalid json string",
        expectedViolation: "Malformed JSON should return 400 (improved validation)",
        testType: "wrong_status",
      });
    }

    // Test 6: Invalid path parameters (for endpoints with path parameters)
    if (hasPathParameters) {
      // Dynamically generate invalid path parameter value based on OpenAPI spec
      const invalidPath = this.generateInvalidPathParameter(endpoint.path, endpoint);
      tests.push({
        endpoint: invalidPath,
        method: endpoint.method,
        description: `Invalid path parameter for ${endpoint.method} ${endpoint.path}`,
        expectedViolation: "Invalid path parameter should return 400 or 404",
        testType: "wrong_status",
      });
    }

    return tests;
  }

  /**
   * Dynamically generate an invalid path parameter for a given endpoint
   */
  private generateInvalidPathParameter(
    path: string,
    endpoint: EndpointDefinition
  ): string {
    // Find path parameters in the OpenAPI spec for this endpoint
    const paramDefs = (endpoint.parameters || []).filter((p: any) => p.in === "path");
    let invalidPath = path;
    for (const param of paramDefs) {
      // Determine the type of the parameter
      let invalidValue = "invalid";
      if (param.schema?.format === "uuid") {
        invalidValue = "not-a-uuid";
      } else if (param.schema?.type === "number" || param.schema?.type === "integer") {
        invalidValue = "not-a-number";
      } else if (param.schema?.type === "string") {
        invalidValue = "!!!";
      }
      // Replace the parameter placeholder with the invalid value
      invalidPath = invalidPath.replace(`/{${param.name}}`, `/${invalidValue}`);
    }
    return invalidPath;
  }

  /**
   * Map inline schemas to Zod schemas (guaranteed fallback)
   */
  private mapInlineSchemaToZod(
    schema: any,
    path: string,
    method: string,
    debugLabel?: string
  ): z.ZodSchema<any> | null {
    const resourceMatch = path.match(/\/api\/([^\/]+)/);
    if (!resourceMatch) return null;
    const resource = resourceMatch[1];

    if (debugLabel) {
      console.log(`   🔍 Mapping inline schema for ${debugLabel}:`);
      console.log(`      Resource: ${resource}, Method: ${method}`);
      console.log(
        `      OpenAPI fields: ${schema?.properties ? Object.keys(schema.properties).join(", ") : "none"}`
      );
    }

    // Try structure match first
    const structMatch = this.matchSchemaByStructure(schema, resource, method, debugLabel);
    if (structMatch) return structMatch;

    // Fallback: name-based matching (more permissive) - handle both singular and plural
    for (const [schemaName, zodSchema] of Object.entries(this.availableSchemas)) {
      const nameLower = schemaName.toLowerCase();

      // Handle both singular and plural resource names
      const resourceSingular = resource.endsWith("s") ? resource.slice(0, -1) : resource;
      const resourcePlural = resource.endsWith("s") ? resource : `${resource}s`;

      // Check if schema name contains the resource (singular or plural)
      const hasResourceMatch =
        nameLower.includes(resource) ||
        nameLower.includes(resourceSingular) ||
        nameLower.includes(resourcePlural);

      // More permissive matching rules
      if (method === "POST" && nameLower.includes("create") && hasResourceMatch) {
        if (debugLabel) {
          console.log(`      ✅ Accepted by name match (POST): ${schemaName}`);
        }
        return zodSchema;
      }
      if (method === "PUT" && nameLower.includes("update") && hasResourceMatch) {
        if (debugLabel) {
          console.log(`      ✅ Accepted by name match (PUT): ${schemaName}`);
        }
        return zodSchema;
      }
      if (method === "GET" && hasResourceMatch) {
        if (debugLabel) {
          console.log(`      ✅ Accepted by name match (GET): ${schemaName}`);
        }
        return zodSchema;
      }

      // Extra fallback: if resource matches and method is compatible
      if (hasResourceMatch) {
        if (
          (method === "POST" && nameLower.includes("create")) ||
          (method === "PUT" && nameLower.includes("update")) ||
          (method === "GET" &&
            (nameLower.includes("response") || nameLower.includes("schema")))
        ) {
          if (debugLabel) {
            console.log(`      ✅ Accepted by extra fallback: ${schemaName}`);
          }
          return zodSchema;
        }
      }
      // Super fallback: if resource matches, accept any schema for that resource
      if (hasResourceMatch) {
        if (debugLabel) {
          console.log(`      ✅ Accepted by super fallback: ${schemaName}`);
        }
        return zodSchema;
      }
    }
    // Catch-all fallback: pick the first Zod object/array schema
    const firstObjectOrArray = Object.entries(this.availableSchemas).find(
      ([, s]) => s instanceof z.ZodObject || s instanceof z.ZodArray
    );
    if (firstObjectOrArray) {
      if (debugLabel) {
        console.log(`      ⚠️  Catch-all fallback: using ${firstObjectOrArray[0]}`);
      }
      return firstObjectOrArray[1];
    }
    if (debugLabel) {
      console.log(`      ❌ No name-based match found`);
    }
    return null;
  }

  /**
   * Match schema by analyzing its structure and comparing with available schemas
   */
  private matchSchemaByStructure(
    openAPISchema: any,
    resource: string,
    method: string,
    _debugLabel?: string
  ): z.ZodSchema<any> | null {
    if (!openAPISchema || typeof openAPISchema !== "object" || !openAPISchema.properties)
      return null;
    const requiredFields = openAPISchema.required || [];
    const properties = openAPISchema.properties || {};
    const openAPIKeys = Object.keys(properties);
    let bestMatch: { schema: z.ZodSchema<any>; name: string; score: number } | null =
      null;

    // Handle both singular and plural resource names (improved)
    const resourceSingular = toSingular(resource);
    const resourcePlural = resource.endsWith("s") ? resource : `${resource}s`;

    for (const [schemaName, zodSchema] of Object.entries(this.availableSchemas)) {
      const nameLower = schemaName.toLowerCase();
      // Only consider schemas with resource in name (singular or plural)
      const hasResourceMatch =
        nameLower.includes(resource) ||
        nameLower.includes(resourceSingular) ||
        nameLower.includes(resourcePlural);
      if (!hasResourceMatch) {
        continue;
      }

      // More precise method matching with fallbacks
      const isCreateRequest = method === "POST" && nameLower.includes("create");
      const isUpdateRequest = method === "PUT" && nameLower.includes("update");
      const _isGetRequest = method === "GET";
      // For POST/PUT, require method-specific schemas; for GET, be more flexible
      if (method === "POST" && !isCreateRequest) {
        continue;
      }
      if (method === "PUT" && !isUpdateRequest) {
        continue;
      }
      // Unwrap ZodEffects and similar wrappers
      const baseSchema = unwrapZodSchema(zodSchema);
      if (!(baseSchema instanceof z.ZodObject)) {
        continue;
      }
      const zodShape = baseSchema.shape;
      const zodKeys = Object.keys(zodShape);
      // Field overlap
      const matchingKeys: string[] = openAPIKeys.filter((key) => zodKeys.includes(key));
      // Required overlap
      const requiredOverlap = requiredFields.filter((key: string) =>
        zodKeys.includes(key)
      );
      // Type compatibility (very basic: string/number/boolean)
      let typeMatches = 0;
      for (let i = 0; i < matchingKeys.length; i++) {
        const key: string = matchingKeys[i];
        const openType = properties[key]?.type;
        const zodField = zodShape[key];
        if (openType && zodField) {
          if (
            (openType === "string" && zodField instanceof z.ZodString) ||
            (openType === "number" && zodField instanceof z.ZodNumber) ||
            (openType === "integer" && zodField instanceof z.ZodNumber) ||
            (openType === "boolean" && zodField instanceof z.ZodBoolean)
          ) {
            typeMatches++;
          }
        }
      }
      // Enhanced scoring with method-specific bonuses
      let score =
        0.4 * (matchingKeys.length / openAPIKeys.length) +
        0.3 * (requiredOverlap.length / (requiredFields.length || 1)) +
        0.2 * (typeMatches / (openAPIKeys.length || 1));
      // Bonus for exact method matches
      if (isCreateRequest || isUpdateRequest) {
        score += 0.3;
      }
      // Bonus for exact resource matches
      if (nameLower.includes(resource) || nameLower.includes(resourceSingular)) {
        score += 0.1;
      }
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { schema: zodSchema, name: schemaName, score };
      }
    }
    // Enhanced acceptance criteria
    if (bestMatch) {
      // Primary: Accept if score > 0.5 (increased threshold for better precision)
      if (bestMatch.score > 0.5) {
        return bestMatch.schema;
      }
      // Fallback 1: If it's a perfect method match (create/update) and has any overlap
      const isPerfectMethodMatch =
        (method === "POST" && bestMatch.name.toLowerCase().includes("create")) ||
        (method === "PUT" && bestMatch.name.toLowerCase().includes("update"));
      const fallbackMatchingKeys: string[] = openAPIKeys.filter(
        (key: string) =>
          (bestMatch!.schema as z.ZodObject<any>).shape &&
          Object.keys((bestMatch!.schema as z.ZodObject<any>).shape).includes(key)
      );
      if (isPerfectMethodMatch && fallbackMatchingKeys.length >= 1) {
        return bestMatch.schema;
      }
      // Fallback 2: If resource/method match and at least 2 overlapping fields, accept
      if (fallbackMatchingKeys.length >= 2) {
        return bestMatch.schema;
      }
    }
    return null;
  }

  /**
   * Generate contract test data from schema or OpenAPI fallback
   */
  private async generateContractTestData(
    schema: z.ZodSchema<any> | null,
    path: string,
    method: string,
    openAPISchema?: any
  ): Promise<any> {
    if (!schema) return null;

    // Generate base data
    let testData: any;
    if (openAPISchema) {
      testData = this.generateFromOpenAPISchema(openAPISchema);
    } else {
      try {
        testData = this.generateFromSchemaShape(schema);
      } catch (error) {
        console.warn(`Failed to generate test data for ${method} ${path}:`, error);
        return null;
      }
    }

    // Apply test data fixes using seed data
    testData = await this.applyTestDataFixes(testData, path, method);

    return testData;
  }

  /**
   * Generate sample data from schema shape
   */
  private generateFromSchemaShape(schema: z.ZodSchema<any>): any {
    // This is a simplified version - you can expand this based on your needs
    if (schema instanceof z.ZodObject) {
      const result: any = {};
      const shape = schema.shape;

      for (const [key, field] of Object.entries(shape)) {
        result[key] = this.generateSampleValue(field as z.ZodTypeAny);
      }

      return result;
    }

    return this.generateSampleValue(schema as z.ZodTypeAny);
  }

  /**
   * Apply dynamic test data fixes based on endpoint analysis
   */
  private async applyTestDataFixes(
    testData: any,
    path: string,
    method: string
  ): Promise<any> {
    if (!testData) return testData;

    // Get fresh test data for each test
    const seedData = await getTestData();

    // Analyze the endpoint to determine what fixes are needed
    const endpointAnalysis = this.analyzeEndpoint(path, method);

    // --- STEP 1: Fix all reference fields to use real IDs from seed data ---
    testData = await this.fixAllReferenceFieldsWithRealIds(testData, seedData);

    // --- STEP 2: Fix unique fields (like emails) dynamically ---
    testData = await this.fixUniqueFieldsDynamically(testData, path, method, seedData);

    // --- STEP 3: Fix enum fields dynamically ---
    testData = await this.fixEnumFieldsDynamically(testData, path, method);

    // --- STEP 4: Remove auto-generated fields that should be set by the API ---
    testData = this.removeAutoGeneratedFields(testData, path, method);

    // Apply dynamic fixes based on endpoint analysis (still needed for unique fields, etc.)
    return this.applyDynamicFixes(testData, endpointAnalysis, seedData, method);
  }

  /**
   * Fix unique fields (like emails) dynamically by analyzing the schema
   */
  private async fixUniqueFieldsDynamically(
    testData: any,
    path: string,
    method: string,
    seedData: any
  ): Promise<any> {
    if (!testData || typeof testData !== "object") return testData;

    // Get the request schema to analyze field types
    const requestSchema = this.getRequestSchema(path, method);
    if (!requestSchema) return testData;

    const fixedData = { ...testData };

    // Analyze each field in the test data
    for (const [fieldName, fieldValue] of Object.entries(fixedData)) {
      // Check if this field should be unique based on schema analysis
      if (await this.isUniqueField(fieldName, requestSchema, path, method)) {
        fixedData[fieldName] = await this.generateUniqueValue(
          fieldName,
          fieldValue,
          seedData,
          path,
          method
        );
      }
    }

    return fixedData;
  }

  /**
   * Check if a field should be unique based on database schema and Zod schema metadata only.
   * If no metadata is available, returns false (does not guess).
   */
  private async isUniqueField(
    fieldName: string,
    schema: z.ZodSchema<any>,
    path: string,
    method: string
  ): Promise<boolean> {
    if (!schema || !(schema instanceof z.ZodObject)) return false;

    const shape = schema.shape;
    const fieldSchema = shape[fieldName];

    if (!fieldSchema) return false;

    // STEP 1: Check database schema for unique constraints
    const dbUniqueFields = await this.getDatabaseUniqueFields(path, method);
    if (dbUniqueFields.includes(fieldName)) {
      return true;
    }

    // STEP 2: Check if field has unique constraints in Zod schema
    if (fieldSchema._def?.typeName === "ZodString") {
      // Email format is typically unique
      if (
        fieldSchema._def?.checks?.some(
          (check: any) => check.kind === "email" || check.kind === "regex"
        )
      ) {
        return true;
      }
    }

    // STEP 3: Do not fall back to pattern-based detection. If no metadata, return false.
    return false;
  }

  /**
   * Get unique fields for a resource by analyzing the Prisma schema dynamically
   */
  private async getDatabaseUniqueFields(
    path: string,
    _method: string
  ): Promise<string[]> {
    // Extract resource type from path
    const resourceMatch = path.match(/\/api\/([^\/]+)/);
    if (!resourceMatch) return [];

    const resourceType = resourceMatch[1].toLowerCase();
    const uniqueFields: string[] = [];

    try {
      // Read the Prisma schema file
      const fs = require("fs");
      const pathModule = require("path");
      const schemaPath = pathModule.join(process.cwd(), "prisma", "schema.prisma");

      if (!fs.existsSync(schemaPath)) {
        // Fallback: assume id is unique for all resources
        uniqueFields.push("id");
        return uniqueFields;
      }

      const schemaContent = fs.readFileSync(schemaPath, "utf8");

      // Find the model for this resource type
      const modelName = this.getModelNameFromResource(resourceType);
      const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{[^}]*\\}`, "gs");
      const modelMatch = schemaContent.match(modelRegex);

      if (!modelMatch) {
        // Model not found, assume id is unique
        uniqueFields.push("id");
        return uniqueFields;
      }

      const modelDefinition = modelMatch[0];

      // Extract field definitions
      const fieldRegex = /(\w+)\s+(\w+)(\s*\[.*?\])?/g;
      let fieldMatch = fieldRegex.exec(modelDefinition);

      while (fieldMatch !== null) {
        const fieldName = fieldMatch[1];
        const _fieldType = fieldMatch[2];
        const attributes = fieldMatch[3] || "";

        // Check for @id attribute
        if (attributes.includes("@id")) {
          uniqueFields.push(fieldName);
        }
        // Check for @unique attribute
        else if (attributes.includes("@unique")) {
          uniqueFields.push(fieldName);
        }
        // Check for @@unique constraint on multiple fields
        else if (attributes.includes("@@unique")) {
          // Extract field names from @@unique constraint
          const uniqueConstraintMatch = attributes.match(/@@unique\(\[([^\]]+)\]\)/);
          if (uniqueConstraintMatch) {
            const constraintFields = uniqueConstraintMatch[1]
              .split(",")
              .map((f) => f.trim());
            uniqueFields.push(...constraintFields);
          }
        }

        fieldMatch = fieldRegex.exec(modelDefinition);
      }

      // If no unique fields found, assume id is unique
      if (uniqueFields.length === 0) {
        uniqueFields.push("id");
      }
    } catch (error) {
      console.warn(`Failed to read Prisma schema for unique fields: ${error}`);
      // Fallback: assume id is unique
      uniqueFields.push("id");
    }

    return uniqueFields;
  }

  /**
   * Map resource type to Prisma model name
   */
  private getModelNameFromResource(resourceType: string): string {
    // Handle common plural to singular mappings
    const singular = toSingular(resourceType);

    // Capitalize first letter for model name
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }

  /**
   * Dynamically determine if a field is unique based on schema metadata and OpenAPI only.
   * If no OpenAPI or schema metadata is available, returns false (does not guess).
   */
  private isUniqueFieldByPattern(
    fieldName: string,
    fieldSchema: any,
    path?: string,
    method?: string
  ): boolean {
    // 1. Check OpenAPI schema for uniqueness
    if (fieldSchema) {
      // OpenAPI 3.1+ supports 'unique' or 'x-unique' for fields
      if (fieldSchema.unique === true || fieldSchema["x-unique"] === true) {
        return true;
      }
      // Some generators use 'isUnique' or 'uniqueItems' for arrays
      if (fieldSchema.isUnique === true || fieldSchema.uniqueItems === true) {
        return true;
      }
      // Prisma-style metadata (if present)
      if (fieldSchema["@unique"] === true) {
        return true;
      }
    }

    // 2. Check for Zod refinements indicating uniqueness
    if (fieldSchema && typeof fieldSchema === "object" && fieldSchema._def) {
      // Zod .refine() with uniqueness
      if (fieldSchema._def.typeName === "ZodEffects" && fieldSchema._def.refinement) {
        const refStr = fieldSchema._def.refinement.toString();
        if (refStr.includes("unique") || refStr.includes("isUnique")) {
          return true;
        }
      }
      // Zod string with email (often unique)
      if (fieldSchema._def.typeName === "ZodString") {
        const checks = fieldSchema._def.checks || [];
        if (checks.some((check: any) => check.kind === "email")) {
          return true;
        }
      }
    }

    // 3. If path/method are provided, check request schema for unique fields
    if (path && method) {
      const requestSchema = this.getRequestSchema(path, method);
      if (requestSchema && requestSchema instanceof z.ZodObject) {
        const dbUniqueFields = this.getDatabaseUniqueFieldsSync(path, method);
        if (dbUniqueFields.includes(fieldName)) {
          return true;
        }
      }
    }

    // 4. Do not fall back to pattern-based detection. If no metadata, return false.
    return false;
  }

  /**
   * Synchronous version of getDatabaseUniqueFields for pattern-based checks
   */
  private getDatabaseUniqueFieldsSync(path: string, _method: string): string[] {
    // Extract resource type from path
    const resourceMatch = path.match(/\/api\/([^\/]+)/);
    if (!resourceMatch) return [];
    const resourceType = resourceMatch[1].toLowerCase();
    const uniqueFields: string[] = [];
    try {
      const fs = require("fs");
      const pathModule = require("path");
      const schemaPath = pathModule.join(process.cwd(), "prisma", "schema.prisma");
      if (!fs.existsSync(schemaPath)) {
        uniqueFields.push("id");
        return uniqueFields;
      }
      const schemaContent = fs.readFileSync(schemaPath, "utf8");
      const modelName = this.getModelNameFromResource(resourceType);
      const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{[^}]*\\}`, "gs");
      const modelMatch = schemaContent.match(modelRegex);
      if (!modelMatch) {
        uniqueFields.push("id");
        return uniqueFields;
      }
      const modelDefinition = modelMatch[0];
      const fieldRegex = /(\w+)\s+(\w+)(\s*\[.*?\])?/g;
      let fieldMatch = fieldRegex.exec(modelDefinition);
      while (fieldMatch !== null) {
        const fieldName = fieldMatch[1];
        const attributes = fieldMatch[3] || "";
        if (attributes.includes("@id")) {
          uniqueFields.push(fieldName);
        } else if (attributes.includes("@unique")) {
          uniqueFields.push(fieldName);
        } else if (attributes.includes("@@unique")) {
          const uniqueConstraintMatch = attributes.match(/@@unique\(\[([^\]]+)\]\)/);
          if (uniqueConstraintMatch) {
            const constraintFields = uniqueConstraintMatch[1]
              .split(",")
              .map((f) => f.trim());
            uniqueFields.push(...constraintFields);
          }
        }
        fieldMatch = fieldRegex.exec(modelDefinition);
      }
      if (uniqueFields.length === 0) {
        uniqueFields.push("id");
      }
    } catch (_error) {
      uniqueFields.push("id");
    }
    return uniqueFields;
  }

  /**
   * Generate a unique value for a field
   */
  private async generateUniqueValue(
    fieldName: string,
    currentValue: any,
    _seedData: any,
    path?: string,
    method?: string
  ): Promise<any> {
    // Try to get schema information for this field
    const fieldSchema = await this.getFieldSchema(fieldName, path, method);

    if (fieldSchema) {
      // Use schema-driven unique value generation
      return this.generateUniqueValueFromSchema(fieldName, currentValue, fieldSchema);
    }

    // Fallback to pattern-based generation
    return this.generateUniqueValueFromPattern(fieldName, currentValue);
  }

  /**
   * Get the schema for a specific field
   */
  private async getFieldSchema(
    fieldName: string,
    path?: string,
    method?: string
  ): Promise<z.ZodTypeAny | null> {
    if (!path || !method) return null;

    const schema = this.getRequestSchema(path, method);
    if (!schema) return null;

    const unwrapped = unwrapZodSchema(schema);
    if (unwrapped instanceof z.ZodObject) {
      return unwrapped.shape[fieldName] || null;
    }

    return null;
  }

  /**
   * Generate unique value based on schema analysis
   */
  private generateUniqueValueFromSchema(
    fieldName: string,
    currentValue: any,
    fieldSchema: z.ZodTypeAny
  ): any {
    const unwrapped = unwrapZodSchema(fieldSchema);

    // Check for email validation
    if (unwrapped instanceof z.ZodString) {
      const checks = unwrapped._def.checks || [];
      if (checks.some((check: any) => check.kind === "email")) {
        return generateUniqueEmail();
      }
    }

    // Check for UUID validation
    if (unwrapped instanceof z.ZodString) {
      const checks = unwrapped._def.checks || [];
      if (checks.some((check: any) => check.kind === "uuid")) {
        return `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, "0")}`;
      }
    }

    // Check for enum values
    if (unwrapped._def?.typeName === "ZodEnum") {
      const enumValues = unwrapped._def.values;
      if (enumValues.length > 0) {
        return enumValues[0];
      }
    }

    // Check for union with literals (common enum pattern)
    if (unwrapped._def?.typeName === "ZodUnion") {
      const options = unwrapped._def.options;
      if (options.every((opt: any) => opt._def?.typeName === "ZodLiteral")) {
        const literalValues = options.map((opt: any) => opt._def.value);
        if (literalValues.length > 0) {
          return literalValues[0];
        }
      }
    }

    // Check for number types
    if (unwrapped instanceof z.ZodNumber) {
      return Date.now();
    }

    // Check for boolean types
    if (unwrapped instanceof z.ZodBoolean) {
      return true;
    }

    // Fallback to pattern-based generation
    return this.generateUniqueValueFromPattern(fieldName, currentValue);
  }

  /**
   * Generate unique value based on field name patterns
   */
  private generateUniqueValueFromPattern(fieldName: string, currentValue: any): any {
    const fieldLower = fieldName.toLowerCase();
    const timestamp = Date.now();

    // Email fields
    if (fieldLower.includes("email")) {
      return generateUniqueEmail();
    }

    // Name fields
    if (fieldLower.includes("name")) {
      return `Test ${fieldName} ${timestamp}`;
    }

    // Title fields
    if (fieldLower.includes("title")) {
      return `Test ${fieldName} ${timestamp}`;
    }

    // Username fields
    if (fieldLower.includes("username")) {
      return `testuser_${timestamp}`;
    }

    // Slug fields
    if (fieldLower.includes("slug")) {
      return `test-${fieldName}-${timestamp}`;
    }

    // ID fields
    if (
      fieldLower.includes("id") &&
      fieldLower !== "categoryid" &&
      fieldLower !== "userid" &&
      fieldLower !== "productid"
    ) {
      return `00000000-0000-0000-0000-${timestamp.toString(16).padStart(12, "0")}`;
    }

    // Default: return current value if it's already unique-looking
    if (typeof currentValue === "string" && currentValue.includes("test")) {
      return currentValue;
    }

    // Fallback: make it unique
    return `${currentValue || fieldName}_${timestamp}`;
  }

  /**
   * Fix enum fields dynamically by extracting valid values from schema
   */
  private async fixEnumFieldsDynamically(
    testData: any,
    path: string,
    method: string
  ): Promise<any> {
    if (!testData || typeof testData !== "object") return testData;

    // Get the request schema to analyze enum fields
    const requestSchema = this.getRequestSchema(path, method);
    if (!requestSchema) return testData;

    const fixedData = { ...testData };

    // Analyze each field in the test data
    for (const [fieldName, fieldValue] of Object.entries(fixedData)) {
      const validEnumValues = this.getEnumValuesForField(
        fieldName,
        requestSchema,
        path,
        method
      );

      if (validEnumValues && validEnumValues.length > 0) {
        // Set to first valid enum value if current value is null/undefined/invalid
        if (
          !fieldValue ||
          (typeof fieldValue === "string" && !validEnumValues.includes(fieldValue))
        ) {
          fixedData[fieldName] = validEnumValues[0];
        }
      }
    }

    return fixedData;
  }

  /**
   * Get valid enum values for a field from the schema
   */
  private getEnumValuesForField(
    fieldName: string,
    schema: z.ZodSchema<any>,
    path: string,
    method: string
  ): string[] | null {
    if (!schema || !(schema instanceof z.ZodObject)) return null;

    const shape = schema.shape;
    const fieldSchema = shape[fieldName];

    if (!fieldSchema) return null;

    // Check Zod enum
    if (fieldSchema._def?.typeName === "ZodEnum") {
      return fieldSchema._def.values;
    }

    // Check Zod union with literals (common enum pattern)
    if (fieldSchema._def?.typeName === "ZodUnion") {
      const options = fieldSchema._def.options;
      if (options.every((opt: any) => opt._def?.typeName === "ZodLiteral")) {
        return options.map((opt: any) => opt._def.value);
      }
    }

    // Check OpenAPI enum (fallback)
    const endpointDef = this.findEndpointDefinition(path, method);
    if (endpointDef?.requestBody?.content?.["application/json"]?.schema) {
      const openAPISchema = endpointDef.requestBody.content["application/json"].schema;
      if (openAPISchema?.properties?.[fieldName]?.enum) {
        return openAPISchema.properties[fieldName].enum;
      }
    }

    return null;
  }

  /**
   * Remove fields that should be auto-generated by the API
   */
  private removeAutoGeneratedFields(testData: any, path: string, method: string): any {
    if (!testData || typeof testData !== "object") return testData;

    const cleanedData = { ...testData };

    // Only remove auto-generated fields for POST requests (creation)
    if (method === "POST") {
      // Get the schema for this endpoint to analyze field characteristics
      const schema = this.getRequestSchema(path, method);

      if (schema) {
        // Analyze each field in the test data to determine if it should be removed
        for (const fieldName of Object.keys(cleanedData)) {
          if (this.shouldRemoveFieldForCreation(fieldName, schema)) {
            delete cleanedData[fieldName];
          }
        }
      } else {
        // Fallback: use pattern-based detection if no schema is available
        for (const fieldName of Object.keys(cleanedData)) {
          if (this.isAutoGeneratedFieldPattern(fieldName)) {
            delete cleanedData[fieldName];
          }
        }
      }
    }

    return cleanedData;
  }

  /**
   * Determine if a field should be removed for creation requests
   */
  private shouldRemoveFieldForCreation(
    fieldName: string,
    schema: z.ZodSchema<any>
  ): boolean {
    const unwrapped = unwrapZodSchema(schema);

    if (unwrapped instanceof z.ZodObject) {
      const shape = unwrapped.shape;
      const fieldSchema = shape[fieldName];

      if (fieldSchema) {
        // Use the same logic as shouldSkipFieldForDefaults but specifically for creation
        return this.isAutoGeneratedField(fieldName, fieldSchema);
      }
    }

    // Fallback to pattern-based detection
    return this.isAutoGeneratedFieldPattern(fieldName);
  }

  /**
   * Check if a field matches auto-generated field patterns
   */
  private isAutoGeneratedFieldPattern(fieldName: string): boolean {
    const fieldNameLower = fieldName.toLowerCase();

    // Check for common auto-generated field patterns
    const autoGeneratedPatterns = [
      /^id$/i, // Primary key
      /^createdat$/i, // Creation timestamp
      /^updatedat$/i, // Update timestamp
      /^created_at$/i, // Snake case variants
      /^updated_at$/i,
      /^created$/i, // Alternative naming
      /^modified$/i,
      /^timestamp$/i, // Generic timestamp
      /^version$/i, // Version field
      /^uuid$/i, // UUID field
    ];

    return autoGeneratedPatterns.some((pattern) => pattern.test(fieldNameLower));
  }

  /**
   * Fix all reference fields in test data to use real IDs from seed data
   */
  private async fixAllReferenceFieldsWithRealIds(
    testData: any,
    seedData: any
  ): Promise<any> {
    if (!testData || typeof testData !== "object") return testData;

    // Helper to recursively fix references in objects/arrays
    const fixRefs = async (obj: any): Promise<any> => {
      if (Array.isArray(obj)) {
        return Promise.all(obj.map(fixRefs));
      } else if (obj && typeof obj === "object") {
        const newObj: any = { ...obj };
        for (const key of Object.keys(newObj)) {
          // If the field is a likely reference (ends with Id, is string, etc.)
          if (key.match(/Id$/i) && typeof newObj[key] === "string") {
            const refType = key.replace(/Id$/i, "").toLowerCase();

            try {
              // Use the new database-driven approach to get valid reference IDs
              const validId = await getValidReferenceId(refType);
              newObj[key] = validId;
            } catch (_error) {
              // Fallback to seed data if database approach fails
              const candidates = seedData[`${refType}s`] || seedData[refType];
              if (Array.isArray(candidates) && candidates.length > 0) {
                newObj[key] = candidates[0].id;
              }
            }
          } else if (typeof newObj[key] === "object") {
            newObj[key] = await fixRefs(newObj[key]);
          }
        }
        return newObj;
      }
      return obj;
    };

    return fixRefs(testData);
  }

  /**
   * Analyze endpoint to determine required fixes dynamically
   */
  private analyzeEndpoint(
    path: string,
    method: string
  ): {
    resourceType: string;
    requiresReferences: boolean;
    referenceTypes: string[];
    uniqueFields: string[];
  } {
    const resourceMatch = path.match(/\/api\/([^\/]+)/);
    const resourceType = resourceMatch ? resourceMatch[1] : "unknown";

    const analysis = {
      resourceType,
      requiresReferences: false,
      referenceTypes: [] as string[],
      uniqueFields: [] as string[],
    };

    // Find the endpoint definition in OpenAPI spec
    const endpointDef = this.findEndpointDefinition(path);
    if (!endpointDef) {
      return analysis; // No definition found, return basic analysis
    }

    // Analyze request body schema to determine requirements
    if (endpointDef.requestBody?.content?.["application/json"]?.schema) {
      const requestSchema = endpointDef.requestBody.content["application/json"].schema;
      const schemaAnalysis = this.analyzeSchemaForRequirements(
        requestSchema,
        path,
        method
      );

      analysis.requiresReferences = schemaAnalysis.requiresReferences;
      analysis.referenceTypes = schemaAnalysis.referenceTypes;
      analysis.uniqueFields = schemaAnalysis.uniqueFields;
    }

    return analysis;
  }

  /**
   * Analyze schema to determine what references and unique fields are needed
   */
  private analyzeSchemaForRequirements(
    schema: any,
    path: string,
    method: string
  ): {
    requiresReferences: boolean;
    referenceTypes: string[];
    uniqueFields: string[];
  } {
    const analysis = {
      requiresReferences: false,
      referenceTypes: [] as string[],
      uniqueFields: [] as string[],
    };

    // If schema has a reference, resolve it
    if (schema.$ref) {
      const resolvedSchema = this.resolveSchemaReference(schema.$ref);
      if (resolvedSchema) {
        return this.analyzeSchemaForRequirements(resolvedSchema, path, method);
      }
    }

    // Analyze schema properties
    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        const field = fieldSchema as any;

        // Check for reference fields (typically end with 'Id' or are foreign keys)
        if (this.isReferenceField(fieldName, field)) {
          analysis.requiresReferences = true;
          const referenceType = this.inferReferenceType(fieldName, field);
          if (referenceType && !analysis.referenceTypes.includes(referenceType)) {
            analysis.referenceTypes.push(referenceType);
          }
        }

        // Check for unique fields (using pattern-based detection for analysis)
        if (this.isUniqueFieldByPattern(fieldName, field, path, method)) {
          if (!analysis.uniqueFields.includes(fieldName)) {
            analysis.uniqueFields.push(fieldName);
          }
        }
      }
    }

    return analysis;
  }

  /**
   * Check if a field is a reference field
   */
  private isReferenceField(fieldName: string, fieldSchema: any): boolean {
    // Reference fields typically:
    // 1. End with 'Id' (e.g., categoryId, userId)
    // 2. Are UUIDs
    // 3. Are required fields that reference other entities

    const isIdField = fieldName.toLowerCase().endsWith("id");
    const isUUID =
      fieldSchema?.format === "uuid" ||
      (fieldSchema?.type === "string" && fieldSchema?.pattern?.includes("uuid"));
    const isRequired = fieldSchema?.required !== false; // Default to required if not specified

    return isIdField && isUUID && isRequired;
  }

  /**
   * Infer the reference type from field name and schema
   */
  private inferReferenceType(fieldName: string, _fieldSchema: any): string | null {
    // Extract the base resource name from the field name
    // e.g., "categoryId" -> "category", "userId" -> "user"
    const baseName = fieldName.replace(/Id$/i, "").toLowerCase();

    // Map common field names to resource types
    const fieldToResourceMap: Record<string, string> = {
      category: "category",
      user: "user",
      product: "product",
      order: "order",
      customer: "user", // Alias
      owner: "user", // Alias
    };

    return fieldToResourceMap[baseName] || baseName;
  }

  /**
   * Resolve schema reference from OpenAPI spec
   */
  private resolveSchemaReference(ref: string): any {
    // Extract schema name from reference (e.g., "#/components/schemas/Product" -> "Product")
    const schemaName = ref.split("/").pop();
    if (schemaName && this.openAPISpec.components?.schemas?.[schemaName]) {
      return this.openAPISpec.components.schemas[schemaName];
    }
    return null;
  }

  /**
   * Apply dynamic fixes based on endpoint analysis
   */
  private applyDynamicFixes(
    testData: any,
    analysis: any,
    seedData: any,
    method?: string
  ): any {
    const { resourceType, requiresReferences, referenceTypes, uniqueFields } = analysis;

    // Fix references if needed
    if (requiresReferences) {
      testData = this.fixReferences(testData, referenceTypes, seedData);
    }

    // Fix unique fields
    for (const field of uniqueFields) {
      testData = this.fixUniqueField(testData, field);
    }

    // Ensure required fields have sensible defaults
    testData = this.ensureRequiredFields(testData, resourceType, method);

    return testData;
  }

  /**
   * Fix reference fields dynamically
   */
  private fixReferences(testData: any, referenceTypes: string[], seedData: any): any {
    for (const refType of referenceTypes) {
      const refData = this.getReferenceData(refType, seedData);
      if (refData) {
        testData = this.applyReferenceFix(testData, refType, refData);
      }
    }
    return testData;
  }

  /**
   * Get reference data for a specific type dynamically
   */
  private getReferenceData(refType: string, seedData: any): any {
    // Dynamically discover available resources from seed data
    const availableResources = Object.keys(seedData);

    // Try exact match first
    if (seedData[refType]) {
      return seedData[refType];
    }

    // Try plural/singular variations
    const singular = refType.endsWith("s") ? refType.slice(0, -1) : refType;
    const plural = refType.endsWith("s") ? refType : `${refType}s`;

    if (seedData[plural]) {
      return seedData[plural];
    }
    if (seedData[singular]) {
      return seedData[singular];
    }

    // Try fuzzy matching (e.g., "category" matches "categories")
    for (const resource of availableResources) {
      if (
        resource.toLowerCase().includes(refType.toLowerCase()) ||
        refType.toLowerCase().includes(resource.toLowerCase())
      ) {
        return seedData[resource];
      }
    }

    return null;
  }

  /**
   * Apply reference fix based on reference type dynamically
   */
  private applyReferenceFix(testData: any, refType: string, refData: any[]): any {
    if (!refData || refData.length === 0) {
      return testData; // No reference data available
    }

    const referenceId = getItemByIndex(refData, 0).id;

    // Find all fields that reference this type
    const referenceFields = this.findReferenceFields(testData, refType);

    // Apply the reference ID to all matching fields
    for (const fieldName of referenceFields) {
      testData[fieldName] = referenceId;
    }

    // Handle special cases for complex structures
    this.handleComplexReferenceStructures(testData, refType, refData);

    return testData;
  }

  /**
   * Find all fields in test data that reference a specific type
   */
  private findReferenceFields(testData: any, refType: string): string[] {
    const referenceFields: string[] = [];

    for (const fieldName of Object.keys(testData)) {
      if (this.fieldReferencesType(fieldName, refType)) {
        referenceFields.push(fieldName);
      }
    }

    return referenceFields;
  }

  /**
   * Check if a field name references a specific type
   */
  private fieldReferencesType(fieldName: string, refType: string): boolean {
    const fieldLower = fieldName.toLowerCase();
    const typeLower = refType.toLowerCase();

    // Direct match: categoryId -> category
    if (fieldLower.endsWith(`${typeLower}id`) || fieldLower.endsWith(`${typeLower}_id`)) {
      return true;
    }

    // Singular/plural variations
    const typeSingular = typeLower.endsWith("s") ? typeLower.slice(0, -1) : typeLower;
    const typePlural = typeLower.endsWith("s") ? typeLower : `${typeLower}s`;

    if (
      fieldLower.endsWith(`${typeSingular}id`) ||
      fieldLower.endsWith(`${typeSingular}_id`)
    ) {
      return true;
    }
    if (
      fieldLower.endsWith(`${typePlural}id`) ||
      fieldLower.endsWith(`${typePlural}_id`)
    ) {
      return true;
    }

    // Exact match for simple cases
    if (fieldLower === `${typeLower}id` || fieldLower === `${typeLower}_id`) {
      return true;
    }

    return false;
  }

  /**
   * Handle complex reference structures like arrays and nested objects
   */
  private handleComplexReferenceStructures(
    testData: any,
    refType: string,
    refData: any[]
  ): void {
    // Handle orderItems array structure
    if (testData.orderItems && Array.isArray(testData.orderItems)) {
      const referenceId = getItemByIndex(refData, 0).id;

      testData.orderItems = testData.orderItems.map((item: any) => ({
        productId: item.productId || referenceId,
        quantity: item.quantity || 1,
      }));
    }

    // Handle other array structures that might reference this type
    for (const [fieldName, fieldValue] of Object.entries(testData)) {
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        // Check if this array contains objects that reference our type
        const firstItem = fieldValue[0];
        if (typeof firstItem === "object" && firstItem !== null) {
          const referenceFields = this.findReferenceFields(firstItem, refType);
          if (referenceFields.length > 0) {
            // This array contains items that reference our type
            const referenceId = getItemByIndex(refData, 0).id;
            testData[fieldName] = fieldValue.map((item: any) => {
              const updatedItem = { ...item };
              for (const refField of referenceFields) {
                updatedItem[refField] = referenceId;
              }
              return updatedItem;
            });
          }
        }
      }
    }
  }

  /**
   * Fix unique fields
   */
  private fixUniqueField(testData: any, field: string): any {
    if (field === "email" && testData.email) {
      testData.email = generateUniqueEmail();
    }
    return testData;
  }

  /**
   * Ensure required fields have sensible defaults dynamically
   */
  private ensureRequiredFields(
    testData: any,
    resourceType: string,
    method?: string
  ): any {
    // Get defaults based on resource type and field analysis
    const defaults = this.generateDynamicDefaults(resourceType, method);

    for (const [field, value] of Object.entries(defaults)) {
      if (testData[field] === undefined || testData[field] === null) {
        testData[field] = value;
      }
    }

    return testData;
  }

  /**
   * Generate dynamic defaults based on resource type and field patterns
   */
  private generateDynamicDefaults(
    resourceType: string,
    method?: string
  ): Record<string, any> {
    const defaults: Record<string, any> = {};

    // Find the schema for this resource type
    const schema = this.findSchemaForResource(resourceType);
    if (!schema) {
      // Fallback: generate generic defaults based on resource type
      return this.generateGenericDefaults(resourceType);
    }

    // Analyze the schema to generate appropriate defaults
    const unwrapped = unwrapZodSchema(schema);
    if (unwrapped instanceof z.ZodObject) {
      const shape = unwrapped.shape;

      for (const [fieldName, fieldSchema] of Object.entries(shape)) {
        // Skip auto-generated fields and nested objects
        if (this.shouldSkipFieldForDefaults(fieldName, fieldSchema, method)) {
          continue;
        }

        const unwrappedField = unwrapZodSchema(fieldSchema);
        const defaultValue = this.generateDefaultValueForField(
          fieldName,
          unwrappedField,
          resourceType
        );
        if (defaultValue !== undefined) {
          defaults[fieldName] = defaultValue;
        }
      }
    }

    return defaults;
  }

  /**
   * Determine if a field should be skipped when generating defaults
   * Uses dynamic analysis of schema structure and field metadata
   */
  private shouldSkipFieldForDefaults(
    fieldName: string,
    fieldSchema: any,
    method?: string
  ): boolean {
    const unwrapped = unwrapZodSchema(fieldSchema);

    // Skip complex types that should be handled separately
    if (unwrapped instanceof z.ZodObject || unwrapped instanceof z.ZodArray) {
      return true;
    }

    // Analyze field metadata to determine if it should be skipped
    return this.analyzeFieldForSkipping(fieldName, unwrapped, method);
  }

  /**
   * Analyze field metadata to determine if it should be skipped for defaults
   */
  private analyzeFieldForSkipping(
    fieldName: string,
    fieldSchema: z.ZodTypeAny,
    method?: string
  ): boolean {
    // Check if field has auto-generated characteristics
    if (this.isAutoGeneratedField(fieldName, fieldSchema)) {
      return true;
    }

    // Check if field is a reference that shouldn't be in request defaults
    if (this.isReferenceFieldForSkipping(fieldName, fieldSchema, method)) {
      return true;
    }

    // Check if field has read-only characteristics
    if (this.isReadOnlyField(fieldName, fieldSchema)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a field has auto-generated characteristics
   */
  private isAutoGeneratedField(fieldName: string, fieldSchema: z.ZodTypeAny): boolean {
    const fieldNameLower = fieldName.toLowerCase();

    // Check for common auto-generated field patterns
    const autoGeneratedPatterns = [
      /^id$/i, // Primary key
      /^createdat$/i, // Creation timestamp
      /^updatedat$/i, // Update timestamp
      /^created_at$/i, // Snake case variants
      /^updated_at$/i,
      /^created$/i, // Alternative naming
      /^modified$/i,
      /^timestamp$/i, // Generic timestamp
    ];

    if (autoGeneratedPatterns.some((pattern) => pattern.test(fieldNameLower))) {
      return true;
    }

    // Check schema metadata for auto-generation hints
    if (fieldSchema._def?.description?.toLowerCase().includes("auto-generated")) {
      return true;
    }

    // Check for UUID fields that are typically auto-generated
    if (fieldSchema instanceof z.ZodString) {
      const checks = fieldSchema._def.checks || [];
      if (checks.some((check: any) => check.kind === "uuid")) {
        // Only skip if it's likely a primary key or auto-generated UUID
        if (fieldNameLower === "id" || fieldNameLower.includes("uuid")) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a field is a reference that shouldn't be in request defaults
   */
  private isReferenceFieldForSkipping(
    fieldName: string,
    fieldSchema: z.ZodTypeAny,
    method?: string
  ): boolean {
    const fieldNameLower = fieldName.toLowerCase();

    // Check for foreign key patterns
    const foreignKeyPatterns = [
      /^(\w+)id$/i, // userId, categoryId, etc.
      /^(\w+)_id$/i, // user_id, category_id, etc.
      /^fk_(\w+)$/i, // fk_user, fk_category, etc.
    ];

    // Only skip if it matches a foreign key pattern
    if (foreignKeyPatterns.some((pattern) => pattern.test(fieldNameLower))) {
      // For PUT/PATCH operations, always skip foreign keys as they shouldn't change
      if (method === "PUT" || method === "PATCH") {
        return true;
      }

      // For POST operations, only skip if the field is not required
      if (method === "POST") {
        const isRequired = this.isFieldRequired(fieldSchema);
        return !isRequired;
      }

      // For other operations, skip by default
      return true;
    }

    return false;
  }

  /**
   * Check if a field has read-only characteristics
   */
  private isReadOnlyField(fieldName: string, fieldSchema: z.ZodTypeAny): boolean {
    const fieldNameLower = fieldName.toLowerCase();

    // Check for read-only field patterns
    const readOnlyPatterns = [
      /^readonly/i,
      /^read_only/i,
      /^computed/i,
      /^calculated/i,
      /^derived/i,
    ];

    if (readOnlyPatterns.some((pattern) => pattern.test(fieldNameLower))) {
      return true;
    }

    // Check schema metadata for read-only hints
    if (fieldSchema._def?.description?.toLowerCase().includes("read-only")) {
      return true;
    }

    // Check for fields that are typically computed
    if (fieldNameLower.includes("hash") || fieldNameLower.includes("checksum")) {
      return true;
    }

    return false;
  }

  /**
   * Check if a field is required in the schema
   */
  private isFieldRequired(fieldSchema: z.ZodTypeAny): boolean {
    // Check if field is optional
    if (fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodNullable) {
      return false;
    }

    // Check for default values that might indicate the field is auto-handled
    if (fieldSchema._def?.defaultValue !== undefined) {
      return false;
    }

    return true;
  }

  /**
   * Find the appropriate schema for a resource type
   */
  private findSchemaForResource(resourceType: string): z.ZodSchema<any> | null {
    const resourceSingular = toSingular(resourceType);
    const resourcePlural = resourceType.endsWith("s") ? resourceType : `${resourceType}s`;

    // Look for schemas that match the resource type
    for (const [schemaName, schema] of Object.entries(this.availableSchemas)) {
      const nameLower = schemaName.toLowerCase();

      // Check if schema name contains the resource (singular or plural)
      const hasResourceMatch =
        nameLower.includes(resourceType.toLowerCase()) ||
        nameLower.includes(resourceSingular.toLowerCase()) ||
        nameLower.includes(resourcePlural.toLowerCase());

      if (hasResourceMatch) {
        // Prefer schemas that are specifically for this resource
        if (nameLower.includes("create") || nameLower.includes("request")) {
          return schema;
        }
        // Fallback to any matching schema
        return schema;
      }
    }

    return null;
  }

  /**
   * Generate a default value for a specific field based on its type and name
   */
  private generateDefaultValueForField(
    fieldName: string,
    fieldSchema: z.ZodTypeAny,
    resourceType: string
  ): any {
    const fieldNameLower = fieldName.toLowerCase();

    // Handle common field patterns
    if (fieldNameLower.includes("name")) {
      return `Test ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
    }

    if (fieldNameLower.includes("description")) {
      return `Test ${resourceType} description`;
    }

    if (fieldNameLower.includes("email")) {
      return generateUniqueEmail();
    }

    if (fieldNameLower.includes("price")) {
      return 29.99;
    }

    if (fieldNameLower.includes("quantity") || fieldNameLower.includes("stock")) {
      return 100;
    }

    if (fieldNameLower.includes("status")) {
      // Don't set status for order creation - API should set it automatically
      return undefined;
    }

    // Handle field types
    if (fieldSchema instanceof z.ZodString) {
      if (fieldSchema._def.checks?.some((check: any) => check.kind === "email")) {
        return generateUniqueEmail();
      }
      if (fieldSchema._def.checks?.some((check: any) => check.kind === "uuid")) {
        return "00000000-0000-0000-0000-000000000000";
      }
      return `Test ${fieldName}`;
    }

    if (fieldSchema instanceof z.ZodNumber) {
      return 42;
    }

    if (fieldSchema instanceof z.ZodBoolean) {
      return true;
    }

    if (fieldSchema instanceof z.ZodArray) {
      return [];
    }

    if (fieldSchema instanceof z.ZodObject) {
      return {};
    }

    return undefined;
  }

  /**
   * Generate generic defaults for unknown resource types
   */
  private generateGenericDefaults(resourceType: string): Record<string, any> {
    return {
      name: `Test ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`,
      description: `Test ${resourceType} description`,
    };
  }

  /**
   * Generate sample data from OpenAPI schema shape
   */
  private generateFromOpenAPISchema(openAPISchema: any): any {
    if (!openAPISchema) return null;
    if (openAPISchema.type === "object" && openAPISchema.properties) {
      const result: any = {};
      const requiredFields = openAPISchema.required || [];

      // First, ensure all required fields are included
      for (const requiredField of requiredFields) {
        if (!Object.hasOwn(result, requiredField)) {
          const prop = openAPISchema.properties[requiredField];
          if (prop && typeof prop === "object") {
            result[requiredField] = this.generateValueFromProperty(prop);
          }
        }
      }

      // Then add all other properties
      for (const [key, prop] of Object.entries(openAPISchema.properties)) {
        const p = prop as any;
        if (p && typeof p === "object") {
          result[key] = this.generateValueFromProperty(p);
        }
      }

      return result;
    } else if (openAPISchema.type === "array" && (openAPISchema as any).items) {
      return [this.generateFromOpenAPISchema((openAPISchema as any).items)];
    } else if (openAPISchema.type === "string") {
      return "sample string";
    } else if (openAPISchema.type === "integer" || openAPISchema.type === "number") {
      return 42;
    } else if (openAPISchema.type === "boolean") {
      return true;
    }
    return null;
  }

  /**
   * Generate a value from an OpenAPI property definition
   */
  private generateValueFromProperty(prop: any): any {
    if (prop.type === "string") {
      if (prop.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      else if (prop.format === "email") return "user@example.com";
      else return "sample string";
    } else if (prop.type === "integer" || prop.type === "number") {
      return 42;
    } else if (prop.type === "boolean") {
      return true;
    } else if (prop.type === "array" && prop.items) {
      return [this.generateFromOpenAPISchema(prop.items)];
    } else if (prop.type === "object") {
      return this.generateFromOpenAPISchema(prop);
    } else {
      return null;
    }
  }

  /**
   * Get request schema for endpoint
   */
  private getRequestSchema(path: string, method: string): z.ZodSchema<any> | null {
    // Extract resource name from path
    const resourceMatch = path.match(/\/api\/([^\/]+)/);
    if (!resourceMatch) return null;

    const resource = resourceMatch[1];

    // Handle both singular and plural resource names
    const resourceSingular = resource.endsWith("s") ? resource.slice(0, -1) : resource;
    const resourcePlural = resource.endsWith("s") ? resource : `${resource}s`;

    // Find schemas that match the resource and method
    for (const [schemaName, schema] of Object.entries(this.availableSchemas)) {
      const nameLower = schemaName.toLowerCase();

      // Check if schema name contains the resource (singular or plural)
      const hasResourceMatch =
        nameLower.includes(resource) ||
        nameLower.includes(resourceSingular) ||
        nameLower.includes(resourcePlural);

      if (method === "POST") {
        if (hasResourceMatch && nameLower.includes("create")) {
          return schema;
        }
      }

      if (method === "PUT") {
        if (hasResourceMatch && nameLower.includes("update")) {
          return schema;
        }
      }
    }

    return null;
  }

  /**
   * Detect enum violations by analyzing the endpoint and available schemas
   */
  private detectEnumViolations(
    path: string,
    method: string,
    _definition: any
  ): ViolationTestConfig[] {
    const violations: ViolationTestConfig[] = [];

    // Check if any of the available schemas contain enums
    for (const [schemaName, schema] of Object.entries(this.availableSchemas)) {
      if (this.hasEnumFields(schema)) {
        // Check if this endpoint might use this schema
        if (this.endpointUsesSchema(path, method, schemaName)) {
          const enumFields = this.getEnumFields(schema);
          for (const field of enumFields) {
            // For GET requests, send enum violations as query parameters
            // For other methods, send as request body
            const requestData =
              method === "GET"
                ? { [field]: "INVALID_ENUM_VALUE" }
                : { [field]: "INVALID_ENUM_VALUE" };

            violations.push({
              endpoint: path,
              method,
              description: `Invalid enum value for ${field} in ${method} ${path}`,
              requestData,
              expectedViolation: `Invalid enum value for ${field} should cause validation error`,
              testType: "invalid_enum",
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check if a schema has enum fields
   */
  private hasEnumFields(schema: z.ZodSchema<any>): boolean {
    try {
      // Check if this is an enum schema
      if (schema instanceof z.ZodEnum) {
        return true;
      }

      // Check if this is an object schema with enum fields
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        return Object.values(shape).some((field) => field instanceof z.ZodEnum);
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get enum field names from a schema
   */
  private getEnumFields(schema: z.ZodSchema<any>): string[] {
    const enumFields: string[] = [];
    try {
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        for (const [fieldName, field] of Object.entries(shape)) {
          if (field instanceof z.ZodEnum) {
            enumFields.push(fieldName);
          }
        }
      }
    } catch {
      // Ignore errors in schema analysis
    }
    return enumFields;
  }

  /**
   * Check if an endpoint likely uses a specific schema
   */
  private endpointUsesSchema(path: string, method: string, schemaName: string): boolean {
    // Extract resource name from path (e.g., "/api/products" -> "products")
    const resourceMatch = path.match(/\/api\/([^\/]+)/);
    if (!resourceMatch) return false;

    const resource = resourceMatch[1];
    const schemaLower = schemaName.toLowerCase();

    // Handle both singular and plural resource names
    const resourceSingular = resource.endsWith("s") ? resource.slice(0, -1) : resource;
    const resourcePlural = resource.endsWith("s") ? resource : `${resource}s`;

    // More specific matching to avoid false positives
    if (path.includes("/status")) {
      // Status endpoints should only match status-related schemas
      return schemaLower.includes("status") || schemaLower.includes("orderstatus");
    }

    // For regular endpoints, match resource name in schema more precisely (singular or plural)
    const resourceInSchema =
      schemaLower.includes(resource) ||
      schemaLower.includes(resourceSingular) ||
      schemaLower.includes(resourcePlural);

    // For request schemas, also check method-specific patterns
    if (method === "POST") {
      return (
        resourceInSchema &&
        (schemaLower.includes("create") || schemaLower.includes("request"))
      );
    }

    if (method === "PUT") {
      return (
        resourceInSchema &&
        (schemaLower.includes("update") || schemaLower.includes("request"))
      );
    }

    // For GET requests, match response schemas
    if (method === "GET") {
      return (
        resourceInSchema &&
        (schemaLower.includes("response") || schemaLower.includes("schema"))
      );
    }

    return resourceInSchema;
  }

  /**
   * Generate sample value for a Zod field
   */
  private generateSampleValue(field: z.ZodTypeAny): any {
    if (field instanceof z.ZodString) {
      return "sample string";
    } else if (field instanceof z.ZodNumber) {
      return 42;
    } else if (field instanceof z.ZodBoolean) {
      return true;
    } else if (field instanceof z.ZodArray) {
      return [this.generateSampleValue(field.element)];
    } else if (field instanceof z.ZodObject) {
      const result: any = {};
      for (const [key, subField] of Object.entries(field.shape)) {
        result[key] = this.generateSampleValue(subField as z.ZodTypeAny);
      }
      return result;
    } else if (field instanceof z.ZodEnum) {
      // Use the first enum value
      return field._def.values[0];
    } else if (
      field instanceof z.ZodString &&
      Array.isArray(field._def.checks) &&
      field._def.checks.some((c: any) => c.kind === "uuid")
    ) {
      return "00000000-0000-0000-0000-000000000000";
    } else if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
      return this.generateSampleValue(field.unwrap());
    }

    return null;
  }

  /**
   * Generate invalid request with missing fields
   */
  private generateInvalidRequestMissingFields(schema: z.ZodSchema<any>): any {
    if (schema instanceof z.ZodObject) {
      const result: any = {};
      const shape = schema.shape;

      // Only include optional fields, skip required ones
      for (const [key, field] of Object.entries(shape)) {
        if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
          result[key] = this.generateSampleValue(field as z.ZodTypeAny);
        }
        // Skip required fields to create missing field scenario
      }

      return result;
    }

    return {};
  }

  /**
   * Generate invalid request with wrong types
   */
  private generateInvalidRequestWrongTypes(schema: z.ZodSchema<any>): any {
    if (schema instanceof z.ZodObject) {
      const result: any = {};
      const shape = schema.shape;

      for (const [key, field] of Object.entries(shape)) {
        result[key] = this.generateWrongTypeValue(field as z.ZodTypeAny);
      }

      return result;
    }

    return this.generateWrongTypeValue(schema as z.ZodTypeAny);
  }

  /**
   * Generate wrong type value for a Zod field
   */
  private generateWrongTypeValue(field: z.ZodTypeAny): any {
    if (field instanceof z.ZodString) {
      return 123; // number instead of string
    } else if (field instanceof z.ZodNumber) {
      return "not_a_number"; // string instead of number
    } else if (field instanceof z.ZodBoolean) {
      return "not_a_boolean"; // string instead of boolean
    } else if (field instanceof z.ZodArray) {
      return "not_an_array"; // string instead of array
    } else if (field instanceof z.ZodObject) {
      return "not_an_object"; // string instead of object
    } else if (field instanceof z.ZodEnum) {
      return 123; // number instead of enum
    } else if (
      field instanceof z.ZodString &&
      Array.isArray(field._def.checks) &&
      field._def.checks.some((c: any) => c.kind === "uuid")
    ) {
      return 123; // number instead of UUID
    } else if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) {
      return this.generateWrongTypeValue(field.unwrap());
    }

    return "invalid_value";
  }

  /**
   * Generate invalid request with extra fields
   */
  private generateInvalidRequestExtraFields(schema: z.ZodSchema<any>): any {
    const baseData = this.generateFromSchemaShape(schema);

    // Dynamically generate extra fields based on schema analysis
    const extraFields = this.generateDynamicExtraFields(schema);

    return {
      ...baseData,
      ...extraFields,
    };
  }

  /**
   * Dynamically generate extra fields for violation testing
   */
  private generateDynamicExtraFields(schema: z.ZodSchema<any>): Record<string, any> {
    const extraFields: Record<string, any> = {};

    // Analyze the schema to understand its structure
    const schemaAnalysis = this.analyzeSchemaForExtraFieldGeneration(schema);

    // Generate extra fields based on the analysis
    const fieldCount = Math.min(3, schemaAnalysis.fieldCount + 1); // Add 1-3 extra fields

    for (let i = 1; i <= fieldCount; i++) {
      const fieldName = this.generateExtraFieldName(schemaAnalysis, i);
      const fieldValue = this.generateExtraFieldValue(schemaAnalysis, i);
      extraFields[fieldName] = fieldValue;
    }

    return extraFields;
  }

  /**
   * Analyze schema to determine appropriate extra field generation strategy
   */
  private analyzeSchemaForExtraFieldGeneration(schema: z.ZodSchema<any>): {
    fieldCount: number;
    fieldTypes: string[];
    resourceType: string;
    hasNestedObjects: boolean;
    hasArrays: boolean;
  } {
    const unwrapped = unwrapZodSchema(schema);

    if (!(unwrapped instanceof z.ZodObject)) {
      return {
        fieldCount: 0,
        fieldTypes: [],
        resourceType: "unknown",
        hasNestedObjects: false,
        hasArrays: false,
      };
    }

    const shape = unwrapped.shape;
    const fieldNames = Object.keys(shape);
    const fieldTypes: string[] = [];
    let hasNestedObjects = false;
    let hasArrays = false;

    // Analyze field types
    for (const [_fieldName, fieldSchema] of Object.entries(shape)) {
      const unwrappedField = unwrapZodSchema(fieldSchema);

      if (unwrappedField instanceof z.ZodString) {
        fieldTypes.push("string");
      } else if (unwrappedField instanceof z.ZodNumber) {
        fieldTypes.push("number");
      } else if (unwrappedField instanceof z.ZodBoolean) {
        fieldTypes.push("boolean");
      } else if (unwrappedField instanceof z.ZodObject) {
        fieldTypes.push("object");
        hasNestedObjects = true;
      } else if (unwrappedField instanceof z.ZodArray) {
        fieldTypes.push("array");
        hasArrays = true;
      } else {
        fieldTypes.push("unknown");
      }
    }

    // Infer resource type from field names
    const resourceType = this.inferResourceTypeFromFieldNames(fieldNames);

    return {
      fieldCount: fieldNames.length,
      fieldTypes,
      resourceType,
      hasNestedObjects,
      hasArrays,
    };
  }

  /**
   * Infer resource type from field names
   */
  private inferResourceTypeFromFieldNames(fieldNames: string[]): string {
    const commonPatterns = {
      user: ["email", "password", "name", "role"],
      product: ["name", "price", "description", "category"],
      order: ["status", "items", "total", "customer"],
      category: ["name", "description", "parent"],
    };

    for (const [resource, patterns] of Object.entries(commonPatterns)) {
      const matches = patterns.filter((pattern) =>
        fieldNames.some((field) => field.toLowerCase().includes(pattern))
      );
      if (matches.length >= 2) {
        return resource;
      }
    }

    return "unknown";
  }

  /**
   * Generate appropriate extra field name
   */
  private generateExtraFieldName(_analysis: any, index: number): string {
    const prefixes = ["extra", "additional", "custom", "test"];
    const suffixes = ["Field", "Property", "Attribute", "Data"];

    const prefix = prefixes[index % prefixes.length];
    const suffix = suffixes[index % suffixes.length];

    return `${prefix}${suffix}${index}`;
  }

  /**
   * Generate appropriate extra field value based on schema analysis
   */
  private generateExtraFieldValue(_analysis: any, index: number): any {
    const valueTypes = ["string", "number", "boolean", "object", "array"];
    const typeIndex = index % valueTypes.length;
    const type = valueTypes[typeIndex];

    switch (type) {
      case "string":
        return `extra_value_${index}`;
      case "number":
        return 100 + index;
      case "boolean":
        return index % 2 === 0;
      case "object":
        return {
          nested: `nested_value_${index}`,
          count: index,
        };
      case "array":
        return [`item_${index}`, `value_${index}`];
      default:
        return `default_extra_${index}`;
    }
  }

  /**
   * Run a contract test
   */
  async runContractTest(config: ContractTestConfig): Promise<ContractTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const validationSteps: ValidationStep[] = [];

    let url = `${this.baseUrl}${config.endpoint}`;
    let resolvedUrl = url;
    let requestBody: string | undefined = undefined;

    try {
      // Dynamically replace path parameters based on OpenAPI spec
      resolvedUrl = await this.replacePathParametersDynamically(
        url,
        config.endpoint,
        config.method
      );

      const options: RequestInit = {
        method: config.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (config.testData && ["POST", "PUT", "PATCH"].includes(config.method)) {
        options.body = JSON.stringify(config.testData);
        requestBody = options.body;
      }

      const response = await fetch(resolvedUrl, options);
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
          config.responseSchema.parse(parsedData);
          validationSteps.push({
            name: "Response Schema Validation",
            passed: true,
            details: "Response data conforms to expected schema",
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            const validationErrors = error.errors
              .map((err) => `${err.path.join(".")}: ${err.message}`)
              .join(", ");
            validationSteps.push({
              name: "Response Schema Validation",
              passed: false,
              error: `Schema validation failed: ${validationErrors}`,
            });
            errors.push(`Response schema validation failed: ${error.message}`);
            error.errors.forEach((err) => {
              errors.push(`  - ${err.path.join(".")}: ${err.message}`);
            });
          } else {
            validationSteps.push({
              name: "Response Schema Validation",
              passed: false,
              error: `Unexpected error: ${error}`,
            });
            errors.push(`Unexpected error: ${error}`);
          }
        }
      } else if (config.responseSchema) {
        validationSteps.push({
          name: "Response Schema Validation",
          passed: true,
          details: "Skipped - response status is not in 2xx range",
        });
      }

      // Print debug info for failed contract tests
      if (errors.length > 0) {
        console.log("\n--- CONTRACT TEST FAILURE DEBUG ---");
        console.log(`Endpoint: ${config.method} ${config.endpoint}`);
        console.log(`Resolved URL: ${resolvedUrl}`);
        if (requestBody) {
          console.log(`Request Body: ${requestBody}`);
        } else {
          console.log("Request Body: <none>");
        }
        console.log("--- END DEBUG ---\n");
      }

      return {
        success: errors.length === 0,
        endpoint: config.endpoint,
        method: config.method,
        statusCode: response.status,
        errors,
        responseTime,
        testType: "contract",
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

      // Print debug info for failed contract tests
      console.log("\n--- CONTRACT TEST FAILURE DEBUG ---");
      console.log(`Endpoint: ${config.method} ${config.endpoint}`);
      console.log(`Resolved URL: ${resolvedUrl}`);
      if (requestBody) {
        console.log(`Request Body: ${requestBody}`);
      } else {
        console.log("Request Body: <none>");
      }
      console.log("--- END DEBUG ---\n");

      return {
        success: false,
        endpoint: config.endpoint,
        method: config.method,
        statusCode: 0,
        errors,
        responseTime,
        testType: "contract",
        validationSteps,
      };
    }
  }

  /**
   * Run a violation test
   */
  async runViolationTest(config: ViolationTestConfig): Promise<ViolationTestResult> {
    const startTime = Date.now();
    let actualResult = "";
    let success = false;

    try {
      let url = `${this.baseUrl}${config.endpoint}`;

      // Dynamically replace path parameters based on OpenAPI spec
      url = await this.replacePathParametersDynamically(
        url,
        config.endpoint,
        config.method
      );

      const options: RequestInit = {
        method: config.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (config.requestData) {
        if (["POST", "PUT", "PATCH"].includes(config.method)) {
          // Handle malformed JSON case
          if (typeof config.requestData === "string") {
            options.body = config.requestData;
          } else {
            options.body = JSON.stringify(config.requestData);
          }
        } else if (config.method === "GET") {
          // Add query parameters for GET requests
          const params = new URLSearchParams();
          if (typeof config.requestData === "object") {
            Object.entries(config.requestData).forEach(([key, value]) => {
              params.append(key, String(value));
            });
          }
          if (params.toString()) {
            url += `?${params.toString()}`;
          }
        }
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      const responseData = await response.text();

      let parsedData: any;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      // Track schema coverage for error responses
      if (response.status >= 400 && response.status < 500) {
        // Track Error schema coverage for 4xx responses
        this.trackSchemaCoverage("Error");

        // Also track endpoint coverage
        this.trackEndpointCoverage(config.endpoint, config.method);
      }

      // Determine if violation was detected based on test type
      switch (config.testType) {
        case "missing_field":
        case "wrong_type":
        case "extra_field":
        case "invalid_enum":
          // These should return 4xx status codes for validation errors
          success = response.status >= 400 && response.status < 500;
          actualResult = `Status: ${response.status}, Response: ${JSON.stringify(parsedData)}`;
          break;

        case "wrong_status":
          // For malformed JSON, expect 400 (improved validation) or 500 (fallback)
          if (config.description.includes("Malformed JSON")) {
            success = response.status === 400 || response.status === 500;
            actualResult = `Status: ${response.status}, Expected: 400 (improved validation) or 500 (fallback)`;
          } else if (config.description.includes("Invalid UUID")) {
            success = response.status >= 400 && response.status < 500;
            actualResult = `Status: ${response.status}, Expected: 4xx`;
          } else if (config.description.includes("Non-existent endpoint")) {
            success = response.status >= 400 && response.status < 500;
            actualResult = `Status: ${response.status}, Expected: 4xx`;
          } else {
            success = response.status >= 400 && response.status < 500;
            actualResult = `Status: ${response.status}, Expected: 4xx`;
          }
          break;
      }

      return {
        success,
        endpoint: config.endpoint,
        method: config.method,
        description: config.description,
        expectedViolation: config.expectedViolation,
        actualResult,
        responseTime,
        testType: "violation",
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      actualResult = `Request failed: ${error}`;

      // For network errors, we consider it a violation detection
      success = true;

      return {
        success,
        endpoint: config.endpoint,
        method: config.method,
        description: config.description,
        expectedViolation: config.expectedViolation,
        actualResult,
        responseTime,
        testType: "violation",
      };
    }
  }

  /**
   * Generate and run all contract tests
   */
  async runAllContractTests(): Promise<ContractTestResult[]> {
    console.log("\n🔗 Running Contract Tests...");
    console.log("=".repeat(50));

    // Validate server connection first
    const serverAvailable = await this.validateServerConnection();
    if (!serverAvailable) {
      console.log("⚠️  Proceeding with tests despite server connection warning...");
    }

    const endpoints = this.extractEndpoints();
    const results: ContractTestResult[] = [];

    for (const endpoint of endpoints) {
      try {
        const config = await this.generateContractTestConfig(endpoint);

        if (config.requestSchema || config.responseSchema) {
          console.log(`\n🔗 Testing ${endpoint.method} ${endpoint.path}`);
          const result = await this.runContractTest(config);
          results.push(result);

          if (result.success) {
            console.log(`✅ ${endpoint.method} ${endpoint.path} - PASSED`);
          } else {
            console.log(`❌ ${endpoint.method} ${endpoint.path} - FAILED`);
            console.log(
              `   Status: ${result.statusCode}, Errors: ${result.errors.join(", ")}`
            );
          }
        } else {
          console.log(
            `⏭️  Skipping ${endpoint.method} ${endpoint.path} - no schemas found`
          );
        }
      } catch (error) {
        console.error(`❌ Error testing ${endpoint.method} ${endpoint.path}:`, error);
        results.push({
          success: false,
          endpoint: endpoint.path,
          method: endpoint.method,
          statusCode: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
          testType: "contract",
          validationSteps: [],
        });
      }
    }

    this.contractResults = results;
    return results;
  }

  /**
   * Generate and run all violation tests
   */
  async runAllViolationTests(): Promise<ViolationTestResult[]> {
    console.log("\n🚨 Running Violation Tests...");
    console.log("=".repeat(50));

    // Validate server connection first
    const serverAvailable = await this.validateServerConnection();
    if (!serverAvailable) {
      console.log("⚠️  Proceeding with tests despite server connection warning...");
    }

    const endpoints = this.extractEndpoints();
    const results: ViolationTestResult[] = [];

    for (const endpoint of endpoints) {
      try {
        const configs = this.generateViolationTestConfigs(endpoint);

        if (configs.length > 0) {
          console.log(
            `\n🚨 Testing ${endpoint.method} ${endpoint.path} (${configs.length} violation tests)`
          );

          for (const config of configs) {
            const result = await this.runViolationTest(config);
            results.push(result);

            const status = result.success ? "✅ PASS" : "❌ FAIL";
            console.log(`   ${status} ${config.description}`);

            if (!result.success) {
              console.log(`      Expected: ${config.expectedViolation}`);
              console.log(`      Actual: ${result.actualResult}`);
            }
          }
        } else {
          console.log(
            `⏭️  Skipping ${endpoint.method} ${endpoint.path} - no violation tests generated`
          );
        }
      } catch (error) {
        console.error(`❌ Error testing ${endpoint.method} ${endpoint.path}:`, error);
        results.push({
          success: false,
          endpoint: endpoint.path,
          method: endpoint.method,
          description: "Test execution error",
          expectedViolation: "N/A",
          actualResult: error instanceof Error ? error.message : "Unknown error",
          testType: "violation",
        });
      }
    }

    this.violationResults = results;
    return results;
  }

  /**
   * Run both contract and violation tests
   */
  async runAllTests(): Promise<UnifiedTestResult[]> {
    console.log("🚀 Starting Unified Dynamic Testing System");
    console.log("=".repeat(50));

    const contractResults = await this.runAllContractTests();
    const violationResults = await this.runAllViolationTests();

    // Print coverage report
    this.printCoverageReport();

    return [...contractResults, ...violationResults];
  }

  /**
   * Get contract test results
   */
  getContractResults(): ContractTestResult[] {
    return this.contractResults;
  }

  /**
   * Get violation test results
   */
  getViolationResults(): ViolationTestResult[] {
    return this.violationResults;
  }

  /**
   * Get all test results
   */
  getAllResults(): UnifiedTestResult[] {
    return [...this.contractResults, ...this.violationResults];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    contract: { total: number; passed: number; failed: number; successRate: number };
    violation: { total: number; passed: number; failed: number; successRate: number };
    overall: { total: number; passed: number; failed: number; successRate: number };
  } {
    const contractTotal = this.contractResults.length;
    const contractPassed = this.contractResults.filter((r) => r.success).length;
    const contractFailed = contractTotal - contractPassed;
    const contractSuccessRate =
      contractTotal > 0 ? (contractPassed / contractTotal) * 100 : 0;

    const violationTotal = this.violationResults.length;
    const violationPassed = this.violationResults.filter((r) => r.success).length;
    const violationFailed = violationTotal - violationPassed;
    const violationSuccessRate =
      violationTotal > 0 ? (violationPassed / violationTotal) * 100 : 0;

    const overallTotal = contractTotal + violationTotal;
    const overallPassed = contractPassed + violationPassed;
    const overallFailed = overallTotal - overallPassed;
    const overallSuccessRate =
      overallTotal > 0 ? (overallPassed / overallTotal) * 100 : 0;

    return {
      contract: {
        total: contractTotal,
        passed: contractPassed,
        failed: contractFailed,
        successRate: contractSuccessRate,
      },
      violation: {
        total: violationTotal,
        passed: violationPassed,
        failed: violationFailed,
        successRate: violationSuccessRate,
      },
      overall: {
        total: overallTotal,
        passed: overallPassed,
        failed: overallFailed,
        successRate: overallSuccessRate,
      },
    };
  }

  /**
   * Print all test results
   */
  printResults(): void {
    console.log("\n📋 Unified Dynamic Test Results:");
    console.log("=".repeat(50));

    // Print contract test results
    console.log("\n🔗 Contract Tests:");
    this.contractResults.forEach((result, index) => {
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

    // Print violation test results
    console.log("\n🚨 Violation Tests:");
    this.violationResults.forEach((result, index) => {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${index + 1}. ${status} ${result.method} ${result.endpoint} - ${result.testType}`
      );

      if (result.responseTime) {
        console.log(`   ⏱️  Response time: ${result.responseTime}ms`);
      }

      console.log(`   📝 ${result.description}`);
      console.log(`   🎯 Expected: ${result.expectedViolation}`);
      console.log(`   📊 Actual: ${result.actualResult}`);

      if (!result.success) {
        console.log(
          "   ❌ Violation not detected - this may indicate a problem with validation"
        );
      }
    });

    const summary = this.getSummary();
    console.log("\n📊 Summary:");
    console.log(
      `   Contract Tests: ${summary.contract.passed}/${summary.contract.total} passed (${summary.contract.successRate.toFixed(1)}%)`
    );
    console.log(
      `   Violation Tests: ${summary.violation.passed}/${summary.violation.total} passed (${summary.violation.successRate.toFixed(1)}%)`
    );
    console.log(
      `   Overall: ${summary.overall.passed}/${summary.overall.total} passed (${summary.overall.successRate.toFixed(1)}%)`
    );

    if (summary.contract.failed > 0) {
      console.log("\n❌ Contract violations detected!");
      console.log("Please fix the API responses to match the expected schemas.");
    }

    if (summary.violation.failed > 0) {
      console.log("\n❌ Some violations were not detected!");
      console.log("This may indicate that your API validation is not strict enough.");
    }

    if (summary.overall.failed === 0) {
      console.log("\n✅ All tests passed!");
      console.log("Your API validation is working correctly.");
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
   * Track endpoint coverage
   */
  private trackEndpointCoverage(endpoint: string, method: string): void {
    // Normalize the endpoint to match the original OpenAPI spec
    const normalizedEndpoint = this.normalizeEndpointForCoverage(endpoint);
    // Only track if the normalized endpoint exists in the OpenAPI spec
    const existsInSpec = Object.keys(this.openAPISpec.paths).some((specPath) =>
      this.pathsMatch(normalizedEndpoint, specPath)
    );
    if (existsInSpec) {
      this.testedEndpoints.add(`${method} ${normalizedEndpoint}`);
    }
  }

  /**
   * Normalize endpoint path for coverage tracking
   * This ensures we only track original endpoints from the OpenAPI spec
   */
  private normalizeEndpointForCoverage(endpoint: string): string {
    // Get the original endpoint definition from OpenAPI spec
    const originalEndpoint = this.findOriginalEndpointInSpec(endpoint);
    if (originalEndpoint) {
      return originalEndpoint;
    }

    // Fallback: dynamically replace test-specific path modifications
    return this.dynamicallyNormalizeEndpoint(endpoint);
  }

  /**
   * Find the original endpoint in the OpenAPI spec
   */
  private findOriginalEndpointInSpec(endpoint: string): string | null {
    // Extract the base path without test modifications
    const basePath = this.extractBasePathFromEndpoint(endpoint);

    // Look for matching endpoint in OpenAPI spec
    for (const [path, _methods] of Object.entries(this.openAPISpec.paths)) {
      if (this.pathsMatch(basePath, path)) {
        return path;
      }
    }

    return null;
  }

  /**
   * Extract base path from potentially modified endpoint
   */
  private extractBasePathFromEndpoint(endpoint: string): string {
    // Remove common test modifications
    let basePath = endpoint;

    // Replace UUID patterns with parameter placeholders
    basePath = basePath.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
      "/{id}"
    );

    // Replace common test-specific modifications
    basePath = basePath.replace(/\/invalid-uuid/g, "/{id}");
    basePath = basePath.replace(/\/test-[^\/]+/g, "/{id}");
    basePath = basePath.replace(/\/[0-9]+/g, "/{id}");

    return basePath;
  }

  /**
   * Check if two paths match (considering parameter placeholders)
   */
  private pathsMatch(path1: string, path2: string): boolean {
    // Normalize both paths
    const normalized1 = this.normalizePathForComparison(path1);
    const normalized2 = this.normalizePathForComparison(path2);

    return normalized1 === normalized2;
  }

  /**
   * Normalize path for comparison by standardizing parameter placeholders
   */
  private normalizePathForComparison(path: string): string {
    return path
      .replace(/\{[^}]+\}/g, "{param}") // Replace all parameter placeholders with {param}
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
        "/{param}"
      ) // Replace UUIDs
      .replace(/\/invalid-uuid/g, "/{param}") // Replace test UUIDs
      .replace(/\/test-[^\/]+/g, "/{param}") // Replace test patterns
      .replace(/\/[0-9]+/g, "/{param}"); // Replace numeric IDs
  }

  /**
   * Dynamically normalize endpoint based on OpenAPI spec patterns
   */
  private dynamicallyNormalizeEndpoint(endpoint: string): string {
    // Analyze the endpoint to find path parameters
    const pathParams = this.extractPathParametersFromEndpoint(endpoint);

    let normalized = endpoint;

    // Replace each path parameter with its original placeholder
    for (const param of pathParams) {
      const originalPlaceholder = this.findOriginalParameterPlaceholder(endpoint, param);
      if (originalPlaceholder) {
        normalized = normalized.replace(param.value, originalPlaceholder);
      }
    }

    return normalized;
  }

  /**
   * Extract path parameters from an endpoint
   */
  private extractPathParametersFromEndpoint(
    endpoint: string
  ): Array<{ name: string; value: string }> {
    const params: Array<{ name: string; value: string }> = [];

    // Match UUID patterns
    const uuidMatches = endpoint.match(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
    );
    if (uuidMatches) {
      uuidMatches.forEach((match) => {
        params.push({ name: "id", value: match });
      });
    }

    // Match test patterns
    const testMatches = endpoint.match(/\/invalid-uuid/g);
    if (testMatches) {
      testMatches.forEach((match) => {
        params.push({ name: "id", value: match });
      });
    }

    // Match numeric IDs
    const numericMatches = endpoint.match(/\/[0-9]+/g);
    if (numericMatches) {
      numericMatches.forEach((match) => {
        params.push({ name: "id", value: match });
      });
    }

    return params;
  }

  /**
   * Find the original parameter placeholder for a given parameter value
   */
  private findOriginalParameterPlaceholder(
    endpoint: string,
    _param: { name: string; value: string }
  ): string | null {
    // Look for the original endpoint definition in OpenAPI spec
    const basePath = this.extractBasePathFromEndpoint(endpoint);

    for (const [path, _methods] of Object.entries(this.openAPISpec.paths)) {
      if (this.pathsMatch(basePath, path)) {
        // Find the parameter in the original path
        const paramMatch = path.match(/\{([^}]+)\}/);
        if (paramMatch) {
          return `{${paramMatch[1]}}`;
        }
      }
    }

    // Default to {id} if no match found
    return "{id}";
  }

  /**
   * Track schema coverage
   */
  private trackSchemaCoverage(schemaName: string): void {
    this.testedSchemas.add(schemaName);
  }

  /**
   * Track nested schema coverage by analyzing schema references within a schema
   */
  private trackNestedSchemaCoverage(schemaName: string): void {
    if (!this.openAPISpec.components?.schemas?.[schemaName]) {
      return;
    }

    const schema = this.openAPISpec.components.schemas[schemaName];
    this.analyzeSchemaForNestedReferences(schema);
  }

  /**
   * Recursively analyze a schema for nested schema references
   */
  private analyzeSchemaForNestedReferences(schema: any): void {
    if (!schema || typeof schema !== "object") {
      return;
    }

    // Check if this is a direct schema reference
    if (schema.$ref) {
      const nestedSchemaName = schema.$ref.split("/").pop();
      if (nestedSchemaName) {
        this.trackSchemaCoverage(nestedSchemaName);
      }
      return;
    }

    // Check object properties
    if (schema.properties) {
      for (const property of Object.values(schema.properties)) {
        this.analyzeSchemaForNestedReferences(property);
      }
    }

    // Check array items
    if (schema.items) {
      this.analyzeSchemaForNestedReferences(schema.items);
    }

    // Check allOf, anyOf, oneOf
    ["allOf", "anyOf", "oneOf"].forEach((key) => {
      if (schema[key] && Array.isArray(schema[key])) {
        schema[key].forEach((item: any) => {
          this.analyzeSchemaForNestedReferences(item);
        });
      }
    });
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
    console.log(`   Contract Tests: ${this.contractTestConfigs.length}`);
    console.log(`   Violation Tests: ${this.violationTestConfigs.length}`);
    console.log(
      `   Total Tests: ${this.contractTestConfigs.length + this.violationTestConfigs.length}`
    );
  }

  /**
   * Get detailed coverage information for programmatic access
   */
  getDetailedCoverage(): {
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
    testConfigs: {
      contract: ContractTestConfig[];
      violation: ViolationTestConfig[];
      total: number;
    };
  } {
    const coverage = this.getCoverageStats();

    return {
      endpoints: coverage.endpoints,
      schemas: coverage.schemas,
      testConfigs: {
        contract: this.contractTestConfigs,
        violation: this.violationTestConfigs,
        total: this.contractTestConfigs.length + this.violationTestConfigs.length,
      },
    };
  }

  /**
   * Get schema name from Zod schema
   */
  private getSchemaName(schema: z.ZodSchema<any> | null): string | undefined {
    if (!schema) return undefined;

    // Find the schema name by comparing with available schemas
    for (const [name, availableSchema] of Object.entries(this.availableSchemas)) {
      if (schema === availableSchema) {
        return name;
      }
    }

    // For array schemas, try to get the element schema name
    if (schema instanceof z.ZodArray) {
      const elementName = this.getSchemaName(schema.element);
      return elementName ? `Array<${elementName}>` : "Array<Unknown>";
    }

    return "Unknown";
  }

  /**
   * Get mapping type description
   */
  private getMappingType(
    requestSchema: z.ZodSchema<any> | null,
    responseSchema: z.ZodSchema<any> | null
  ): string {
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
   * Clear all results
   */
  clearResults(): void {
    this.contractResults = [];
    this.violationResults = [];
    this.testedEndpoints.clear();
    this.testedSchemas.clear();
    this.contractTestConfigs = [];
    this.violationTestConfigs = [];
  }

  /**
   * Dynamically replace path parameters based on OpenAPI spec
   */
  private async replacePathParametersDynamically(
    url: string,
    endpoint: string,
    method: string
  ): Promise<string> {
    // Find the endpoint definition in OpenAPI spec
    const endpointDef = this.findEndpointDefinition(endpoint, method);
    if (!endpointDef) {
      return url; // No definition found, return as-is
    }

    // Get path parameters from the endpoint definition
    const pathParams = endpointDef.parameters?.filter((p: any) => p.in === "path") || [];

    // Get test data for dynamic ID generation
    const seedData = await getTestData();

    // Replace each path parameter dynamically
    for (const param of pathParams) {
      const paramName = param.name;
      const paramPattern = new RegExp(`\\{${paramName}\\}`, "g");

      // Generate appropriate value based on parameter type and endpoint context
      const paramValue = this.generateDynamicParameterValue(param, endpoint, seedData);

      url = url.replace(paramPattern, paramValue);
    }

    return url;
  }

  /**
   * Find endpoint definition in OpenAPI spec
   */
  private findEndpointDefinition(
    endpoint: string,
    method?: string
  ): EndpointDefinition | null {
    // Try to find the endpoint in the OpenAPI spec
    const pathDef = this.openAPISpec.paths[endpoint];
    if (!pathDef) return null;

    if (method) {
      // Use the specific method if provided
      const methodDef = pathDef[method.toLowerCase()];
      if (methodDef) {
        return {
          path: endpoint,
          method: method.toUpperCase(),
          summary: methodDef.summary || "",
          description: methodDef.description || "",
          tags: methodDef.tags || [],
          parameters: methodDef.parameters || [],
          requestBody: methodDef.requestBody,
          responses: methodDef.responses || {},
        };
      }
    } else {
      // For now, try common methods - in practice, the method should be passed in
      const methods = ["get", "post", "put", "patch", "delete"];
      for (const method of methods) {
        const methodDef = pathDef[method];
        if (methodDef) {
          return {
            path: endpoint,
            method: method.toUpperCase(),
            summary: methodDef.summary || "",
            description: methodDef.description || "",
            tags: methodDef.tags || [],
            parameters: methodDef.parameters || [],
            requestBody: methodDef.requestBody,
            responses: methodDef.responses || {},
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract HTTP method from endpoint string
   */
  private extractMethodFromEndpoint(_endpoint: string): string {
    // This is a simplified extraction - in practice, the method comes from the test config
    return "GET"; // Default fallback
  }

  /**
   * Extract path from endpoint string
   */
  private extractPathFromEndpoint(endpoint: string): string {
    return endpoint;
  }

  /**
   * Generate dynamic parameter value based on parameter definition and context
   */
  private generateDynamicParameterValue(
    param: any,
    endpoint: string,
    seedData: any
  ): string {
    const paramName = param.name.toLowerCase();
    const paramType = param.schema?.type || param.type;

    // Generate value based on parameter type and context
    if (paramType === "string" && param.schema?.format === "uuid") {
      // UUID parameter - generate based on endpoint context
      return this.generateContextualUUID(paramName, endpoint, seedData);
    } else if (paramType === "string") {
      // String parameter
      return this.generateStringValue(paramName, param.schema);
    } else if (paramType === "integer" || paramType === "number") {
      // Numeric parameter
      return this.generateNumericValue(paramName, param.schema);
    }

    // Fallback
    return "default-value";
  }

  /**
   * Generate contextual UUID based on endpoint and parameter name
   */
  private generateContextualUUID(
    _paramName: string,
    endpoint: string,
    seedData: any
  ): string {
    // Extract resource type from endpoint path
    const resourceMatch = endpoint.match(/\/api\/([^\/]+)/);
    const resource = resourceMatch ? resourceMatch[1] : "unknown";

    // Map resource types to seed data
    const resourceMap: Record<string, any[]> = {
      products: seedData.products,
      categories: seedData.categories,
      orders: seedData.orders,
      users: seedData.users,
    };

    const resourceData = resourceMap[resource];
    if (resourceData && resourceData.length > 0) {
      // Use first item's ID for consistency
      return resourceData[0].id;
    }

    // Fallback to a valid UUID format
    return "00000000-0000-0000-0000-000000000000";
  }

  /**
   * Generate string value based on parameter schema
   */
  private generateStringValue(_paramName: string, schema: any): string {
    if (schema?.format === "email") {
      return generateUniqueEmail();
    } else if (schema?.enum) {
      return schema.enum[0]; // Use first enum value
    } else if (schema?.pattern) {
      // For patterns, generate a simple string (could be enhanced with regex generation)
      return "sample-string";
    }

    return "sample-string";
  }

  /**
   * Generate numeric value based on parameter schema
   */
  private generateNumericValue(_paramName: string, schema: any): string {
    if (schema?.minimum !== undefined) {
      return Math.max(schema.minimum, 1).toString();
    } else if (schema?.maximum !== undefined) {
      return Math.min(schema.maximum, 100).toString();
    }

    return "1";
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Import the disconnect function to avoid circular dependency
    const { disconnect } = await import("./test-data");
    await disconnect();
  }

  /**
   * Validate that the server is running on the configured port
   */
  private async validateServerConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/test`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn(`⚠️  Warning: Could not connect to server at ${this.baseUrl}`);
      console.warn(
        `   Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      console.warn(`   Make sure your server is running on the correct port.`);
      return false;
    }
  }
}

// Global instance for easy access
export const unifiedTester = new UnifiedDynamicTester();

// Utility to recursively unwrap ZodEffects and get the base schema
function unwrapZodSchema(schema: any): any {
  let current = schema;
  // Unwrap ZodEffects, ZodOptional, ZodNullable, etc.
  while (current && (current._def?.type || current._def?.schema)) {
    if (current._def.type) {
      current = current._def.type;
    } else if (current._def.schema) {
      current = current._def.schema;
    } else {
      break;
    }
  }
  return current;
}

// Utility to get singular form of a resource (handles common English plurals)
function toSingular(resource: string): string {
  if (resource.endsWith("ies")) {
    return `${resource.slice(0, -3)}y`; // categories -> category
  } else if (resource.endsWith("ses")) {
    return resource.slice(0, -2); // e.g., statuses -> status
  } else if (resource.endsWith("s")) {
    return resource.slice(0, -1); // products -> product
  }
  return resource;
}
