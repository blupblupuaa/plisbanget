export interface AntaresConfig {
  apiKey: string;
  deviceId: string;
  applicationId: string;
  baseUrl?: string;
}

export interface AntaresData {
  temperature: number;
  ph: number;
  tdsLevel: number;
}

export class AntaresService {
  private config: AntaresConfig;

  constructor(config: AntaresConfig) {
    this.config = {
      baseUrl: "https://platform.antares.id:8443/~/antares-cse/antares-id",
      ...config,
    };
  }

  /**
   * ✅ CORRECT: Decode hex data dari ESP32
   *
   * Format: TTTT PPPP SSSS (12 hex chars)
   * - TTTT = Temperature × 10 → divide by 10
   * - PPPP = pH × 10 → divide by 10
   * - SSSS = TDS (raw) → no division
   *
   * Contoh:
   * - Input:  "010B004601F4"
   * - Temp:   0x010B = 267 / 10 = 26.7°C
   * - pH:     0x0046 = 70 / 10 = 7.0
   * - TDS:    0x01F4 = 500 ppm
   */
  private decodeHexData(hexString: string): AntaresData | null {
    try {
      const cleanHex = hexString.replace(/\s+/g, "").toUpperCase();

      // Validate hex length
      if (cleanHex.length < 12) {
        console.error(`❌ Invalid hex length: ${cleanHex.length}, expected 12`);
        return null;
      }

      // Extract hex parts (4 characters each)
      const tempHex = cleanHex.substr(0, 4);
      const phHex = cleanHex.substr(4, 4);
      const tdsHex = cleanHex.substr(8, 4);

      // Convert to decimal
      const tempRaw = parseInt(tempHex, 16);
      const phRaw = parseInt(phHex, 16);
      const tdsRaw = parseInt(tdsHex, 16);

      // Validate conversions
      if (isNaN(tempRaw) || isNaN(phRaw) || isNaN(tdsRaw)) {
        console.error("❌ Failed to parse hex values:", {
          tempHex,
          phHex,
          tdsHex,
        });
        return null;
      }

      // ✅ DECODE: Sesuai dengan ESP32 (multiply by 10)
      const temperature = tempRaw / 10; // Divide by 10
      const ph = phRaw / 10; // Divide by 10
      const tdsLevel = tdsRaw; // No division

      // Log untuk debugging
      console.log("📊 Decoded sensor data:", {
        input: cleanHex,
        raw: {
          tempHex: `0x${tempHex}`,
          tempDec: tempRaw,
          phHex: `0x${phHex}`,
          phDec: phRaw,
          tdsHex: `0x${tdsHex}`,
          tdsDec: tdsRaw,
        },
        decoded: {
          temperature: `${temperature}°C`,
          ph: ph,
          tdsLevel: `${tdsLevel} ppm`,
        },
      });

      // Warning untuk nilai yang mencurigakan (sensor belum kalibrasi)
      if (temperature < 0 || temperature > 60) {
        console.warn(
          `⚠️ Temperature out of normal range: ${temperature}°C (sensor not calibrated?)`
        );
      }
      if (ph < 0 || ph > 14) {
        console.warn(
          `⚠️ pH out of valid range: ${ph} (sensor not calibrated?)`
        );
      }
      if (tdsLevel < 0 || tdsLevel > 5000) {
        console.warn(
          `⚠️ TDS out of normal range: ${tdsLevel} ppm (sensor not calibrated?)`
        );
      }

      return {
        temperature: Math.round(temperature * 10) / 10, // 1 decimal place
        ph: Math.round(ph * 100) / 100, // 2 decimal places
        tdsLevel: Math.round(tdsLevel), // Integer
      };
    } catch (error) {
      console.error("❌ Error decoding hex data:", error);
      return null;
    }
  }

