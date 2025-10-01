import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../server/db";
import { sensorReadings, systemStatus } from "../../server/schema";
import { antaresService } from "../../server/services/antares";
import { eq } from "drizzle-orm";

// This endpoint will be called by Vercel Cron
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Unauthorized cron request");
    // Allow request anyway for development, but log warning
  }

  try {
    console.log("[CRON] Starting automatic sync from Antares...");

    const antaresData = await antaresService.fetchLatestData();

    if (!antaresData) {
      console.error("[CRON] No data received from Antares");

      await db
        .update(systemStatus)
        .set({
          connectionStatus: "error",
          lastUpdate: new Date().toISOString(),
        })
        .where(eq(systemStatus.id, "system-1"));

      return res.status(503).json({
        success: false,
        error: "Failed to fetch data from Antares API",
      });
    }

    console.log("[CRON] Antares data received:", antaresData);

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

    console.log("[CRON] Auto-sync successful, reading ID:", reading.id);

    return res.status(200).json({
      success: true,
      message: "Automatic sync completed",
      reading: {
        id: reading.id,
        temperature: reading.temperature,
        ph: reading.ph,
        tdsLevel: reading.tdsLevel,
        timestamp: reading.timestamp,
      },
    });
  } catch (error) {
    console.error("[CRON] Error during auto-sync:", error);

    try {
      await db
        .update(systemStatus)
        .set({
          connectionStatus: "error",
          lastUpdate: new Date().toISOString(),
        })
        .where(eq(systemStatus.id, "system-1"));
    } catch (statusError) {
      console.error("[CRON] Failed to update system status:", statusError);
    }

    return res.status(500).json({
      success: false,
      error: "Failed to auto-sync with Antares API",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
