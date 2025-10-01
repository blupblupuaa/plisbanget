import dotenv from "dotenv";
import { db } from "../server/db";
import { sensorReadings, systemStatus, alertSettings } from "../server/schema";

dotenv.config();

async function seedDatabase() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // 1. Seed System Status
    console.log("1️⃣ Seeding system status...");
    await db
      .insert(systemStatus)
      .values({
        id: "system-1",
        connectionStatus: "connected",
        lastUpdate: new Date().toISOString(),
        dataPoints: 0,
        cpuUsage: 23,
        memoryUsage: 30,
        storageUsage: 26,
        uptime: "0d 0h 0m",
      })
      .onConflictDoNothing();
    console.log("   ✅ System status seeded\n");

    // 2. Seed Alert Settings
    console.log("2️⃣ Seeding alert settings...");
    await db
      .insert(alertSettings)
      .values({
        id: "settings-1",
        temperatureAlerts: true,
        phAlerts: true,
        tdsLevelAlerts: false,
      })
      .onConflictDoNothing();
    console.log("   ✅ Alert settings seeded\n");

    // 3. Seed Sample Sensor Readings (last 24 hours)
    console.log("3️⃣ Seeding sample sensor readings...");
    const now = new Date();
    const readings = [];

    // Generate 144 readings (one every 10 minutes for 24 hours)
    for (let i = 144; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 10 * 60 * 1000);
      const hourOfDay = timestamp.getHours();

      // Generate realistic values with daily patterns
      const temperature =
        29 + Math.sin((hourOfDay * Math.PI) / 12) * 2 + (Math.random() - 0.5);
      const ph =
        7.0 +
        Math.sin((hourOfDay * Math.PI) / 12) * 0.15 +
        (Math.random() - 0.5) * 0.2;
      const tdsLevel =
        500 +
        Math.sin((hourOfDay * Math.PI) / 12) * 30 +
        (Math.random() - 0.5) * 40;

      readings.push({
        temperature: parseFloat(temperature.toFixed(1)),
        ph: parseFloat(ph.toFixed(2)),
        tdsLevel: parseFloat(tdsLevel.toFixed(1)),
        timestamp: timestamp.toISOString(),
      });
    }

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      await db.insert(sensorReadings).values(batch);
      console.log(
        `   📊 Inserted ${Math.min(i + batchSize, readings.length)}/${
          readings.length
        } readings`
      );
    }
    console.log("   ✅ Sample sensor readings seeded\n");

    console.log("🎉 Database seeding completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - System Status: 1 record`);
    console.log(`   - Alert Settings: 1 record`);
    console.log(`   - Sensor Readings: ${readings.length} records`);
    console.log(`   - Time Range: Last 24 hours\n`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run seeder
seedDatabase();
