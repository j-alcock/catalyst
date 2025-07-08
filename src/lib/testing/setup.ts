// Jest setup file
import { config } from "dotenv";

// Load environment variables for testing
config({ path: ".env" });

// Set test timeout
// biome-ignore lint/correctness/noUndeclaredVariables: jest is a global in Jest test environment
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
