/**
 * Test Analytics Endpoints
 * Run: node test-analytics.js
 * 
 * Tests all analytics endpoints with various filter combinations
 */

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

// Helper function to make requests
const testEndpoint = async (method, endpoint, params = null, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
    };

    if (params) {
      config.params = params;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    console.log(`✅ ${method.toUpperCase()} ${endpoint}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (err) {
    console.log(`❌ ${method.toUpperCase()} ${endpoint}`);
    console.log(`   Error: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
    return null;
  }
};

// Main test suite
const runTests = async () => {
  console.log("\n=== ANALYTICS ENDPOINTS TEST SUITE ===\n");

  // Test 1: Best Selling - Period based (day)
  console.log("TEST 1: GET /analytics/best-selling (period=day)");
  await testEndpoint("GET", "/analytics/best-selling", { period: "day", limit: 5 });

  // Test 2: Best Selling - Period based (week)
  console.log("\nTEST 2: GET /analytics/best-selling (period=week)");
  await testEndpoint("GET", "/analytics/best-selling", { period: "week", limit: 5 });

  // Test 3: Best Selling - Month + Year
  console.log("\nTEST 3: GET /analytics/best-selling (month=1, year=2025)");
  await testEndpoint("GET", "/analytics/best-selling", { month: 1, year: 2025, limit: 5 });

  // Test 4: Best Selling - Trimester + Year
  console.log("\nTEST 4: GET /analytics/best-selling (trimester=1, year=2025)");
  await testEndpoint("GET", "/analytics/best-selling", { trimester: 1, year: 2025, limit: 5 });

  // Test 5: Best Selling - Custom Date Range
  console.log("\nTEST 5: GET /analytics/best-selling (custom date range)");
  await testEndpoint("GET", "/analytics/best-selling", {
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    limit: 5,
  });

  // Test 6: Sales Summary - Period based
  console.log("\nTEST 6: GET /analytics/sales-summary (period=month)");
  await testEndpoint("GET", "/analytics/sales-summary", { period: "month" });

  // Test 7: Orders History - Period based with pagination
  console.log("\nTEST 7: GET /analytics/orders-history (period=week, page=1, limit=5)");
  await testEndpoint("GET", "/analytics/orders-history", { period: "week", page: 1, limit: 5 });

  // Test 8: Orders History - Month filter
  console.log("\nTEST 8: GET /analytics/orders-history (month=1, year=2025)");
  await testEndpoint("GET", "/analytics/orders-history", { month: 1, year: 2025, page: 1, limit: 5 });

  // Test 9: Orders Stats
  console.log("\nTEST 9: GET /analytics/orders-stats (period=week)");
  await testEndpoint("GET", "/analytics/orders-stats", { period: "week" });

  // Test 10: Orders Stats - Custom date range
  console.log("\nTEST 10: GET /analytics/orders-stats (custom date range)");
  await testEndpoint("GET", "/analytics/orders-stats", {
    startDate: "2025-01-01",
    endDate: "2025-01-31",
  });

  // Test 11: Order Report
  console.log("\nTEST 11: GET /analytics/order-report (period=month)");
  await testEndpoint("GET", "/analytics/order-report", { period: "month" });

  // Test 12: Invalid Month (should return 400)
  console.log("\nTEST 12: GET /analytics/best-selling (invalid month=13) - Should return 400");
  await testEndpoint("GET", "/analytics/best-selling", { month: 13, year: 2025 });

  // Test 13: Invalid Trimester (should return 400)
  console.log("\nTEST 13: GET /analytics/best-selling (invalid trimester=5) - Should return 400");
  await testEndpoint("GET", "/analytics/best-selling", { trimester: 5, year: 2025 });

  // Test 14: Invalid Date Range (should return 400)
  console.log("\nTEST 14: GET /analytics/best-selling (invalid date range) - Should return 400");
  await testEndpoint("GET", "/analytics/best-selling", {
    startDate: "2025-01-31",
    endDate: "2025-01-01",
  });

  console.log("\n=== TEST SUITE COMPLETED ===\n");
};

// Run tests
runTests().catch(console.error);
