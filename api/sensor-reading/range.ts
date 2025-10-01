import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../server/db";
import { sensorReadings } from "../../server/schema";
import { and, gte, lte, asc } from "drizzle-orm";

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
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        error: "startTime and endTime are required",
      });
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
      .orderBy(asc(sensorReadings.timestamp));

    return res.status(200).json(readings);
  } catch (error) {
    console.error("Error fetching readings by range:", error);
    return res.status(500).json({
      error: "Failed to fetch sensor readings",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
