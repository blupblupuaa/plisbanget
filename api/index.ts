import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pgTable, text, timestamp, real, uuid } from "drizzle-orm/pg-core";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// ============================================
// DATABASE SETUP
// ============================================
neonConfig.fetchConnectionCache = true;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 10 
});

const db = drizzle({ client: pool });

// ============================================
// SCHEMA (inline untuk simplicity)
// ============================================
const sensorReadings = pgTable("sensor_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: text("timestamp").notNull(),
  temperature: real("temperature").notNull(),
  ph: real("ph").notNull(),
  tdsLevel: real("tds_level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const systemStatus = pgTable("system_status", {
  id: text("id").primaryKey(),
  connectionStatus: text("connection_status").notNull(),
  lastUpdate: text("last_update").notNull(),
  dataPoints: real("data_points").notNull().default(0),
});

// ============================================
// ANTARES SERVICE (simplified)
// ============================================
async function fetchAntaresData() {
  const { ANTARES_API_KEY, ANTARES_APPLICATION_ID, ANTARES_DEVICE_ID } = process.env;
  
  if (!ANTARES_API_KEY) return null;

  try {
    const url = `https://platform.antares.id:8443/~/antares-cse/antares-id/${ANTARES_APPLICATION_ID}/${ANTARES_DEVICE_ID}/la`;
    
    const response = await fetch(url, {
      headers: {
        "X-M2M-Origin": ANTARES_API_KEY,
        "Content-Type": "application/json;ty=4",
        "Accept": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const hexData = data["m2m:cin"]?.con;

    if (!hexData || typeof hexData !== 'string') return null;

    // Decode hex: TTTT PPPP SSSS
    const temp = parseInt(hexData.substr(0, 4), 16) / 10;
    const ph = parseInt(hexData.substr(4, 4), 16) / 10;
    const tds = parseInt(hexData.substr(8, 4), 16);

    return { 
      temperature: Math.round(temp * 10) / 10,
      ph: Math.round(ph * 100) / 100,
      tdsLevel: Math.round(tds)
    };
  } catch (error) {
    console.error("Antares fetch error:", error);
    return null;
  }
}

// ============================================
// CORS HELPER
// ============================================
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

// ============================================
// MAIN HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const path = req.url?.replace("/api", "") || "/";
  const method = req.method;

  try {
    // ========== SENSOR READINGS ==========
    
    // GET /sensor-readings
    if (path === "/sensor-readings" && method === "GET") {
      const limit = parseInt(req.query.limit as string) || 50;
      const readings = await db
        .select()
        .from(sensorReadings)
        .orderBy(desc(sensorReadings.createdAt))
        .limit(limit);
      return res.json(readings);
    }

    // GET /sensor-readings/latest
    if (path === "/sensor-readings/latest" && method === "GET") {
      const [reading] = await db
        .select()
        .from(sensorReadings)
        .orderBy(desc(sensorReadings.createdAt))
        .limit(1);
      return res.json(reading || null);
    }

    // GET /sensor-readings/range
    if (path === "/sensor-readings/range" && method === "GET") {
      const { startTime, endTime } = req.query;
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "startTime & endTime required" });
      }

      const readings = await db
        .select()
        .from(sensorReadings)
        .where(and(
          gte(sensorReadings.timestamp, startTime as string),
          lte(sensorReadings.timestamp, endTime as string)
        ))
        .orderBy(sensorReadings.timestamp);
      
      return res.json(readings);
    }

    // POST /sensor-readings (manual insert)
    if (path === "/sensor-readings" && method === "POST") {
      const { temperature, ph, tdsLevel } = req.body;
      
      const [reading] = await db
        .insert(sensorReadings)
        .values({
          timestamp: new Date().toISOString(),
          temperature,
          ph,
          tdsLevel,
        })
        .returning();
      
      return res.status(201).json(reading);
    }

    // ========== SYNC ANTARES ==========
    
    // POST /sync-antares
    if (path === "/sync-antares" && method === "POST") {
      const antaresData = await fetchAntaresData();

      if (!antaresData) {
        await db
          .update(systemStatus)
          .set({ connectionStatus: "error" })
          .where(eq(systemStatus.id, "system-1"));
        
        return res.status(503).json({ error: "Antares API failed" });
      }

      const [reading] = await db
        .insert(sensorReadings)
        .values({
          timestamp: new Date().toISOString(),
          ...antaresData,
        })
        .returning();

      await db
        .update(systemStatus)
        .set({
          connectionStatus: "connected",
          lastUpdate: new Date().toISOString(),
        })
        .where(eq(systemStatus.id, "system-1"));

      return res.json({ success: true, reading });
    }

    // ========== SYSTEM STATUS ==========
    
    // GET /system-status
    if (path === "/system-status" && method === "GET") {
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
          })
          .returning();
      }

      return res.json(status);
    }

    // ========== EXPORT DATA ==========
    
    // GET /export-data
    if (path.startsWith("/export-data") && method === "GET") {
      const { format = "json", startTime, endTime } = req.query;

      let readings;
      if (startTime && endTime) {
        readings = await db
          .select()
          .from(sensorReadings)
          .where(and(
            gte(sensorReadings.timestamp, startTime as string),
            lte(sensorReadings.timestamp, endTime as string)
          ))
          .orderBy(sensorReadings.timestamp);
      } else {
        readings = await db
          .select()
          .from(sensorReadings)
          .orderBy(desc(sensorReadings.createdAt))
          .limit(1000);
      }

      if (format === "csv") {
        const csv = "timestamp,temperature,ph,tdsLevel\n" +
          readings.map(r => `${r.timestamp},${r.temperature},${r.ph},${r.tdsLevel}`).join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=data.csv");
        return res.send(csv);
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=data.json");
      return res.json(readings);
    }

    // ========== CRON JOB ==========
    
    // POST /cron/sync-antares (internal only)
    if (path === "/cron/sync-antares" && method === "POST") {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");

      if (token !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const antaresData = await fetchAntaresData();

      if (!antaresData) {
        return res.status(503).json({ error: "Antares sync failed" });
      }

      const [reading] = await db
        .insert(sensorReadings)
        .values({
          timestamp: new Date().toISOString(),
          ...antaresData,
        })
        .returning();

      await db
        .update(systemStatus)
        .set({
          connectionStatus: "connected",
          lastUpdate: new Date().toISOString(),
        })
        .where(eq(systemStatus.id, "system-1"));

      return res.json({ 
        success: true, 
        message: "Auto-sync completed",
        reading 
      });
    }

    // ========== 404 ==========
    return res.status(404).json({ error: "Not found", path });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}