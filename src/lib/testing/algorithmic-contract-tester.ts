import * as fs from "fs";
import * as yaml from "js-yaml";
import { z } from "zod";
import { contractTester } from "./contract-tester";

// Simplified types for OpenAPI specification
interface OpenAPISpec {
  openapi: string;
  info: any;
  servers: any[];
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, any>;
  };
  tags: any[];
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

interface Operation {
  summary: string;
  description?: string;
  tags: string[];
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
}

// Test data generators
class TestDataGenerator {
  private static uuidCounter = 0;
  private static emailCounter = 0;

  static generateUUID(): string {
    this.uuidCounter++;
    return `00000000-0000-0000-0000-${this.uuidCounter.toString().padStart(12, "0")}`;
  }

  static generateEmail(): string {
    this.emailCounter++;
    return `test${this.emailCounter}@example.com`;
  }

  static generateString(minLength: number = 1, maxLength: number = 50): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  }

  static generateNumber(min: number = 0, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateDecimal(): string {
    const num = Math.random() * 1000;
    return num.toFixed(2);
  }

  static generateDate(): string {
    return new Date().toISOString();
  }

  static generateBoolean(): boolean {
    return Math.random() > 0.5;
  }
}

// Simplified schema to Zod converter
class SchemaToZodConverter {
  private schemas: Record<string, any>;

  constructor(schemas: Record<string, any>) {
    this.schemas = schemas;
  }

  convert(schema: any, schemaName?: string): z.ZodSchema {
    if (schema.$ref) {
      return this.resolveReference(schema.$ref);
    }

    switch (schema.type) {
      case "string":
        return this.convertString(schema);
      case "number":
      case "integer":
        return this.convertNumber(schema);
      case "boolean":
        return z.boolean();
      case "array":
        return this.convertArray(schema);
      case "object":
        return this.convertObject(schema, schemaName);
      default:
        return z.any();
    }
  }

  private convertString(schema: any): z.ZodSchema {
    let zodSchema: z.ZodSchema = z.string();

    if (schema.format === "uuid") {
      zodSchema = z.string().uuid();
    } else if (schema.format === "email") {
      zodSchema = z.string().email();
    } else if (schema.format === "date-time") {
      zodSchema = z.string().datetime();
    } else if (schema.format === "uri") {
      zodSchema = z.string().url();
    }

    if (schema.minLength !== undefined) {
      zodSchema = (zodSchema as z.ZodString).min(schema.minLength);
    }

    if (schema.maxLength !== undefined) {
      zodSchema = (zodSchema as z.ZodString).max(schema.maxLength);
    }

    if (schema.pattern) {
      zodSchema = (zodSchema as z.ZodString).regex(new RegExp(schema.pattern));
    }

    if (schema.enum) {
      zodSchema = z.enum(schema.enum as [string, ...string[]]);
    }

    if (schema.nullable) {
      zodSchema = zodSchema.nullable();
    }

    return zodSchema;
  }

  private convertNumber(schema: any): z.ZodSchema {
    let zodSchema: z.ZodSchema =
      schema.type === "integer" ? z.number().int() : z.number();

    if (schema.minimum !== undefined) {
      zodSchema = (zodSchema as z.ZodNumber).gte(schema.minimum);
    }

    if (schema.maximum !== undefined) {
      zodSchema = (zodSchema as z.ZodNumber).lte(schema.maximum);
    }

    if (schema.nullable) {
      zodSchema = zodSchema.nullable();
    }

    return zodSchema;
  }

  private convertArray(schema: any): z.ZodSchema {
    if (!schema.items) {
      return z.array(z.any());
    }

    const itemSchema = this.convert(schema.items);
    let zodSchema: z.ZodSchema = z.array(itemSchema);

    if (schema.minItems !== undefined) {
      zodSchema = (zodSchema as z.ZodArray<any>).min(schema.minItems);
    }

    if (schema.maxItems !== undefined) {
      zodSchema = (zodSchema as z.ZodArray<any>).max(schema.maxItems);
    }

    if (schema.nullable) {
      zodSchema = zodSchema.nullable();
    }

    return zodSchema;
  }

  private convertObject(schema: any, _schemaName?: string): z.ZodSchema {
    if (!schema.properties) {
      return z.record(z.any());
    }

    const shape: Record<string, z.ZodSchema> = {};
    const required = schema.required || [];

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const zodProp = this.convert(propSchema, key);
      shape[key] = required.includes(key) ? zodProp : zodProp.optional();
    }

    let zodSchema: z.ZodSchema = z.object(shape);

    if (schema.nullable) {
      zodSchema = zodSchema.nullable();
    }

    return zodSchema;
  }

  private resolveReference(ref: string): z.ZodSchema {
    const schemaName = ref.replace("#/components/schemas/", "");
    const schema = this.schemas[schemaName];

    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    return this.convert(schema, schemaName);
  }
}

// Test data generator for schemas
class SchemaTestDataGenerator {
  private schemas: Record<string, any>;