  /**
   * Parse Antares response content
   */
  private parseContent(content: any): AntaresData | null {
    try {
      let parsedContent;

      // Handle string content
      if (typeof content === "string") {
        try {
          // Try to parse as JSON
          parsedContent = JSON.parse(content);
        } catch {
          // Not JSON, treat as raw hex string
          console.log("📥 Content is raw hex string");
          return this.decodeHexData(content);
        }
      } else {
        parsedContent = content;
      }

      // Check for hex data in JSON format: {"data":"010B013907F3"}
      if (parsedContent.data && typeof parsedContent.data === "string") {
        console.log("📥 Found hex data in JSON format");
        return this.decodeHexData(parsedContent.data);
      }

      // Fallback: direct values (untuk backward compatibility)
      if (parsedContent.temperature !== undefined) {
        console.log("📥 Using direct values from JSON");
        return {
          temperature: parseFloat(parsedContent.temperature) || 0,
          ph: parseFloat(parsedContent.ph) || 0,
          tdsLevel:
            parseFloat(parsedContent.tdsLevel || parsedContent.waterLevel) || 0,
        };
      }

      console.error("❌ Unable to parse content structure:", parsedContent);
      return null;
    } catch (error) {
      console.error("❌ Error parsing content:", error);
      return null;
    }
  }

  /**
   * Fetch latest data from Antares
   */
  async fetchLatestData(): Promise<AntaresData | null> {
    try {
      const url = `${this.config.baseUrl}/${this.config.applicationId}/${this.config.deviceId}/la`;

      console.log("📡 Fetching from Antares:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-M2M-Origin": this.config.apiKey,
          "Content-Type": "application/json;ty=4",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `❌ Antares API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();
      console.log("📥 Antares response:", JSON.stringify(data, null, 2));

      // Extract content from Antares response
      const content = data["m2m:cin"]?.con;
      if (!content) {
        console.error("❌ Invalid response format - missing m2m:cin.con");
        return null;
      }

      console.log("📦 Content to parse:", content);

      return this.parseContent(content);
    } catch (error) {
      console.error("❌ Error fetching data from Antares:", error);
      return null;
    }
  }

  /**
   * Fetch historical data (optional)
   */
  async fetchHistoricalData(limit = 100): Promise<AntaresData[]> {
    try {
      const url = `${this.config.baseUrl}/${this.config.applicationId}/${this.config.deviceId}?rcn=4&lim=${limit}`;

      console.log("📡 Fetching historical data from Antares");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-M2M-Origin": this.config.apiKey,
          "Content-Type": "application/json;ty=4",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Antares API error: ${response.status}`);
      }

      const data = await response.json();
      const contentInstances = data["m2m:cnt"]?.["m2m:cin"] || [];

      const historicalData: AntaresData[] = [];

      for (const instance of contentInstances) {
        const content = instance.con;
        const parsedData = this.parseContent(content);

        if (parsedData) {
          historicalData.push(parsedData);
        }
      }

      return historicalData.reverse(); // Chronological order
    } catch (error) {
      console.error("❌ Error fetching historical data:", error);
      return [];
    }
  }

  /**
   * Test decode utility (untuk development/debugging)
   */
  testDecode(hexString: string): AntaresData | null {
    console.log("\n🧪 ===== TEST DECODE =====");
    console.log("Input:", hexString);
    const result = this.decodeHexData(hexString);
    console.log("Output:", result);
    console.log("========================\n");
    return result;
  }
}

// Initialize service with environment variables
export const antaresService = new AntaresService({
  apiKey: process.env.ANTARES_API_KEY || "",
  deviceId: process.env.ANTARES_DEVICE_ID || "Monitoring_Hidroponik",
  applicationId: process.env.ANTARES_APPLICATION_ID || "DRTPM-Hidroponik",
});

// Development tests
if (process.env.NODE_ENV === "development") {
  console.log("\n🧪 Running decoder tests...\n");

  // Test 1: Data real Anda (sensor belum kalibrasi)
  console.log("Test 1: Your actual data");
  antaresService.testDecode("010B013907F3");
  // Expected: temp=26.7°C, pH=31.3 (⚠️ invalid - not calibrated), TDS=2035

  // Test 2: Data yang sudah dikalibrasi dengan benar
  console.log("Test 2: Properly calibrated data");
  antaresService.testDecode("010B004601F4");
  // Expected: temp=26.7°C, pH=7.0, TDS=500

  // Test 3: Edge case - nilai ekstrem
  console.log("Test 3: Extreme values");
  antaresService.testDecode("00000000FFFF");
  // Expected: temp=0°C, pH=0, TDS=65535
}
