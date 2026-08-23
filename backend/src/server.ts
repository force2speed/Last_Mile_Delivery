// =============================================================================
// src/server.ts — Express application entry point
// =============================================================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import router from "./routes/index";

const app  = express();
const PORT = process.env.PORT ?? 4000;

// -- Middleware ----------------------------------------------------------------
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -- Health check --------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// -- API Routes ----------------------------------------------------------------
app.use("/api", router);

// -- 404 handler ---------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// -- Global error handler ------------------------------------------------------
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Unhandled Error]", err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error." });
});

// -- Start ---------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`?  LastMile API running on http://localhost:${PORT}`);
  console.log(`??  Health check: http://localhost:${PORT}/health`);
  const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_EXTERNAL_URL) {
    setInterval(() => {
      fetch(RENDER_EXTERNAL_URL + '/health').catch(() => {});
    }, 14 * 60 * 1000);
  }
});


export default app;

