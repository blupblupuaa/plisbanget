import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../server/db";
import { alertSettings } from "../server/schema";
import { eq } from "drizzle-orm";
import { insertAlertSettingsSchema } from "@shared/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // GET - Fetch alert settings
    if (req.method === "GET") {
      let [settings] = await db
        .select()
        .from(alertSettings)
        .where(eq(alertSettings.id, "settings-1"))
        .limit(1);

      // Create default settings if not exists
      if (!settings) {
        [settings] = await db
          .insert(alertSettings)
          .values({
            id: "settings-1",
            temperatureAlerts: true,
            phAlerts: true,
            tdsLevelAlerts: false,
          })
          .returning();
      }

      return res.status(200).json(settings);
    }

    // PUT - Update alert settings
    if (req.method === "PUT") {
      const validatedSettings = insertAlertSettingsSchema.parse(req.body);

      const [updated] = await db
        .update(alertSettings)
        .set(validatedSettings)
        .where(eq(alertSettings.id, "settings-1"))
        .returning();

      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error with alert settings:", error);
    return res.status(500).json({
      error: "Failed to process alert settings",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
