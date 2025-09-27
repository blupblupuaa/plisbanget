// Seed untuk konsistensi random dalam satu hari
const getDailySeed = () => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

// Simple seeded random generator
class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next() {
    return this.seed = this.seed * 16807 % 2147483647;
  }

  nextFloat() {
    return (this.next() - 1) / 2147483646;
  }
}

// Sensor data generator with time-based updates
export class SensorDataGenerator {
  constructor() {
    const seed = getDailySeed();
    this.rng = new SeededRandom(seed);
    this.lastTDS = 500;
    this.lastPH = 7.0;
    this.tdsOutlierCount = 0;
    this.maxOutliersPerDay = 5;
    this.dataPointsPerDay = 144;
    this.lastUpdateTime = null; // Track last update time
  }

  // Generate TDS with time-aware updates
  generateTDS(timestamp) {
    const currentTime = new Date(timestamp);

    // Reset daily counters at midnight
    if (this.lastUpdateTime) {
      const lastDay = new Date(this.lastUpdateTime).getDate();
      const currentDay = currentTime.getDate();
      if (lastDay !== currentDay) {
        this.resetDailyCounters();
      }
    }

    this.lastUpdateTime = currentTime;

    const hourOfDay = currentTime.getHours();
    const outlierProbability = this.maxOutliersPerDay / this.dataPointsPerDay;
    const shouldBeOutlier = this.rng.nextFloat() < outlierProbability && this.tdsOutlierCount < this.maxOutliersPerDay;

    let newValue;

    if (shouldBeOutlier) {
      const isHigh = this.rng.nextFloat() > 0.5;
      if (isHigh) {
        newValue = 650 + this.rng.nextFloat() * 150; // 650-800
      } else {
        newValue = 200 + this.rng.nextFloat() * 150; // 200-350
      }
      this.tdsOutlierCount++;
    } else {
      const baseValue = 500;
      const dailyVariation = Math.sin(hourOfDay * Math.PI / 12) * 30;
      const randomVariation = (this.rng.nextFloat() - 0.5) * 40;

      newValue = baseValue + dailyVariation + randomVariation;
      newValue = Math.max(420, Math.min(580, newValue));
    }

    // Smooth transition
    const maxChange = 15;
    const change = newValue - this.lastTDS;
    if (Math.abs(change) > maxChange) {
      newValue = this.lastTDS + (change > 0 ? maxChange : -maxChange);
    }

    this.lastTDS = newValue;
    return Math.round(newValue * 100) / 100;
  }

  // Generate pH with time-aware updates  
  generatePH(timestamp) {
    const currentTime = new Date(timestamp);
    const hourOfDay = currentTime.getHours();

    const baseValue = 7.0;
    const dailyVariation = Math.sin(hourOfDay * Math.PI / 12) * 0.15;
    const randomVariation = (this.rng.nextFloat() - 0.5) * 0.2;

    let newValue = baseValue + dailyVariation + randomVariation;
    newValue = Math.max(6.7, Math.min(7.3, newValue));

    // Smooth transition
    const maxChange = 0.05;
    const change = newValue - this.lastPH;
    if (Math.abs(change) > maxChange) {
      newValue = this.lastPH + (change > 0 ? maxChange : -maxChange);
    }

    this.lastPH = newValue;
    return Math.round(newValue * 100) / 100;
  }

  generateTemperature(timestamp) {
    const hourOfDay = new Date(timestamp).getHours();
    const baseTemp = 30;
    const dailyVariation = Math.sin((hourOfDay - 6) * Math.PI / 12) * 2;
    const randomVariation = (this.rng.nextFloat() - 0.5) * 1.5;

    return Math.round((baseTemp + dailyVariation + randomVariation) * 10) / 10;
  }

  resetDailyCounters() {
    this.tdsOutlierCount = 0;
  }
}

// Import statements (add these at the top of your file)
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sprout, Clock } from "lucide-react";
import StatusCard from "@/components/status-card";
import TemperatureChart from "@/components/temperature-chart";
import PHChart from "@/components/ph-chart";
import TDSChart from "@/components/tds-chart";
import RecentReadings from "@/components/recent-readings";
import SystemInfo from "@/components/system-info";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { syncAntaresData } from "@/lib/api";
import type { SensorReading, SystemStatus } from "@shared/schema";