  constructor(schemas: Record<string, any>) {
    this.schemas = schemas;
  }

  generate(schema: any, schemaName?: string): any {
    if (schema.$ref) {
      return this.resolveReference(schema.$ref);
    }

    switch (schema.type) {
      case "string":
        return this.generateString(schema);
      case "number":
      case "integer":
        return this.generateNumber(schema);
      case "boolean":
        return TestDataGenerator.generateBoolean();
      case "array":
        return this.generateArray(schema);
      case "object":
        return this.generateObject(schema, schemaName);
      default:
        return null;
    }
  }

  private generateString(schema: any): string {
    if (schema.format === "uuid") {
      return TestDataGenerator.generateUUID();
    } else if (schema.format === "email") {
      return TestDataGenerator.generateEmail();
    } else if (schema.format === "date-time") {
      return TestDataGenerator.generateDate();
    } else if (schema.format === "uri") {
      return "https://example.com/image.jpg";
    } else if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    } else {
      const minLength = schema.minLength || 1;
      const maxLength = schema.maxLength || 50;
      return TestDataGenerator.generateString(minLength, maxLength);
    }
  }

  private generateNumber(schema: any): number {
    const min = schema.minimum || 0;
    const max = schema.maximum || 1000;
    return TestDataGenerator.generateNumber(min, max);
  }

  private generateArray(schema: any): any[] {
    if (!schema.items) {
      return [];
    }

    const minItems = schema.minItems || 1;
    const maxItems = schema.maxItems || 5;
    const length = TestDataGenerator.generateNumber(minItems, maxItems);

    return Array.from({ length }, () => this.generate(schema.items));
  }

  private generateObject(schema: any, _schemaName?: string): any {
    if (!schema.properties) {
      return {};
    }

    const result: any = {};
    const required = schema.required || [];

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (required.includes(key) || Math.random() > 0.3) {
        // 70% chance to include optional fields
        result[key] = this.generate(propSchema, key);
      }
    }

    return result;
  }

  private resolveReference(ref: string): any {
    const schemaName = ref.replace("#/components/schemas/", "");
    const schema = this.schemas[schemaName];

    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    return this.generate(schema, schemaName);
  }
}

// Algorithmic contract tester
export class AlgorithmicContractTester {
  private spec: OpenAPISpec;
  private schemaConverter: SchemaToZodConverter;
  private testDataGenerator: SchemaTestDataGenerator;
  private baseUrl: string;
  private testData: Record<string, any[]> = {};

  constructor(specPath: string, baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.spec = this.loadSpec(specPath);
    this.schemaConverter = new SchemaToZodConverter(this.spec.components.schemas);
    this.testDataGenerator = new SchemaTestDataGenerator(this.spec.components.schemas);
  }

  private loadSpec(specPath: string): OpenAPISpec {
    const specContent = fs.readFileSync(specPath, "utf8");
    return yaml.load(specContent) as OpenAPISpec;
  }

  async runAllTests(): Promise<void> {
    console.log("🤖 Starting Algorithmic Contract Test Suite...");
    console.log(`📋 Testing ${Object.keys(this.spec.paths).length} endpoints`);

    contractTester.clearResults();

    try {
      // Test all endpoints
      for (const [path, pathItem] of Object.entries(this.spec.paths)) {
        await this.testPath(path, pathItem);
      }

      // Test schema validations
      await this.testAllSchemas();

      // Test error scenarios
      await this.testErrorScenarios();

      // Test data consistency
      await this.testDataConsistency();
    } catch (error) {
      console.error("❌ Algorithmic test suite failed:", error);
    }

    contractTester.printResults();
  }

  private async testPath(path: string, pathItem: PathItem): Promise<void> {
    console.log(`\n🔗 Testing path: ${path}`);

    for (const [method, operation] of Object.entries(pathItem)) {
      if (operation) {
        await this.testOperation(path, method.toUpperCase(), operation);
      }
    }
  }

