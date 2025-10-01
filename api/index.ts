import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  serial,
} from "drizzle-orm/pg-core";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// Configure Neon for serverless
neonConfig.fetchConnectionCache = true;

// Define schemas inline
const systemStatus = pgTable("system_status", {
  id: text("id").primaryKey(),
  connectionStatus: text("connection_status").notNull(),
  lastUpdate: text("last_update").notNull(),
  dataPoints: integer("data_points").notNull().default(0),
  cpuUsage: real("cpu_usage").notNull().default(0),
  memoryUsage: real("memory_usage").notNull().default(0),
  storageUsage: real("storage_usage").notNull().default(0),
  uptime: text("uptime").notNull().default("0d 0h 0m"),
});

const sensorReadings = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  ph: real("ph").notNull(),
  tds: real("tds").notNull(),
  temperature: real("temperature").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create DB connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 10,
});

const db = drizzle({ client: pool });

// CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const path = req.url?.replace("/api", "") || "/";

  try {
    // Route: GET /api/system-status
    if (path === "/system-status" && req.method === "GET") {
      let [status] = await db
        .select()
        .from(systemStatus)
        .where(eq(systemStatus.id, "system-1"))
        .limit(1);

      if (!status) {
        [status] = await db
          .insert(systemStatus)
          .values({
            id: "system-1",
            connectionStatus: "disconnected",
            lastUpdate: new Date().toISOString(),
            dataPoints: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            storageUsage: 0,
            uptime: "0d 0h 0m",
          })
          .returning();
      }

      return res.status(200).json(status);
    }

    // Route: GET /api/sensor-reading/latest
    if (path === "/sensor-reading/latest" && req.method === "GET") {
      const [reading] = await db
        .select()
        .from(sensorReadings)
        .orderBy(desc(sensorReadings.id))
        .limit(1);

      return res.status(200).json(reading || null);
    }

    // Route: GET /api/sensor-reading/range
    if (path.startsWith("/sensor-reading/range") && req.method === "GET") {
      const { start, end } = req.query;

      if (!start || !end) {
        return res
          .status(400)
          .json({ error: "start and end parameters required" });
      }

      const readings = await db
        .select()
        .from(sensorReadings)
        .where(
          and(
            gte(sensorReadings.timestamp, start as string),
            lte(sensorReadings.timestamp, end as string)
          )
        )
        .orderBy(sensorReadings.timestamp);

      return res.status(200).json(readings);
    }

    // 404 for unknown routes
    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
