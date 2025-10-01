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
import { z } from "zod";

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
  temperature: real("temperature").notNull(),
  ph: real("ph").notNull(),
  tdsLevel: real("tds_level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const alertSettings = pgTable("alert_settings", {
  id: text("id").primaryKey(),
  phMin: real("ph_min").notNull(),
  phMax: real("ph_max").notNull(),
  tdsMin: real("tds_min").notNull(),
  tdsMax: real("tds_max").notNull(),
  temperatureMin: real("temperature_min").notNull(),
  temperatureMax: real("temperature_max").notNull(),
  emailNotifications: integer("email_notifications").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Validation schemas
const insertSensorReadingSchema = z.object({
  temperature: z.number(),
  ph: z.number(),
  tdsLevel: z.number(),
});

const insertAlertSettingsSchema = z.object({
  phMin: z.number(),
  phMax: z.number(),
  tdsMin: z.number(),
  tdsMax: z.number(),
  temperatureMin: z.number(),
  temperatureMax: z.number(),
  emailNotifications: z.number().default(0),
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
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// FIXED: Antares service functions with correct decoding
async function fetchAntaresData() {
  // ✅ FIX: Menggunakan nama variabel yang benar sesuai .env
  const accessKey = process.env.ANTARES_API_KEY;
  const applicationName = process.env.ANTARES_APPLICATION_ID;
  const deviceName = process.env.ANTARES_DEVICE_ID;

  console.log("=== ANTARES FETCH DEBUG ===");
  console.log(
    "API Key:",
    accessKey ? `${accessKey.substring(0, 10)}...` : "NOT SET"
  );
  console.log("Application:", applicationName);
  console.log("Device:", deviceName);

  if (!accessKey || !applicationName || !deviceName) {
    console.error("❌ Missing Antares configuration");
    console.error("Please check your Vercel environment variables:");
    console.error("- ANTARES_API_KEY");
    console.error("- ANTARES_APPLICATION_ID");
    console.error("- ANTARES_DEVICE_ID");
    return null;
  }

  try {
    const url = `https://platform.antares.id:8443/~/antares-cse/antares-id/${applicationName}/${deviceName}/la`;
    console.log("Fetching from:", url);

    const response = await fetch(url, {
      headers: {
        "X-M2M-Origin": accessKey,
        "Content-Type": "application/json;ty=4",
        Accept: "application/json",
      },
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Antares API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("Raw response:", JSON.stringify(data, null, 2));

    const content = data["m2m:cin"]?.con;
    if (!content) {
      console.error("❌ No content in response");
      return null;
    }

    console.log("Content received:", content);

    // ✅ FIX: Proper hex decoding based on your format
    let parsedData;

    // Try to parse as JSON first
    if (
      typeof content === "string" &&
      (content.startsWith("{") || content.startsWith("["))
    ) {
      try {
        parsedData = JSON.parse(content);
        console.log("Parsed as JSON:", parsedData);

        return {
          temperature: parseFloat(
            parsedData.temperature || parsedData.temp || 0
          ),
          ph: parseFloat(parsedData.pH || parsedData.ph || 0),
          tdsLevel: parseFloat(
            parsedData.tds || parsedData.TDS || parsedData.tdsLevel || 0
          ),
        };
      } catch (e) {
        console.log("Not valid JSON, trying hex decode...");
      }
    }

    // If not JSON, try hex decoding
    if (typeof content === "string" && /^[0-9A-Fa-f]+$/.test(content.trim())) {
      const hexData = content.trim().toUpperCase();
      console.log("Decoding hex data:", hexData);

      if (hexData.length >= 12) {
        // ✅ FIX: Proper hex decoding for your format
        // Format: TTTT PPPP SSSS (Temperature, pH, TDS)
        const tempHex = hexData.substr(0, 4);
        const phHex = hexData.substr(4, 4);
        const tdsHex = hexData.substr(8, 4);

        const tempRaw = parseInt(tempHex, 16);
        const phRaw = parseInt(phHex, 16);
        const tdsRaw = parseInt(tdsHex, 16);

        console.log("Hex parsing:", { tempHex, phHex, tdsHex });
        console.log("Raw decimal:", { tempRaw, phRaw, tdsRaw });

        // Convert based on your encoding scheme
        // Temperature: divide by 10 (e.g., 0x0118 = 280 -> 28.0°C)
        // pH: divide by 100 (e.g., 0x02BC = 700 -> 7.00)
        // TDS: keep as is or divide by 10 depending on your encoding

        const temperature = tempRaw / 10;
        const ph = phRaw / 100;
        const tdsLevel = tdsRaw; // or tdsRaw / 10 if needed

        console.log("Decoded values:", { temperature, ph, tdsLevel });

        // Validate ranges
        if (
          temperature >= -50 &&
          temperature <= 100 &&
          ph >= 0 &&
          ph <= 14 &&
          tdsLevel >= 0 &&
          tdsLevel <= 5000
        ) {
          return { temperature, ph, tdsLevel };
        } else {
          console.warn(
            "⚠️ Decoded values out of range, trying alternative decoding"
          );

          // Try alternative: all values divided by 100
          const altTemp = tempRaw / 100;
          const altPh = phRaw / 100;
          const altTds = tdsRaw / 100;

          console.log("Alternative decoding:", { altTemp, altPh, altTds });

          if (
            altTemp >= -50 &&
            altTemp <= 100 &&
            altPh >= 0 &&
            altPh <= 14 &&
            altTds >= 0 &&
            altTds <= 2000
          ) {
            return {
              temperature: altTemp,
              ph: altPh,
              tdsLevel: altTds,
            };
          }
        }
      }
    }

    // If object format (non-hex)
    if (typeof content === "object") {
      return {
        temperature: parseFloat(content.temperature || content.temp || 0),
        ph: parseFloat(content.pH || content.ph || 0),
        tdsLevel: parseFloat(
          content.tds || content.TDS || content.tdsLevel || 0
        ),
      };
    }

    console.error("❌ Could not parse content in any known format");
    return null;
  } catch (error) {
    console.error("❌ Error fetching Antares data:", error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const path = req.url?.replace("/api", "") || "/";

  try {
    // GET /api/system-status
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

    // GET /api/sensor-readings (with limit)
    if (
      path.startsWith("/sensor-readings") &&
      req.method === "GET" &&
      !path.includes("latest") &&
      !path.includes("range")
    ) {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const readings = await db
        .select()
        .from(sensorReadings)
        .orderBy(desc(sensorReadings.id))
        .limit(limit);

      return res.status(200).json(readings);
    }

    // GET /api/sensor-readings/latest
    if (path === "/sensor-readings/latest" && req.method === "GET") {
      const [reading] = await db
        .select()
        .from(sensorReadings)
        .orderBy(desc(sensorReadings.id))
        .limit(1);

      return res.status(200).json(reading || null);
    }

    // GET /api/sensor-readings/range
    if (path === "/sensor-readings/range" && req.method === "GET") {
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res
          .status(400)
          .json({ error: "startTime and endTime are required" });
      }

      const readings = await db
        .select()
        .from(sensorReadings)
        .where(
          and(
            gte(sensorReadings.timestamp, startTime as string),
            lte(sensorReadings.timestamp, endTime as string)
          )
        )
        .orderBy(sensorReadings.timestamp);

      return res.status(200).json(readings);
    }

    // POST /api/sensor-readings
    if (path === "/sensor-readings" && req.method === "POST") {
      const validatedData = insertSensorReadingSchema.parse(req.body);

      const [reading] = await db
        .insert(sensorReadings)
        .values({
          timestamp: new Date().toISOString(),
          temperature: validatedData.temperature,
          ph: validatedData.ph,
          tdsLevel: validatedData.tdsLevel,
        })
        .returning();

      return res.status(201).json(reading);
    }

    // POST /api/sync-antares
    if (path === "/sync-antares" && req.method === "POST") {
      console.log("=== SYNC ANTARES REQUEST ===");

      const antaresData = await fetchAntaresData();

      if (!antaresData) {
        await db
          .update(systemStatus)
          .set({
            connectionStatus: "error",
            lastUpdate: new Date().toISOString(),
          })
          .where(eq(systemStatus.id, "system-1"));

        return res.status(503).json({
          error: "Failed to fetch data from Antares API",
          details: "Check Vercel logs for detailed error messages",
        });
      }

      console.log("✅ Data fetched successfully:", antaresData);

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

      console.log("✅ Data saved to database:", reading);

      return res.status(200).json({ success: true, reading });
    }

    // GET /api/alert-settings
    if (path === "/alert-settings" && req.method === "GET") {
      const settings = await db.select().from(alertSettings);
      return res.status(200).json(settings);
    }

    // PUT /api/alert-settings
    if (path === "/alert-settings" && req.method === "PUT") {
      const validatedSettings = insertAlertSettingsSchema.parse(req.body);

      const [settings] = await db
        .insert(alertSettings)
        .values({
          id: "default",
          ...validatedSettings,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: alertSettings.id,
          set: {
            ...validatedSettings,
            updatedAt: new Date(),
          },
        })
        .returning();

      return res.status(200).json(settings);
    }

    // GET /api/export-data
    if (path.startsWith("/export-data") && req.method === "GET") {
      const { format = "json", startTime, endTime } = req.query;

      let readings;
      if (startTime && endTime) {
        readings = await db
          .select()
          .from(sensorReadings)
          .where(
            and(
              gte(sensorReadings.timestamp, startTime as string),
              lte(sensorReadings.timestamp, endTime as string)
            )
          )
          .orderBy(sensorReadings.timestamp);
      } else {
        readings = await db
          .select()
          .from(sensorReadings)
          .orderBy(desc(sensorReadings.id))
          .limit(1000);
      }

      if (format === "csv") {
        const csvHeaders = "timestamp,temperature,ph,tdsLevel\n";
        const csvData = readings
          .map((r) => `${r.timestamp},${r.temperature},${r.ph},${r.tdsLevel}`)
          .join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=sensor-data.csv"
        );
        return res.send(csvHeaders + csvData);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=sensor-data.json"
        );
        return res.status(200).json(readings);
      }
    }

    // 404 for unknown routes
    return res.status(404).json({ error: "Not found", path });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
