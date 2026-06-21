import { Cloud, CloudLightning, CloudRain, Snowflake, Sun } from "lucide-react";
import type { ForecastItem, WeatherData, WidgetConfig } from "./types";

interface WeatherWidgetProps {
  widget: WidgetConfig;
  data: WeatherData;
}

const conditionIcon: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
  stormy: CloudLightning,
};

function ConditionIcon({ condition, className }: { condition: string; className?: string }) {
  const Icon = conditionIcon[condition] ?? Cloud;
  return <Icon size={20} className={className} />;
}

function ForecastDay({ item, unit }: { item: ForecastItem; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{item.day}</span>
      <ConditionIcon condition={item.condition} className="text-amber-500" />
      <span className="text-[10px] font-medium">
        {item.high}° / {item.low}°{unit}
      </span>
    </div>
  );
}

export function WeatherWidget({ data }: WeatherWidgetProps) {
  const CurrentIcon = conditionIcon[data?.condition] ?? Sun;
  const forecast = data?.forecast ?? [];

  return (
    <div className="flex h-full flex-col justify-between p-3">
      {/* Current weather */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">{data?.location ?? "—"}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight">{data?.currentTemp ?? "—"}</span>
            <span className="text-sm text-muted-foreground">°{data?.unit ?? ""}</span>
          </div>
        </div>
        <CurrentIcon size={32} className="text-amber-500" />
      </div>

      {/* Forecast */}
      {forecast.length > 0 && (
        <div className="flex justify-between pt-2">
          {forecast.map((item) => (
            <ForecastDay key={item.day} item={item} unit={data?.unit ?? ""} />
          ))}
        </div>
      )}
    </div>
  );
}
