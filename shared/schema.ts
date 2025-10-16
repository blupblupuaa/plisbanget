import { z } from "zod";

// Sensor Reading
export const sensorReadingSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  temperature: z.number(),
  ph: z.number(),
  tdsLevel: z.number(),
  createdAt: z.string().optional(),
});

export type SensorReading = z.infer<typeof sensorReadingSchema>;

// System Status
export const systemStatusSchema = z.object({
  id: z.string(),
  connectionStatus: z.enum(['connected', 'disconnected', 'error']),
  lastUpdate: z.string(),
  dataPoints: z.number(),
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;