import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../server/db";
import { sensorReadings } from "../../server/schema";
import { desc } from "drizzle-orm";

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
    const [latest] = await db
      .select()
      .from(sensorReadings)
      .orderBy(desc(sensorReadings.timestamp))
      .limit(1);

    return res.status(200).json(latest || null);
  } catch (error) {
    console.error("Error fetching latest reading:", error);
    return res.status(500).json({
      error: "Failed to fetch latest sensor reading",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
