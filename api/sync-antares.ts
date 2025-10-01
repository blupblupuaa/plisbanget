import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../server/db";
import { sensorReadings, systemStatus } from "../server/schema";
import { antaresService } from "../server/services/antares";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Syncing data from Antares...");

    const antaresData = await antaresService.fetchLatestData();

    if (!antaresData) {
      console.error("No data received from Antares");

      // Update system status to error
      await db
        .update(systemStatus)
        .set({
          connectionStatus: "error",
          lastUpdate: new Date().toISOString(),
        })
        .where(eq(systemStatus.id, "system-1"));

      return res.status(503).json({
        error: "Failed to fetch data from Antares API",
      });
    }

    console.log("Antares data received:", antaresData);

    // Insert sensor reading
    const [reading] = await db
      .insert(sensorReadings)
      .values({
        temperature: antaresData.temperature,
        ph: antaresData.ph,
        tdsLevel: antaresData.tdsLevel,
        timestamp: new Date().toISOString(),
      })
      .returning();

    // Get total data points
    const [countResult] = await db
      .select({ count: db.$count(sensorReadings) })
      .from(sensorReadings);

    // Update system status
    await db
      .update(systemStatus)
      .set({
        connectionStatus: "connected",
        lastUpdate: new Date().toISOString(),
        dataPoints: Number(countResult?.count || 0),
      })
      .where(eq(systemStatus.id, "system-1"));

    console.log("Sync successful, reading created:", reading.id);

    return res.status(200).json({
      success: true,
      reading,
    });
  } catch (error) {
    console.error("Error syncing with Antares:", error);

    try {
      await db
        .update(systemStatus)
        .set({
          connectionStatus: "error",
          lastUpdate: new Date().toISOString(),
        })
        .where(eq(systemStatus.id, "system-1"));
    } catch (statusError) {
      console.error("Failed to update system status:", statusError);
    }

    return res.status(500).json({
      error: "Failed to sync with Antares API",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
