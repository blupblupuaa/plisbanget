import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../server/db";
import { sensorReadings, systemStatus } from "../../server/schema";
import { antaresService } from "../../server/services/antares";
import { eq } from "drizzle-orm";

/**
 * Cron job endpoint for automatic Antares data synchronization
 * Can be triggered by:
 * 1. Vercel Cron (hobby plan limit: 2 crons)
 * 2. GitHub Actions (recommended for unlimited crons)
 * 3. External cron services (Cron-Job.org, etc)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ========================================
  // SECURITY: Verify authorization
  // ========================================
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      message: "Only POST requests are accepted",
    });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  // Strict security check in production
  if (process.env.NODE_ENV === "production") {
    if (!token || token !== process.env.CRON_SECRET) {
      console.error("❌ [SECURITY] Unauthorized cron attempt:", {
        ip:
          req.headers["x-forwarded-for"] ||
          req.headers["x-real-ip"] ||
          "unknown",
        timestamp: new Date().toISOString(),
        hasToken: !!token,
      });

      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid or missing authorization token",
      });
    }
  } else {
    // Development mode: warn but allow
    if (!token || token !== process.env.CRON_SECRET) {
      console.warn(
        "⚠️ [DEV] Cron called without valid token (allowed in development)"
      );
    }
  }

  // ========================================
  // SYNC PROCESS
  // ========================================
  const startTime = Date.now();
  console.log("🔄 [CRON] Starting automatic sync from Antares...", {
    timestamp: new Date().toISOString(),
    triggeredBy: req.headers["user-agent"]?.includes("GitHub-Hookshot")
      ? "GitHub Actions"
      : req.headers["user-agent"]?.includes("vercel")
      ? "Vercel Cron"
      : "External",
  });

  try {
    // ========================================
    // STEP 1: Fetch data from Antares IoT
    // ========================================
    const antaresData = await antaresService.fetchLatestData();

    if (!antaresData) {
      console.error("❌ [CRON] No data received from Antares API");

      // Update system status to error
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
        message: "Antares API returned no data",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("✅ [CRON] Antares data received:", {
      temperature: antaresData.temperature,
      ph: antaresData.ph,
      tdsLevel: antaresData.tdsLevel,
    });

    // ========================================
    // STEP 2: Validate sensor data ranges
    // ========================================
    const isValidData =
      antaresData.temperature > -50 &&
      antaresData.temperature < 100 &&
      antaresData.ph >= 0 &&
      antaresData.ph <= 14 &&
      antaresData.tdsLevel >= 0 &&
      antaresData.tdsLevel < 5000;

    if (!isValidData) {
      console.warn(
        "⚠️ [CRON] Data validation warning - values out of normal range:",
        antaresData
      );
      // Continue anyway but log warning
    }

    // ========================================
    // STEP 3: Insert sensor reading to database
    // ========================================
    const [reading] = await db
      .insert(sensorReadings)
      .values({
        temperature: antaresData.temperature,
        ph: antaresData.ph,
        tdsLevel: antaresData.tdsLevel,
        timestamp: new Date().toISOString(),
      })
      .returning();

    console.log("💾 [CRON] Data saved to database:", {
      id: reading.id,
      timestamp: reading.timestamp,
    });

    // ========================================
    // STEP 4: Update system status
    // ========================================
    const [countResult] = await db
      .select({ count: db.$count(sensorReadings) })
      .from(sensorReadings);

    await db
      .update(systemStatus)
      .set({
        connectionStatus: "connected",
        lastUpdate: new Date().toISOString(),
        dataPoints: Number(countResult?.count || 0),
      })
      .where(eq(systemStatus.id, "system-1"));

    const duration = Date.now() - startTime;
    console.log(`✅ [CRON] Auto-sync completed successfully in ${duration}ms`);

    // ========================================
    // RESPONSE
    // ========================================
    return res.status(200).json({
      success: true,
      message: "Automatic sync completed successfully",
      duration: `${duration}ms`,
      reading: {
        id: reading.id,
        temperature: reading.temperature,
        ph: reading.ph,
        tdsLevel: reading.tdsLevel,
        timestamp: reading.timestamp,
      },
      systemStatus: {
        connectionStatus: "connected",
        totalDataPoints: Number(countResult?.count || 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================
    const duration = Date.now() - startTime;
    console.error("❌ [CRON] Error during auto-sync:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    // Try to update system status even if sync failed
    try {
      await db
        .update(systemStatus)
        .set({
          connectionStatus: "error",
          lastUpdate: new Date().toISOString(),
        })
        .where(eq(systemStatus.id, "system-1"));
    } catch (statusError) {
      console.error(
        "❌ [CRON] Failed to update system status after error:",
        statusError
      );
    }

    return res.status(500).json({
      success: false,
      error: "Failed to auto-sync with Antares API",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  }
}
