const { z } = require("zod");

// Copy the exact schema from the file
const CreateProductRequestSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    price: z.number().positive(),
    stockQuantity: z.number().int().min(0),
    categoryId: z.string().uuid(),
  })
  .strict();

console.log("Testing CreateProductRequestSchema with extra fields...");

// Test data with extra fields (same as the curl test)
const testData = {
  name: "Test Product",
  description: "Test description",
  price: 99.99,
  stockQuantity: 10,
  categoryId: "550e8400-e29b-41d4-a716-446655440000",
  extraField1: "should not be allowed",
  extraField2: 123,
};

console.log("Test data:", JSON.stringify(testData, null, 2));

try {
  const result = CreateProductRequestSchema.parse(testData);
  console.log("✅ Validation PASSED (this should not happen with extra fields)");
  console.log("Result:", result);
} catch (error) {
  console.log("❌ Validation FAILED (this is correct)");
  console.log("Error message:", error.message);
  console.log("Error details:", error.errors);
  console.log("Error code:", error.errors[0]?.code);
}
