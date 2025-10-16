import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subHours, subDays } from "date-fns";
import type { SensorReading } from "@shared/schema";

type TimeRange = "24h" | "7d" | "30d";

interface ChartProps {
  data: SensorReading[];
  isLoading: boolean;
}

// Helper to filter data by time range
function useFilteredData(data: SensorReading[], range: TimeRange) {
  const now = new Date();
  let cutoff: Date;
  
  switch (range) {
    case "24h": cutoff = subHours(now, 24); break;
    case "7d": cutoff = subDays(now, 7); break;
    case "30d": cutoff = subDays(now, 30); break;
  }

  return data
    .filter(r => new Date(r.timestamp) >= cutoff)
    .map(r => ({
      ...r,
      time: format(new Date(r.timestamp), range === "24h" ? "HH:mm" : "MM/dd"),
    }))
    .reverse();
}

// Time Range Selector
function TimeRangeSelector({ 
  value, 
  onChange 
}: { 
  value: TimeRange; 
  onChange: (v: TimeRange) => void 
}) {
  return (
    <div className="flex items-center space-x-2">
      {(["24h", "7d", "30d"] as TimeRange[]).map((range) => (
        <Button
          key={range}
          variant={value === range ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(range)}
        >
          {range.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}

// Generic Chart Component
function MetricChart({
  title,
  data,
  dataKey,
  color,
  unit,
  isLoading,
}: {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  unit?: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: color }} />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: color }} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-slate-500">
          No data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: color }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [
                  unit ? `${value.toFixed(1)}${unit}` : value.toFixed(1),
                  title
                ]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Unified Charts Component
export default function SensorCharts({ data, isLoading }: ChartProps) {
  const [range, setRange] = useState<TimeRange>("24h");
  const filteredData = useFilteredData(data, range);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Temperature Chart */}
      <MetricChart
        title="Temperature"
        data={filteredData}
        dataKey="temperature"
        color="#ef4444"
        unit="°C"
        isLoading={isLoading}
      />

      {/* pH Chart */}
      <MetricChart
        title="pH Level"
        data={filteredData}
        dataKey="ph"
        color="#8b5cf6"
        isLoading={isLoading}
      />

      {/* TDS Chart */}
      <MetricChart
        title="TDS Level"
        data={filteredData}
        dataKey="tdsLevel"
        color="#10b981"
        unit=" ppm"
        isLoading={isLoading}
      />
    </div>
  );
}