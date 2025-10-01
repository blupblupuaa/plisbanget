import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db";
import { systemStatus } from "../_lib/schema";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let [status] = await db
      .select()
      .from(systemStatus)
      .where(eq(systemStatus.id, "system-1"))
      .limit(1);

    // Create default status if not exists
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
  } catch (error) {
    console.error("Error fetching system status:", error);
    return res.status(500).json({
      error: "Failed to fetch system status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
