import type { Request, Response } from "express";
import { syncAntaresData } from "../../server/services/antares";

export default async function handler(req: Request, res: Response) {
  // SECURITY: Hanya terima POST request
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      message: "Only POST requests are accepted",
    });
  }

  // SECURITY: Validasi authorization token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET) {
    console.error("❌ Unauthorized cron attempt:", {
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing authorization token",
    });
  }

  // Execute sync
  try {
    console.log("🔄 Starting Antares sync...", {
      timestamp: new Date().toISOString(),
      triggeredBy: "cron",
    });

    const result = await syncAntaresData();

    console.log("✅ Antares sync completed successfully:", {
      timestamp: new Date().toISOString(),
      result,
    });

    return res.status(200).json({
      success: true,
      message: "Antares data synced successfully",
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error) {
    console.error("❌ Antares sync failed:", {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      error: "Sync failed",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
