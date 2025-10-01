import { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "../server/index";

let app: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!app) {
      console.log("Initializing Express app...");
      app = await createServer();
    }

    // Log untuk debugging
    console.log(`${req.method} ${req.url}`);

    // Forward ke Express
    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
