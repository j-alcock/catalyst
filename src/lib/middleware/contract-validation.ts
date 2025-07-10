import { NextRequest, NextResponse } from "next/server";
import { enhancedContractValidation } from "../testing/enhanced-contract-validation";

export interface ContractValidationOptions {
  validateRequests?: boolean;
  validateResponses?: boolean;
  throwOnViolation?: boolean;
  logViolations?: boolean;
}

/**
 * Contract validation middleware for Next.js API routes
 */
export const contractValidationMiddleware = (options: ContractValidationOptions = {}) => {
  const {
    validateRequests = true,
    validateResponses = true,
    throwOnViolation = false,
    logViolations = true,
  } = options;

  return async (request: NextRequest, next: () => Promise<NextResponse>) => {
    const endpoint = request.nextUrl.pathname;
    const method = request.method.toUpperCase();

    // Initialize contract validation if not already done
    try {
      await enhancedContractValidation.initialize();
    } catch (error) {
      console.warn("Failed to initialize contract validation:", error);
      return next();
    }

    // Validate request body
    if (validateRequests && method !== "GET" && request.body) {
      try {
        const body = await request.json();
        const validation = enhancedContractValidation.validateRequest(
          endpoint,
          method,
          body
        );

        if (!validation.success) {
          if (logViolations) {
            console.error("Request contract violation:", {
              endpoint,
              method,
              errors: validation.errors,
            });
          }

          if (throwOnViolation) {
            return NextResponse.json(
              {
                error: "Contract violation",
                message: "Request does not match API contract",
                details: validation.errors?.errors || [],
              },
              { status: 400 }
            );
          }
        }
      } catch (error) {
        if (logViolations) {
          console.warn("Request validation error:", error);
        }
      }
    }

    // Continue to handler
    const response = await next();

    // Validate response
    if (validateResponses && response.ok) {
      try {
        const responseData = await response.json();
        const validation = enhancedContractValidation.validateResponse(
          endpoint,
          method,
          responseData
        );

        if (!validation.success) {
          if (logViolations) {
            console.error("Response contract violation:", {
              endpoint,
              method,
              errors: validation.errors,
            });
          }

          if (throwOnViolation) {
            return NextResponse.json(
              {
                error: "Contract violation",
                message: "Response does not match API contract",
                details: validation.errors?.errors || [],
              },
              { status: 500 }
            );
          }
        }
      } catch (error) {
        if (logViolations) {
          console.warn("Response validation error:", error);
        }
      }
    }

    return response;
  };
};

/**
 * Higher-order function to wrap API handlers with contract validation
 */
export const withContractValidation = <T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: ContractValidationOptions = {}
) => {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const middleware = contractValidationMiddleware(options);

    return middleware(request, () => handler(...args));
  };
};

/**
 * Contract validation decorator for API routes
 */
export const validateContract = (_options: ContractValidationOptions = {}) => {
  return function <T extends { new (...args: any[]): {} }>(baseConstructor: T) {
    return class extends baseConstructor {
      constructor(...args: any[]) {
        super(...args);

        // Initialize contract validation
        enhancedContractValidation.initialize().catch(console.error);
      }
    };
  };
};

/**
 * Get contract validation statistics for monitoring
 */
export const getContractValidationStats = () => {
  return enhancedContractValidation.getViolationStats();
};

/**
 * Get contract violations for debugging
 */
export const getContractViolations = () => {
  return enhancedContractValidation.getViolations();
};

/**
 * Clear contract violations
 */
export const clearContractViolations = () => {
  enhancedContractValidation.clearViolations();
};
