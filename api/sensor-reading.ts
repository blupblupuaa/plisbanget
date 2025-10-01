import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../server/db";
import { sensorReadings } from "../server/schema";
import { desc, sql } from "drizzle-orm";
import { insertSensorReadingSchema } from "@shared/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // GET - Fetch sensor readings
    if (req.method === "GET") {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const readings = await db
        .select()
        .from(sensorReadings)
        .orderBy(desc(sensorReadings.timestamp))
        .limit(limit);

      return res.status(200).json(readings);
    }

    // POST - Create new sensor reading
    if (req.method === "POST") {
      const validatedData = insertSensorReadingSchema.parse(req.body);

      const [reading] = await db
        .insert(sensorReadings)
        .values({
          ...validatedData,
          timestamp: new Date().toISOString(),
        })
        .returning();

      return res.status(201).json(reading);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in sensor-readings:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
