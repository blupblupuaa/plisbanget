import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Configure Neon to use WebSocket
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to add it to environment variables?"
  );
}

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon-specific optimizations
  connectionTimeoutMillis: 5000,
  max: 10, // Maximum number of clients in the pool
});

// Create Drizzle instance
export const db = drizzle({
  client: pool,
  schema,
  logger: process.env.NODE_ENV === "development", // Log queries in development
});

// Test connection (optional, for debugging)
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}