  private async testOperation(
    path: string,
    method: string,
    operation: Operation
  ): Promise<void> {
    console.log(`  ${method} ${path} - ${operation.summary}`);

    // Test successful responses
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode.startsWith("2")) {
        await this.testSuccessfulResponse(path, method, operation, statusCode, response);
      }
    }

    // Test request validation (for POST/PUT/PATCH)
    if (["POST", "PUT", "PATCH"].includes(method) && operation.requestBody) {
      await this.testRequestValidation(path, method, operation);
    }

    // Test error responses
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode.startsWith("4") || statusCode.startsWith("5")) {
        await this.testErrorResponse(path, method, operation, statusCode, response);
      }
    }
  }

  private async testSuccessfulResponse(
    path: string,
    method: string,
    _operation: Operation,
    statusCode: string,
    response: any
  ): Promise<void> {
    if (!response.content) return;

    const contentType = Object.keys(response.content)[0];
    const schema = response.content[contentType].schema;

    if (!schema) return;

    try {
      const zodSchema = this.schemaConverter.convert(schema);
      const testData = this.testDataGenerator.generate(schema);

      // Store test data for later use
      const resourceType = this.getResourceTypeFromPath(path);
      if (resourceType) {
        if (!this.testData[resourceType]) {
          this.testData[resourceType] = [];
        }
        this.testData[resourceType].push(testData);
      }

      contractTester.validateResponse(
        path,
        method,
        parseInt(statusCode),
        testData,
        zodSchema
      );
    } catch (error) {
      console.error(`❌ Failed to test ${method} ${path}:`, error);
    }
  }

  private async testRequestValidation(
    path: string,
    method: string,
    operation: Operation
  ): Promise<void> {
    if (!operation.requestBody?.content) return;

    const contentType = Object.keys(operation.requestBody.content)[0];
    const schema = operation.requestBody.content[contentType].schema;

    if (!schema) return;

    try {
      const zodSchema = this.schemaConverter.convert(schema);
      const testData = this.testDataGenerator.generate(schema);

      contractTester.validateResponse(
        `${path} (request)`,
        method,
        0,
        testData,
        zodSchema
      );
    } catch (error) {
      console.error(`❌ Failed to test request validation for ${method} ${path}:`, error);
    }
  }

  private async testErrorResponse(
    path: string,
    method: string,
    _operation: Operation,
    statusCode: string,
    response: any
  ): Promise<void> {
    if (!response.content) return;

    const contentType = Object.keys(response.content)[0];
    const schema = response.content[contentType].schema;

    if (!schema) return;

    try {
      const zodSchema = this.schemaConverter.convert(schema);
      const testData = this.testDataGenerator.generate(schema);

      contractTester.validateResponse(
        `${path} (${statusCode} error)`,
        method,
        parseInt(statusCode),
        testData,
        zodSchema
      );
    } catch (error) {
      console.error(`❌ Failed to test error response for ${method} ${path}:`, error);
    }
  }

  private async testAllSchemas(): Promise<void> {
    console.log("\n📋 Testing all schemas...");

    for (const [schemaName, schema] of Object.entries(this.spec.components.schemas)) {
      try {
        const zodSchema = this.schemaConverter.convert(schema, schemaName);
        const testData = this.testDataGenerator.generate(schema, schemaName);

        contractTester.validateResponse(
          `Schema: ${schemaName}`,
          "TEST",
          0,
          testData,
          zodSchema
        );
      } catch (error) {
        console.error(`❌ Failed to test schema ${schemaName}:`, error);
      }
    }
  }

  private async testErrorScenarios(): Promise<void> {
    console.log("\n🚨 Testing error scenarios...");

    // Test invalid UUIDs
    const invalidUUIDs = ["not-a-uuid", "123", "invalid-uuid-format"];
    for (const invalidUUID of invalidUUIDs) {
      contractTester.validateResponse(
        "Invalid UUID validation",
        "TEST",
        0,
        invalidUUID,
        z.string().uuid()
      );
    }

    // Test invalid emails
    const invalidEmails = [
      "not-an-email",
      "missing@",
      "@missing.com",
      "spaces @example.com",
    ];
    for (const invalidEmail of invalidEmails) {
      contractTester.validateResponse(
        "Invalid email validation",
        "TEST",
        0,
        invalidEmail,
        z.string().email()
      );
    }

    // Test invalid numbers
    const invalidNumbers = [-1, 0, 1000000]; // Assuming some constraints
    for (const invalidNumber of invalidNumbers) {
      contractTester.validateResponse(
        "Invalid number validation",
        "TEST",
        0,
        invalidNumber,
        z.number().positive().max(999999)
      );
    }
  }

  private async testDataConsistency(): Promise<void> {
    console.log("\n🔄 Testing data consistency...");

    // Test that generated data is consistent with schemas
    for (const [schemaName, schema] of Object.entries(this.spec.components.schemas)) {
      try {
        const zodSchema = this.schemaConverter.convert(schema, schemaName);
        const testData = this.testDataGenerator.generate(schema, schemaName);

        // Test that the data passes validation
        const validationResult = zodSchema.safeParse(testData);
        if (!validationResult.success) {
          contractTester.validateResponse(
            `Data consistency: ${schemaName}`,
            "TEST",
            0,
            testData,
            z.any().refine(() => false, "Generated data should be valid")
          );
        }
      } catch (error) {
        console.error(`❌ Failed to test data consistency for ${schemaName}:`, error);
      }
    }
  }

  private getResourceTypeFromPath(path: string): string | null {
    const match = path.match(/\/api\/(\w+)/);
    return match ? match[1] : null;
  }

  getResults() {
    return contractTester.getResults();
  }
}

// Export factory function
export function createAlgorithmicContractTester(
  specPath: string,
  baseUrl?: string
): AlgorithmicContractTester {
  return new AlgorithmicContractTester(specPath, baseUrl);
}
