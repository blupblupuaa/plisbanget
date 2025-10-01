import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db";
import { sensorReadings } from "../server/schema";
import { and, gte, lte, desc } from "drizzle-orm";

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
        .orderBy(desc(sensorReadings.timestamp));
    } else {
      readings = await db
        .select()
        .from(sensorReadings)
        .orderBy(desc(sensorReadings.timestamp))
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
      return res.status(200).send(csvHeaders + csvData);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sensor-data.json"
      );
      return res.status(200).json(readings);
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      error: "Failed to export data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
