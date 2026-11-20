import type { AirQualityReading, HourlyAirPoint } from '../src/types/airQuality.ts';
import { calculateUsAqiFromPm25, classifyAqi } from '../src/utils/impactCalculator.ts';
import { TtlCache } from './cache.ts';

interface GeocodingResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoAirResponse {
  current?: {
    time?: string;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
    us_aqi?: number;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

const airCache = new TtlCache<AirQualityReading>(10 * 60 * 1000, 150);

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 5500): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Upstream API returned status ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function formatHourLabel(isoString: string): string {
  const timePart = isoString.split('T')[1] ?? '';
  const hourStr = timePart.slice(0, 2);
  const hourNum = Number(hourStr);
  if (!Number.isFinite(hourNum)) {
    return isoString;
  }
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const h12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
  return `${h12} ${period}`;
}

function deriveBestVentilationWindow(hourly: HourlyAirPoint[], currentAqi: number): string {
  if (hourly.length === 0) {
    return currentAqi > 150
      ? 'Keep windows sealed; rely on HEPA/MERV-13 recirculation'
      : '1:00 PM – 3:00 PM (typical midday thermal mixing)';
  }
  let best = hourly[0];
  for (const point of hourly) {
    if (point.pm25 < best.pm25) {
      best = point;
    }
  }
  if (best.aqi > 150) {
    return `Avoid open-window airing today (lowest ~${best.hour} at AQI ${best.aqi})`;
  }
  return `Around ${best.hour} (forecast PM2.5 dips to ${best.pm25} µg/m³)`;
}

function deriveInversionRisk(pm25: number, no2: number): 'low' | 'moderate' | 'high' {
  if (pm25 >= 55 || no2 >= 65) {
    return 'high';
  }
  if (pm25 >= 25 || no2 >= 35) {
    return 'moderate';
  }
  return 'low';
}

export class CityNotFoundError extends Error {
  constructor(city: string) {
    super(`Could not locate "${city}". Try a major city or "City, Country" format.`);
    this.name = 'CityNotFoundError';
  }
}

async function fetchOpenMeteoAir(
  latitude: number,
  longitude: number,
  cityLabel: string,
  countryLabel: string,
): Promise<AirQualityReading> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${encodeURIComponent(latitude.toFixed(4))}` +
    `&longitude=${encodeURIComponent(longitude.toFixed(4))}` +
    `&current=pm2_5,pm10,nitrogen_dioxide,ozone,us_aqi` +
    `&hourly=pm2_5,us_aqi&forecast_days=1&timezone=auto`;

  const data = await fetchJsonWithTimeout<OpenMeteoAirResponse>(url);
  const current = data.current ?? {};
  const pm25 = Math.round((current.pm2_5 ?? 18) * 10) / 10;
  const pm10 = Math.round((current.pm10 ?? pm25 * 1.45) * 10) / 10;
  const no2 = Math.round((current.nitrogen_dioxide ?? 22) * 10) / 10;
  const ozone = Math.round((current.ozone ?? 34) * 10) / 10;
  const usAqi =
    typeof current.us_aqi === 'number' && Number.isFinite(current.us_aqi)
      ? Math.round(current.us_aqi)
      : calculateUsAqiFromPm25(pm25);

  const times = data.hourly?.time ?? [];
  const pmSeries = data.hourly?.pm2_5 ?? [];
  const aqiSeries = data.hourly?.us_aqi ?? [];

  const hourlyForecast: HourlyAirPoint[] = [];
  const step = Math.max(1, Math.floor(times.length / 12));
  for (let i = 0; i < times.length && hourlyForecast.length < 12; i += step) {
    const pVal = Math.round((pmSeries[i] ?? pm25) * 10) / 10;
    const aVal =
      typeof aqiSeries[i] === 'number' && aqiSeries[i] !== null
        ? Math.round(aqiSeries[i] as number)
        : calculateUsAqiFromPm25(pVal);
    hourlyForecast.push({
      hour: formatHourLabel(times[i]),
      pm25: pVal,
      aqi: aVal,
    });
  }

  return {
    city: cityLabel,
    country: countryLabel,
    latitude,
    longitude,
    pm25,
    pm10,
    no2,
    ozone,
    usAqi,
    classification: classifyAqi(usAqi),
    inversionRisk: deriveInversionRisk(pm25, no2),
    bestVentilationWindow: deriveBestVentilationWindow(hourlyForecast, usAqi),
    observedAt: current.time ?? new Date().toISOString(),
    source: 'open-meteo-live',
    hourlyForecast,
  };
}

export async function getAirQualityByCity(city: string): Promise<AirQualityReading> {
  const cacheKey = `city:${city.toLowerCase()}`;
  const cached = airCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoData = await fetchJsonWithTimeout<{ results?: GeocodingResult[] }>(geoUrl);
  const match = geoData.results?.[0];

  if (!match) {
    throw new CityNotFoundError(city);
  }

  const countryLabel = match.country ?? match.admin1 ?? 'Global';
  const reading = await fetchOpenMeteoAir(
    match.latitude,
    match.longitude,
    match.name,
    countryLabel,
  );
  airCache.set(cacheKey, reading);
  return reading;
}

export async function getAirQualityByCoords(lat: number, lon: number): Promise<AirQualityReading> {
  const cacheKey = `coords:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = airCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let cityLabel = `Coordinates (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
  let countryLabel = 'Local Sensor Grid';

  try {
    const revUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10`;
    const rev = await fetchJsonWithTimeout<{
      address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
    }>(revUrl, 3000);
    const addr = rev.address;
    if (addr) {
      cityLabel = addr.city ?? addr.town ?? addr.village ?? addr.state ?? cityLabel;
      countryLabel = addr.country ?? countryLabel;
    }
  } catch {
    // Graceful degradation to coordinate label if reverse geocode is unavailable
  }

  const reading = await fetchOpenMeteoAir(lat, lon, cityLabel, countryLabel);
  airCache.set(cacheKey, reading);
  return reading;
}
