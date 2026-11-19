#!/usr/bin/env node
/**
 * Debug 401 Unauthorized Issues
 * Run this on Render shell or locally to diagnose 401 errors
 */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

console.log("🔍 JWT Debug Tool");
console.log("==================");

if (!process.env.JWT_SECRET) {
  console.log("❌ JWT_SECRET NOT SET IN ENVIRONMENT!");
  console.log("Please set JWT_SECRET in Render Environment Variables");
  process.exit(1);
}

console.log("✅ JWT_SECRET is set (length:", process.env.JWT_SECRET.length, ")");
console.log("JWT_SECRET preview:", process.env.JWT_SECRET.substring(0, 20) + "...");

// Test token generation
const testPayload = { id: "test-user-id", role: "employee" };
const token = jwt.sign({ id: "test-user", role: "employee" }, process.env.JWT_SECRET, { expiresIn: "30d" });

console.log("\n✅ Test token generated:");
console.log(token);

// Test verification
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log("✅ Token verification successful:", decoded);
} catch (err) {
  console.error("❌ Token verification failed:", err.message);
}

// Test expired token
const expiredToken = jwt.sign({ id: "test", role: "employee" }, process.env.JWT_SECRET, { expiresIn: "-1h" });
try {
  jwt.verify(expiredToken, process.env.JWT_SECRET);
} catch (err) {
  console.log("\n✅ Expired token correctly rejected:", err.name);
}

// Test invalid signature
const tamperedToken = token.slice(0, -5) + "xxxxx";
try {
  jwt.verify(tamperedToken, process.env.JWT_SECRET);
} catch (err) {
  console.log("✅ Tampered token correctly rejected:", err.name);
}

// Instructions
console.log(`
\n🔧 TO FIX 401 ERRORS:
1. Ensure JWT_SECRET is set in Render Environment Variables
2. Redeploy backend after setting JWT_SECRET
3. Clear browser localStorage and re-login
4. Check Render logs for: "JsonWebTokenError" or "TokenExpiredError"
`);