// Real-time clock component with NTP sync (CORS-friendly)
function RealTimeClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNTPSynced, setIsNTPSynced] = useState(false);
  const [ntpOffset, setNTPOffset] = useState(0);

  // Try multiple NTP sources with CORS support
  const ntpSources = [
    'http://worldtimeapi.org/api/timezone/Asia/Jakarta',
    'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta',
    'https://worldclockapi.com/api/json/utc/now'
  ];

  // Fetch NTP time with fallback sources
  const syncWithNTP = async () => {
    // Try each source until one works
    for (const source of ntpSources) {
      try {
        const response = await fetch(source, {
          method: 'GET',
          mode: 'cors', // Enable CORS
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        let serverTime;

        // Handle different API response formats
        if (data.datetime) {
          // WorldTimeAPI format
          serverTime = new Date(data.datetime);
        } else if (data.dateTime) {
          // TimeAPI format
          serverTime = new Date(data.dateTime);
        } else if (data.currentDateTime) {
          // WorldClockAPI format
          serverTime = new Date(data.currentDateTime);
        } else {
          throw new Error('Unknown API response format');
        }

        const localTime = new Date();
        const offset = serverTime.getTime() - localTime.getTime();

        setNTPOffset(offset);
        setIsNTPSynced(true);

        console.log(`NTP sync successful with ${source}. Offset: ${offset}ms`);
        return; // Success, exit loop

      } catch (error) {
        console.warn(`NTP sync failed with ${source}:`, error.message);
        continue; // Try next source
      }
    }

    // All sources failed, use browser time estimation
    console.warn('All NTP sources failed. Using browser time with Jakarta timezone adjustment.');

    // Estimate Jakarta time if all APIs fail
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const utcTime = new Date(now.toLocaleString("en-US", {timeZone: "UTC"}));
    const estimatedOffset = jakartaTime.getTime() - now.getTime();

    setNTPOffset(estimatedOffset);
    setIsNTPSynced(false); // Mark as not truly synced
  };

  // Get current NTP-adjusted time
  const getNTPTime = () => {
    const localTime = new Date();
    return new Date(localTime.getTime() + ntpOffset);
  };

  useEffect(() => {
    // Initial NTP sync
    syncWithNTP();

    // Re-sync every 10 minutes (less frequent to avoid rate limits)
    const ntpSyncInterval = setInterval(syncWithNTP, 10 * 60 * 1000);

    // Update display every second
    const displayUpdateInterval = setInterval(() => {
      setCurrentTime(getNTPTime());
    }, 1000);

    return () => {
      clearInterval(ntpSyncInterval);
      clearInterval(displayUpdateInterval);
    };
  }, []);

  // Update display when offset changes
  useEffect(() => {
    const displayUpdateInterval = setInterval(() => {
      setCurrentTime(getNTPTime());
    }, 1000);

    return () => clearInterval(displayUpdateInterval);
  }, [ntpOffset]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex items-center space-x-3 text-slate-600">
      <div className="flex items-center space-x-1">
        <Clock className="h-4 w-4" />
        <div className={`w-2 h-2 rounded-full ${
          isNTPSynced ? 'bg-green-500' : 'bg-blue-500'
        }`} 
        title={isNTPSynced ? 'Synced with NTP server' : 'Using timezone-adjusted local time'}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
        <span className="text-sm font-medium">
          {formatDate(currentTime)}
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-lg font-mono font-semibold text-slate-800">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-slate-500">
            {isNTPSynced ? 'NTP' : 'WIB'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Modified Dashboard component dengan simulasi data
export default function Dashboard() {
  const { toast } = useToast();
  const [dataGenerator] = useState(() => new SensorDataGenerator());

  const { data: sensorReadings = [], isLoading: readingsLoading } = useQuery<
    SensorReading[]
  >({
    queryKey: ["/api/sensor-readings"],
    refetchInterval: 10000,
    // Simulate data if needed
    placeholderData: [],
  });

  const { data: latestReading } = useQuery<SensorReading | null>({
    queryKey: ["/api/sensor-readings/latest"],
    refetchInterval: 10000,
    // Generate pH and TDS in sync with API temperature data
    select: (data) => {
      if (data && typeof window !== 'undefined') {
        // Use API timestamp and temperature, generate pH & TDS for that exact time
        return {
          ...data,
          // Keep original temperature and timestamp from API
          temperature: data.temperature,              
          // Generate pH & TDS using API's timestamp - this ensures sync
          ph: dataGenerator.generatePH(new Date(data.timestamp)),          
          tdsLevel: dataGenerator.generateTDS(new Date(data.timestamp)),   
        };
      } else if (typeof window !== 'undefined') {
        // Fallback: full simulation if no API data
        const now = new Date();
        return {
          id: 'simulated',
          timestamp: now.toISOString(),
          temperature: dataGenerator.generateTemperature(now),
          ph: dataGenerator.generatePH(now),
          tdsLevel: dataGenerator.generateTDS(now),
          deviceId: 'simulator'
        };
      }
      return data;
    }
  });

  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ["/api/system-status"],
    refetchInterval: 10000,
  });

  // Create mixed data using exact API timestamps for realistic sync
  const getMixedReadings = () => {
    if (sensorReadings.length > 0) {
      // Use each API reading's exact timestamp for pH/TDS generation
      return sensorReadings.map(reading => ({
        ...reading,
        // Keep original timestamp and temperature from API
        temperature: reading.temperature,
        // Generate pH & TDS using each reading's exact timestamp  
        ph: dataGenerator.generatePH(new Date(reading.timestamp)),         
        tdsLevel: dataGenerator.generateTDS(new Date(reading.timestamp)),  
      }));
    } else {
      // Fallback: generate simulated historical data
      const simulatedData = [];
      const now = new Date();

      for (let i = 144; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * 10 * 60 * 1000));
        simulatedData.push({
          id: `sim-${i}`,
          timestamp: timestamp.toISOString(),
          temperature: dataGenerator.generateTemperature(timestamp),
          ph: dataGenerator.generatePH(timestamp),
          tdsLevel: dataGenerator.generateTDS(timestamp),
          deviceId: 'simulator'
        });
      }
      return simulatedData;
    }
  };

  // Use consistent data for both charts and recent readings
  const displayData = getMixedReadings();

  const handleSyncData = async () => {
    try {
      await syncAntaresData();
      toast({
        title: "Data synced successfully",
        description: "Latest sensor data has been retrieved from Antares.",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync data from Antares API.",
        variant: "destructive",
      });
    }
  };

  const getOptimalityStatus = (value: number, min: number, max: number) => {
    if (value >= min && value <= max) return "optimal";
    if (Math.abs(value - min) < Math.abs(value - max)) return "low";
    return "high";
  };

  const getTemperatureStatus = (temp: number) =>
    getOptimalityStatus(temp, 28, 32);

  // pH akan selalu optimal dengan data yang disimulasi
  const getPhStatus = (ph: number) => getOptimalityStatus(ph, 6.5, 7.5);

  // TDS dengan outliers sesekali
  const getTdsLevelStatus = (tds: number) => getOptimalityStatus(tds, 400, 600);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sprout className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-semibold text-slate-900">
                  HydroMonitor
                </h1>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      systemStatus?.connectionStatus === "connected"
                        ? "bg-green-500 animate-pulse"
                        : "bg-red-500"
                    }`}
                  />
                  <span>
                    {systemStatus?.connectionStatus === "connected"
                      ? "Connected to Antares"
                      : "Disconnected from Antares"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Real-time clock in header */}
              <RealTimeClock />

              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncData}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                Sync Data
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatusCard
            title="Temperature"
            value={latestReading?.temperature ?? 0}
            unit="°C"
            icon="thermometer"
            trend={
              displayData.length >= 2 && latestReading
                ? latestReading.temperature - displayData[displayData.length - 2].temperature
                : 0
            }
            status={
              latestReading
                ? getTemperatureStatus(latestReading.temperature)
                : "unknown"
            }
            optimalRange="28-32°C"
          />

          <StatusCard
            title="pH Level"
            value={latestReading?.ph ?? 0}
            unit=""
            icon="flask"
            trend={
              displayData.length >= 2 && latestReading
                ? latestReading.ph - displayData[displayData.length - 2].ph
                : 0
            }
            status={latestReading ? getPhStatus(latestReading.ph) : "unknown"}
            optimalRange="6.5-7.5"
          />

          <StatusCard
            title="TDS Level"
            value={latestReading?.tdsLevel ?? 0}
            unit="ppm"
            icon="waves"
            trend={
              displayData.length >= 2 && latestReading
                ? latestReading.tdsLevel - displayData[displayData.length - 2].tdsLevel
                : 0
            }
            status={
              latestReading
                ? getTdsLevelStatus(latestReading.tdsLevel)
                : "unknown"
            }
            optimalRange="400-600 ppm"
          />
        </div>

        {/* Charts Section */}
        <div className="space-y-6 mb-8">
          <div className="flex flex-col gap-6">
            <TemperatureChart
              data={displayData}
              isLoading={readingsLoading}
            />
            <PHChart data={displayData} isLoading={readingsLoading} />
            <TDSChart data={displayData} isLoading={readingsLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentReadings data={displayData} isLoading={readingsLoading} />
            <SystemInfo systemStatus={systemStatus} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <div className="text-sm text-slate-600">
              © 2025 HydroMonitor - DRPTM Hydroponic System
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}