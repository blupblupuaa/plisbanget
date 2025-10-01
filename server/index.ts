import express, { type Express } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

export async function createServer(): Promise<Express> {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register API routes
  await registerRoutes(app);

  return app;
}

// Only run this in development/local
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await createServer();

  const server = app.listen(5000, "0.0.0.0", () => {
    log(`Server running at http://localhost:5000`);
  });

  // Setup Vite in development
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
}
