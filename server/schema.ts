import {
  pgTable,
  text,
  real,
  timestamp,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";

export const sensorReadings = pgTable("sensor_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp", { mode: "string" }).notNull().defaultNow(),
  temperature: real("temperature").notNull(),
  ph: real("ph").notNull(),
  tdsLevel: real("tds_level").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const systemStatus = pgTable("system_status", {
  id: text("id").primaryKey(),
  connectionStatus: text("connection_status", {
    enum: ["connected", "disconnected", "error"],
  }).notNull(),
  lastUpdate: timestamp("last_update", { mode: "string" }).notNull(),
  dataPoints: integer("data_points").notNull().default(0),
  cpuUsage: integer("cpu_usage").notNull().default(0),
  memoryUsage: integer("memory_usage").notNull().default(0),
  storageUsage: integer("storage_usage").notNull().default(0),
  uptime: text("uptime").notNull().default("0d 0h 0m"),
});

export const alertSettings = pgTable("alert_settings", {
  id: text("id").primaryKey(),
  temperatureAlerts: boolean("temperature_alerts").notNull().default(true),
  phAlerts: boolean("ph_alerts").notNull().default(true),
  tdsLevelAlerts: boolean("tds_level_alerts").notNull().default(false),
});
