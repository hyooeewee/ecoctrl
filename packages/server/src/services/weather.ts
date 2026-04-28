import { withCache } from "@/services/base/withCache";

const API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.WEATHER_LAT || "39.9042"; // default Beijing
const LNG = process.env.WEATHER_LNG || "116.4074";
const LOCATION = process.env.WEATHER_LOCATION || "Beijing";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface WeatherData {
  location: string;
  currentTemp: number;
  unit: "C";
  condition: string;
  forecast: Array<{ day: string; high: number; low: number; condition: string }>;
}

const DEFAULT_WEATHER: WeatherData = {
  location: LOCATION,
  currentTemp: 24,
  unit: "C",
  condition: "sunny",
  forecast: [
    { day: "Mon", high: 26, low: 18, condition: "cloudy" },
    { day: "Tue", high: 22, low: 16, condition: "rainy" },
    { day: "Wed", high: 25, low: 17, condition: "sunny" },
    { day: "Thu", high: 28, low: 19, condition: "sunny" },
    { day: "Fri", high: 24, low: 15, condition: "cloudy" },
  ],
};

function mapCondition(main: string): string {
  const map: Record<string, string> = {
    Clear: "sunny",
    Clouds: "cloudy",
    Rain: "rainy",
    Drizzle: "rainy",
    Thunderstorm: "rainy",
    Snow: "snowy",
    Mist: "cloudy",
    Fog: "cloudy",
    Haze: "cloudy",
  };
  return map[main] || "cloudy";
}

function getDayName(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

async function fetchWeatherFromApi(): Promise<WeatherData> {
  if (!API_KEY) {
    return DEFAULT_WEATHER;
  }

  // Current weather
  const currentUrl =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${LAT}&lon=${LNG}&appid=${API_KEY}&units=metric`;
  const currentRes = await fetch(currentUrl, {
    signal: AbortSignal.timeout(5000),
  });
  if (!currentRes.ok) throw new Error(`Current HTTP ${currentRes.status}`);
  const current = (await currentRes.json()) as Record<string, unknown>;
  const currentMain = current.main as Record<string, unknown>;
  const currentWeather = (current.weather as Array<Record<string, unknown>>)?.[0];

  // 5-day forecast (3-hour steps)
  const forecastUrl =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?lat=${LAT}&lon=${LNG}&appid=${API_KEY}&units=metric`;
  const forecastRes = await fetch(forecastUrl, {
    signal: AbortSignal.timeout(5000),
  });
  if (!forecastRes.ok) throw new Error(`Forecast HTTP ${forecastRes.status}`);
  const forecastBody = (await forecastRes.json()) as Record<string, unknown>;
  const list = (forecastBody.list as Array<Record<string, unknown>>) ?? [];

  // Aggregate 3-hour steps into daily high/low
  const dailyMap = new Map<string, { high: number; low: number; condition: string; dt: number }>();

  for (const item of list) {
    const dt = Number(item.dt);
    const day = new Date(dt * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
    const main = item.main as Record<string, unknown>;
    const weather = (item.weather as Array<Record<string, unknown>>)?.[0];
    const tempMax = Number(main.temp_max ?? -Infinity);
    const tempMin = Number(main.temp_min ?? Infinity);

    const existing = dailyMap.get(day);
    if (existing) {
      existing.high = Math.max(existing.high, tempMax);
      existing.low = Math.min(existing.low, tempMin);
    } else {
      dailyMap.set(day, {
        high: tempMax,
        low: tempMin,
        condition: mapCondition(String(weather?.main ?? "Clouds")),
        dt,
      });
    }
  }

  // Skip today, take next 5 days
  const forecast = Array.from(dailyMap.values())
    .slice(1, 6)
    .map((d) => ({
      day: getDayName(d.dt),
      high: Math.round(d.high),
      low: Math.round(d.low),
      condition: d.condition,
    }));

  return {
    location: LOCATION,
    currentTemp: Math.round(Number(currentMain.temp ?? 0)),
    unit: "C",
    condition: mapCondition(String(currentWeather?.main ?? "Clouds")),
    forecast,
  };
}

const cached = withCache(async () => {
  try {
    return await fetchWeatherFromApi();
  } catch {
    return DEFAULT_WEATHER;
  }
}, CACHE_TTL_MS);

export async function fetchWeather(): Promise<WeatherData> {
  return cached.get();
}

export function clearWeatherCache(): void {
  cached.clear();
}

export function getWeatherCacheStats() {
  return cached.getStats();
}
