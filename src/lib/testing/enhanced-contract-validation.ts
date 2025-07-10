import { z } from "zod";
import { DynamicSchemaDiscovery, EndpointSchemaMap } from "./dynamic-schema-discovery";

export interface ValidationResult {
  success: boolean;
  errors?: z.ZodError;
  data?: any;
}

export interface ContractViolation {
  endpoint: string;
  method: string;
  type: "request" | "response";
  errors: z.ZodError;
  timestamp: Date;
  severity: "error" | "warning";
}

export class SchemaRegistry {
  private endpointSchemas: EndpointSchemaMap = {};
  private schemaDiscovery: DynamicSchemaDiscovery;

  constructor() {
    this.schemaDiscovery = new DynamicSchemaDiscovery();
  }

  /**
   * Initialize the schema registry with discovered schemas
   */
  async initialize(): Promise<void> {
    this.endpointSchemas = await this.schemaDiscovery.discoverSchemas();
  }

  /**
   * Get request schema for an endpoint and method
   */
  getRequestSchema(endpoint: string, method: string): z.ZodSchema<any> | undefined {
    const matchedEndpoint = this.matchEndpoint(endpoint);
    if (!matchedEndpoint) return undefined;

    const endpointSchemas = this.endpointSchemas[matchedEndpoint];
    if (!endpointSchemas?.request) return undefined;

    return endpointSchemas.request[method as keyof typeof endpointSchemas.request];
  }

  /**
   * Get response schema for an endpoint and method
   */
  getResponseSchema(endpoint: string, method: string): z.ZodSchema<any> | undefined {
    const matchedEndpoint = this.matchEndpoint(endpoint);
    if (!matchedEndpoint) return undefined;

    const endpointSchemas = this.endpointSchemas[matchedEndpoint];
    if (!endpointSchemas?.response) return undefined;

    return endpointSchemas.response[method as keyof typeof endpointSchemas.response];
  }

  /**
   * Match endpoint pattern (e.g., "/api/products/{id}" matches "/api/products/123")
   */
  private matchEndpoint(endpoint: string): string | null {
    // Direct match
    if (this.endpointSchemas[endpoint]) {
      return endpoint;
    }

    // Pattern match for parameterized endpoints
    for (const pattern of Object.keys(this.endpointSchemas)) {
      if (pattern.includes("{id}")) {
        const regex = new RegExp(pattern.replace("{id}", "[^/]+"));
        if (regex.test(endpoint)) {
          return pattern;
        }
      }
    }

    return null;
  }

  /**
   * Get all available endpoints
   */
  getEndpoints(): string[] {
    return Object.keys(this.endpointSchemas);
  }

  /**
   * Check if endpoint has schema
   */
  hasSchema(endpoint: string): boolean {
    return this.matchEndpoint(endpoint) !== null;
  }

  /**
   * Get all available schemas
   */
  getAvailableSchemas(): Record<string, z.ZodSchema> {
    return this.schemaDiscovery.getAvailableSchemas();
  }
}

export class EnhancedContractValidation {
  private schemaRegistry: SchemaRegistry;
  private violations: ContractViolation[] = [];
  private isInitialized = false;

  constructor() {
    this.schemaRegistry = new SchemaRegistry();
  }

  /**
   * Initialize the contract validation system
   */
  async initialize(): Promise<void> {
    await this.schemaRegistry.initialize();
    this.isInitialized = true;
  }

  /**
   * Validate request data against endpoint schema
   */
  validateRequest(endpoint: string, method: string, data: any): ValidationResult {
    if (!this.isInitialized) {
      throw new Error("Contract validation not initialized. Call initialize() first.");
    }

    const schema = this.schemaRegistry.getRequestSchema(endpoint, method);
    if (!schema) {
      return { success: true, data };
    }

    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.recordViolation({
          endpoint,
          method,
          type: "request",
          errors: error,
          timestamp: new Date(),
          severity: "error",
        });
        return { success: false, errors: error };
      }
      throw error;
    }
  }

  /**
   * Validate response data against endpoint schema
   */
  validateResponse(endpoint: string, method: string, data: any): ValidationResult {
    if (!this.isInitialized) {
      throw new Error("Contract validation not initialized. Call initialize() first.");
    }

    const schema = this.schemaRegistry.getResponseSchema(endpoint, method);
    if (!schema) {
      return { success: true, data };
    }

    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.recordViolation({
          endpoint,
          method,
          type: "response",
          errors: error,
          timestamp: new Date(),
          severity: "error",
        });
        return { success: false, errors: error };
      }
      throw error;
    }
  }

  /**
   * Record a contract violation
   */
  private recordViolation(violation: ContractViolation): void {
    this.violations.push(violation);

    // Log violation
    this.logViolation(violation);

    // In CI environment, throw error for critical violations
    if (process.env.CI === "true" && violation.severity === "error") {
      throw new Error(
        `[${violation.type.toUpperCase()} CONTRACT VIOLATION] ${violation.method} ${violation.endpoint}: ${violation.errors.message}`
      );
    }
  }

  /**
   * Log contract violation
   */
  private logViolation(violation: ContractViolation): void {
    const errorMessage = `[${violation.type.toUpperCase()} CONTRACT VIOLATION] ${violation.method} ${violation.endpoint}: ${violation.errors.message}`;

    if (violation.severity === "error") {
      console.error(errorMessage);
      console.error("Validation details:", violation.errors.errors);
    } else {
      console.warn(errorMessage);
      console.warn("Validation details:", violation.errors.errors);
    }
  }

  /**
   * Get all recorded violations
   */
  getViolations(): ContractViolation[] {
    return [...this.violations];
  }

  /**
   * Clear recorded violations
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Get violations for a specific endpoint
   */
  getViolationsForEndpoint(endpoint: string): ContractViolation[] {
    return this.violations.filter((v) => v.endpoint === endpoint);
  }

  /**
   * Get violations for a specific time range
   */
  getViolationsInTimeRange(start: Date, end: Date): ContractViolation[] {
    return this.violations.filter((v) => v.timestamp >= start && v.timestamp <= end);
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): {
    total: number;
    request: number;
    response: number;
    errors: number;
    warnings: number;
  } {
    return {
      total: this.violations.length,
      request: this.violations.filter((v) => v.type === "request").length,
      response: this.violations.filter((v) => v.type === "response").length,
      errors: this.violations.filter((v) => v.severity === "error").length,
      warnings: this.violations.filter((v) => v.severity === "warning").length,
    };
  }

  /**
   * Get available endpoints
   */
  getEndpoints(): string[] {
    return this.schemaRegistry.getEndpoints();
  }

  /**
   * Check if endpoint has schema
   */
  hasSchema(endpoint: string): boolean {
    return this.schemaRegistry.hasSchema(endpoint);
  }

  /**
   * Get schema by name
   */
  getSchemaByName(name: string): z.ZodSchema<any> | undefined {
    const schemas = this.schemaRegistry.getAvailableSchemas();
    return schemas[name];
  }

  /**
   * Validate schema by name
   */
  validateSchemaByName(name: string, data: any): ValidationResult {
    const schema = this.getSchemaByName(name);
    if (!schema) {
      return { success: false, errors: new z.ZodError([]) };
    }

    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error };
      }
      throw error;
    }
  }
}

// Global instance for easy access
export const enhancedContractValidation = new EnhancedContractValidation();
