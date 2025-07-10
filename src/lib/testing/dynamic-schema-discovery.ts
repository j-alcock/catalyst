import { readFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";
import { z } from "zod";
import {
  zCategory,
  zOrder,
  zOrderItem,
  zOrderStatus,
  zProduct,
  zUser,
} from "../heyapi/zod.gen";

// Schema mapping for endpoints
export interface EndpointSchemaMap {
  [endpoint: string]: {
    request?: {
      GET?: z.ZodSchema<any>;
      POST?: z.ZodSchema<any>;
      PUT?: z.ZodSchema<any>;
      DELETE?: z.ZodSchema<any>;
      PATCH?: z.ZodSchema<any>;
    };
    response?: {
      GET?: z.ZodSchema<any>;
      POST?: z.ZodSchema<any>;
      PUT?: z.ZodSchema<any>;
      DELETE?: z.ZodSchema<any>;
      PATCH?: z.ZodSchema<any>;
    };
  };
}

export interface OpenAPISpec {
  paths: {
    [path: string]: {
      [method: string]: {
        requestBody?: {
          content?: {
            [contentType: string]: {
              schema?: any;
            };
          };
        };
        responses?: {
          [statusCode: string]: {
            content?: {
              [contentType: string]: {
                schema?: any;
              };
            };
          };
        };
      };
    };
  };
  components?: {
    schemas?: {
      [schemaName: string]: any;
    };
  };
}

export class DynamicSchemaDiscovery {
  private openApiSpec!: OpenAPISpec;
  private heyApiSchemas!: Record<string, z.ZodSchema>;
  private schemaMappings: Record<string, string> = {};

  constructor() {
    this.loadOpenAPISpec();
    this.initializeHeyAPISchemas();
    this.initializeSchemaMappings();
  }

  private loadOpenAPISpec(): void {
    try {
      const specPath = join(process.cwd(), "src/lib/openapi/api-spec.yaml");
      const specContent = readFileSync(specPath, "utf8");
      this.openApiSpec = yaml.load(specContent) as OpenAPISpec;
    } catch (_error) {
      console.warn("Could not load OpenAPI spec, using fallback mappings");
      this.openApiSpec = { paths: {} };
    }
  }

  private initializeHeyAPISchemas(): void {
    this.heyApiSchemas = {
      User: zUser,
      Product: zProduct,
      Category: zCategory,
      Order: zOrder,
      OrderItem: zOrderItem,
      OrderStatus: zOrderStatus,
    };
  }

  private initializeSchemaMappings(): void {
    // Map OpenAPI schema names to HeyAPI schema names
    this.schemaMappings = {
      User: "User",
      Product: "Product",
      Category: "Category",
      Order: "Order",
      OrderItem: "OrderItem",
      OrderStatus: "OrderStatus",
    };
  }

  /**
   * Discover and generate endpoint schema mappings automatically
   */
  async discoverSchemas(): Promise<EndpointSchemaMap> {
    const endpointSchemas: EndpointSchemaMap = {};

    // Process each path in the OpenAPI spec
    for (const [path, pathItem] of Object.entries(this.openApiSpec.paths)) {
      endpointSchemas[path] = {
        request: {} as any,
        response: {} as any,
      };

      // Process each HTTP method
      for (const [method, operation] of Object.entries(pathItem)) {
        const upperMethod =
          method.toUpperCase() as keyof EndpointSchemaMap[string]["request"];

        // Handle request schemas
        if (operation.requestBody?.content?.["application/json"]?.schema) {
          const requestSchema = this.mapOpenAPISchemaToZod(
            operation.requestBody.content["application/json"].schema
          );
          if (requestSchema) {
            (endpointSchemas[path].request as any)[upperMethod] = requestSchema;
          }
        }

        // Handle response schemas
        if (operation.responses?.["200"]?.content?.["application/json"]?.schema) {
          const responseSchema = this.mapOpenAPISchemaToZod(
            operation.responses["200"].content["application/json"].schema
          );
          if (responseSchema) {
            (endpointSchemas[path].response as any)[upperMethod] = responseSchema;
          }
        } else if (operation.responses?.["201"]?.content?.["application/json"]?.schema) {
          const responseSchema = this.mapOpenAPISchemaToZod(
            operation.responses["201"].content["application/json"].schema
          );
          if (responseSchema) {
            (endpointSchemas[path].response as any)[upperMethod] = responseSchema;
          }
        }
      }
    }

    // Add fallback mappings for endpoints not in OpenAPI spec
    this.addFallbackMappings(endpointSchemas);

    return endpointSchemas;
  }

  /**
   * Map OpenAPI schema to Zod schema
   */
  private mapOpenAPISchemaToZod(schema: any): z.ZodSchema<any> | undefined {
    if (!schema) return undefined;

    // Handle $ref references
    if (schema.$ref) {
      const schemaName = this.extractSchemaNameFromRef(schema.$ref);
      return this.heyApiSchemas[schemaName];
    }

    // Handle array schemas
    if (schema.type === "array" && schema.items) {
      const itemSchema = this.mapOpenAPISchemaToZod(schema.items);
      return itemSchema ? z.array(itemSchema) : undefined;
    }

    // Handle object schemas
    if (schema.type === "object" && schema.properties) {
      const shape: Record<string, z.ZodSchema<any>> = {};

      for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
        const zodSchema = this.mapOpenAPISchemaToZod(propertySchema);
        if (zodSchema) {
          const isRequired = schema.required?.includes(propertyName);
          shape[propertyName] = isRequired ? zodSchema : zodSchema.optional();
        }
      }

      return z.object(shape);
    }

    // Handle primitive types
    switch (schema.type) {
      case "string":
        if (schema.format === "uuid") return z.string().uuid();
        if (schema.format === "email") return z.string().email();
        if (schema.format === "date-time") return z.string().datetime();
        return z.string();
      case "number":
        return z.number();
      case "integer":
        return z.number().int();
      case "boolean":
        return z.boolean();
      default:
        return undefined;
    }
  }

  /**
   * Extract schema name from $ref
   */
  private extractSchemaNameFromRef(ref: string): string {
    const parts = ref.split("/");
    return parts[parts.length - 1];
  }

  /**
   * Add fallback mappings for endpoints not in OpenAPI spec
   */
  private addFallbackMappings(endpointSchemas: EndpointSchemaMap): void {
    // Products
    if (!endpointSchemas["/api/products"]) {
      endpointSchemas["/api/products"] = {
        request: {
          GET: undefined,
          POST: z
            .object({
              name: z.string().min(1),
              description: z.string().optional(),
              price: z.number().positive(),
              stockQuantity: z.number().int().min(0),
              categoryId: z.string().uuid(),
            })
            .strict(),
        },
        response: {
          GET: z.array(this.heyApiSchemas.Product),
          POST: this.heyApiSchemas.Product,
        },
      };
    }

    if (!endpointSchemas["/api/products/{id}"]) {
      endpointSchemas["/api/products/{id}"] = {
        request: {
          GET: undefined,
          PUT: z
            .object({
              name: z.string().min(1),
              description: z.string().optional(),
              price: z.number().positive(),
              stockQuantity: z.number().int().min(0),
              categoryId: z.string().uuid(),
            })
            .strict(),
          DELETE: undefined,
        },
        response: {
          GET: this.heyApiSchemas.Product,
          PUT: this.heyApiSchemas.Product,
          DELETE: z.object({ message: z.string() }),
        },
      };
    }

    // Categories
    if (!endpointSchemas["/api/categories"]) {
      endpointSchemas["/api/categories"] = {
        request: {
          GET: undefined,
          POST: z
            .object({
              name: z.string().min(1),
              description: z.string().optional(),
            })
            .strict(),
        },
        response: {
          GET: z.array(this.heyApiSchemas.Category),
          POST: this.heyApiSchemas.Category,
        },
      };
    }

    if (!endpointSchemas["/api/categories/{id}"]) {
      endpointSchemas["/api/categories/{id}"] = {
        request: {
          GET: undefined,
        },
        response: {
          GET: this.heyApiSchemas.Category,
        },
      };
    }

    // Users
    if (!endpointSchemas["/api/users"]) {
      endpointSchemas["/api/users"] = {
        request: {
          POST: z
            .object({
              name: z.string().min(1),
              email: z.string().email(),
              password: z.string().optional(),
              picture: z.string().url(),
            })
            .strict(),
        },
        response: {
          POST: this.heyApiSchemas.User,
        },
      };
    }

    if (!endpointSchemas["/api/users/{id}"]) {
      endpointSchemas["/api/users/{id}"] = {
        request: {
          GET: undefined,
        },
        response: {
          GET: this.heyApiSchemas.User,
        },
      };
    }

    // Orders
    if (!endpointSchemas["/api/orders"]) {
      endpointSchemas["/api/orders"] = {
        request: {
          GET: undefined,
          POST: z
            .object({
              userId: z.string().uuid(),
              status: this.heyApiSchemas.OrderStatus,
              totalAmount: z.number().positive(),
            })
            .strict(),
        },
        response: {
          GET: z.array(this.heyApiSchemas.Order),
          POST: this.heyApiSchemas.Order,
        },
      };
    }

    if (!endpointSchemas["/api/orders/{id}"]) {
      endpointSchemas["/api/orders/{id}"] = {
        request: {
          GET: undefined,
        },
        response: {
          GET: this.heyApiSchemas.Order,
        },
      };
    }

    if (!endpointSchemas["/api/orders/{id}/status"]) {
      endpointSchemas["/api/orders/{id}/status"] = {
        request: {
          PUT: z.object({ status: this.heyApiSchemas.OrderStatus }).strict(),
        },
        response: {
          PUT: this.heyApiSchemas.Order,
        },
      };
    }
  }

  /**
   * Get schema for a specific endpoint and method
   */
  getSchema(
    schemas: EndpointSchemaMap[string],
    method: string,
    type: "request" | "response"
  ): z.ZodSchema<any> | undefined {
    if (!schemas) return undefined;

    const methodSchemas = schemas[type as keyof typeof schemas];
    if (!methodSchemas || typeof methodSchemas !== "object") return undefined;

    return methodSchemas[method as keyof typeof methodSchemas];
  }

  /**
   * Get all available schemas
   */
  getAvailableSchemas(): Record<string, z.ZodSchema> {
    return this.heyApiSchemas;
  }

  /**
   * Get schema by name
   */
  getSchemaByName(name: string): z.ZodSchema<any> | undefined {
    return this.heyApiSchemas[name];
  }
}
