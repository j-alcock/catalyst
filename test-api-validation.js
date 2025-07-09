const fetch = require("node-fetch");

async function testAPIValidation() {
  const baseUrl = "http://localhost:3000";

  // Test 1: Valid data with extra fields
  console.log("Test 1: Valid data with extra fields");
  const validDataWithExtra = {
    name: "Test Product",
    description: "Test description",
    price: 99.99,
    stockQuantity: 10,
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
    extraField1: "should not be allowed",
    extraField2: 123,
  };

  try {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validDataWithExtra),
    });

    const responseText = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${responseText}`);
    console.log(`Expected: 400 for extra fields`);
    console.log(`Result: ${response.status === 400 ? "✅ PASS" : "❌ FAIL"}\n`);
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 2: Invalid data types
  console.log("Test 2: Invalid data types");
  const invalidTypes = {
    name: 123, // Should be string
    description: "Test description",
    price: "not_a_number", // Should be number
    stockQuantity: 10,
    categoryId: "550e8400-e29b-41d4-a716-446655440000",
  };

  try {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidTypes),
    });

    const responseText = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${responseText}`);
    console.log(`Expected: 400 for invalid types`);
    console.log(`Result: ${response.status === 400 ? "✅ PASS" : "❌ FAIL"}\n`);
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 3: Missing required fields
  console.log("Test 3: Missing required fields");
  const missingFields = {
    name: "Test Product",
    // Missing price, stockQuantity, categoryId
    description: "Test description",
  };

  try {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(missingFields),
    });

    const responseText = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${responseText}`);
    console.log(`Expected: 400 for missing fields`);
    console.log(`Result: ${response.status === 400 ? "✅ PASS" : "❌ FAIL"}\n`);
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }
}

testAPIValidation().catch(console.error);
