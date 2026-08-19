import "./env";

import cors from "cors";
import express from "express";

import { ensureSchema } from "./db";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import assistantRoutes from "./routes/assistant";
import dayEntriesRoutes from "./routes/dayEntries";
import employeePortalRoutes from "./routes/employeePortal";
import employeesRoutes from "./routes/employees";
import stockRoutes from "./routes/stock";
import syncRoutes from "./routes/sync";
import venueRoutes from "./routes/venue";
import ownerRoutes from "./routes/owner";
import { bootstrapPlatformAdmin } from "./middleware/auth";
import { ensureDevTestOwner } from "./services/customersService";

ensureSchema();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "boniface-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/employee", employeePortalRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/day-entries", dayEntriesRoutes);
app.use("/api/venue", venueRoutes);
app.use("/api", stockRoutes);
app.use("/api", syncRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

void bootstrapPlatformAdmin()
  .then(() => ensureDevTestOwner())
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Boniface API listening on http://0.0.0.0:${PORT}`);
      console.log(`Health: http://0.0.0.0:${PORT}/api/health`);
    });
  });
