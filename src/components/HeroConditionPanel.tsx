import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import type {
  AirQualityReading,
  BudgetTier,
  CommuteMode,
  HeatingSource,
  HouseholdProfile,
  HouseholdType,
  HousingType,
} from '../types/airQuality.ts';

interface HeroConditionPanelProps {
  profile: HouseholdProfile;
  airQuality: AirQualityReading | null;
  loadingAir: boolean;
  loadingPlan: boolean;
  airError: string | null;
  onProfileChange: (next: HouseholdProfile) => void;
  onLookupCity: (city: string) => void;
  onUseGeolocation: () => void;
  onGeneratePlan: () => void;
}

const PRESET_CITIES = ['Delhi', 'Salt Lake City', 'Lahore', 'Kraków', 'Milan', 'London'];

function renderAqiIcon(level: string) {
  switch (level) {
    case 'good':
      return <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'moderate':
      return <Wind className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'sensitive':
    case 'unhealthy':
      return <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />;
    default:
      return <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />;
  }
}

export function HeroConditionPanel({
  profile,
  airQuality,
  loadingAir,
  loadingPlan,
  airError,
  onProfileChange,
  onLookupCity,
  onUseGeolocation,
  onGeneratePlan,
}: HeroConditionPanelProps) {
  const [cityInput, setCityInput] = useState(profile.city);
  const [imgError, setImgError] = useState(false);

  const handleCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cityInput.trim();
    if (trimmed.length >= 2) {
      onProfileChange({ ...profile, city: trimmed });
      onLookupCity(trimmed);
    }
  };

  const handlePresetClick = (city: string) => {
    setCityInput(city);
    onProfileChange({ ...profile, city });
    onLookupCity(city);
  };

  const maxHourlyPm25 = airQuality?.hourlyForecast.length
    ? Math.max(...airQuality.hourlyForecast.map((h) => h.pm25), 10)
    : 50;

  return (
    <section id="top" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="text-xs font-medium text-teal-800">
                Winter Smog &amp; Urban Air Quality Assistant
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12] [text-wrap:balance]">
                Practical clean-air routines tailored to your neighborhood
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Combine local winter air quality data with your household setup to cut indoor
                PM2.5 exposure, lower heating and commute emissions, and see the exact impact of
                every choice.
              </p>
            </div>

            <div className="mt-7 space-y-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <form onSubmit={handleCitySubmit} className="space-y-2.5">
                <label
                  htmlFor="city-search-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Location
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="city-search-input"
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="Enter city (e.g., Delhi, Salt Lake City, Kraków)"
                      maxLength={80}
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingAir}
                    className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {loadingAir ? 'Checking…' : 'Check Air'}
                  </button>
                  <button
                    type="button"
                    onClick={onUseGeolocation}
                    disabled={loadingAir}
                    aria-label="Use my current browser location"
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Compass className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    <span>Near Me</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-500">
                  <span>Quick check:</span>
                  {PRESET_CITIES.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handlePresetClick(city)}
                      className={`py-1 underline-offset-4 transition-colors hover:text-teal-800 hover:underline cursor-pointer ${
                        airQuality?.city.toLowerCase() === city.toLowerCase()
                          ? 'font-semibold text-teal-800 underline'
                          : ''
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </form>

              {airError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
                >
                  {airError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="household-select"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Household &amp; Vulnerability
                  </label>
                  <select
                    id="household-select"
                    value={profile.householdType}
                    onChange={(e) =>
                      onProfileChange({
                        ...profile,
                        householdType: e.target.value as HouseholdType,
                      })
                    }
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="family_kids">Family with school-age children</option>
                    <option value="multigenerational">Multi-generational / older adults</option>
                    <option value="respiratory_sensitive">Asthma or respiratory sensitivity</option>
                    <option value="young_adults">Adults / apartment roommates</option>
                    <option value="community_leader">Neighborhood / school organizer</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="commute-select"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Primary Daily Commute
                  </label>
                  <select
                    id="commute-select"
                    value={profile.commuteMode}
                    onChange={(e) =>
                      onProfileChange({
                        ...profile,
                        commuteMode: e.target.value as CommuteMode,
                      })
                    }
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="car_petrol">Petrol / diesel car &amp; school run</option>
                    <option value="public_transit">Bus, metro, or electric rail</option>
                    <option value="walking_cycling">Walking / cycling / two-wheeler</option>
                    <option value="remote_hybrid">Mostly remote / home-based</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="heating-select"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Home Heating &amp; Cooking Fuel
                  </label>
                  <select
                    id="heating-select"
                    value={profile.heatingSource}
                    onChange={(e) =>
                      onProfileChange({
                        ...profile,
                        heatingSource: e.target.value as HeatingSource,
                      })
                    }
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="gas_furnace">Natural gas furnace &amp; stove</option>
                    <option value="wood_biomass">Wood stove, fireplace, or solid fuel</option>
                    <option value="electric_heat_pump">Electric heat pump / induction</option>
                    <option value="district_heating">Building radiator / district heating</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="housing-select"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Home Type
                    </label>
                    <select
                      id="housing-select"
                      value={profile.housingType}
                      onChange={(e) =>
                        onProfileChange({
                          ...profile,
                          housingType: e.target.value as HousingType,
                        })
                      }
                      className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900"
                    >
                      <option value="apartment">Apartment</option>
                      <option value="single_family_home">House</option>
                      <option value="older_drafty_home">Drafty home</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="budget-select"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Budget Focus
                    </label>
                    <select
                      id="budget-select"
                      value={profile.budgetTier}
                      onChange={(e) =>
                        onProfileChange({
                          ...profile,
                          budgetTier: e.target.value as BudgetTier,
                        })
                      }
                      className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900"
                    >
                      <option value="zero_cost">Zero cost</option>
                      <option value="low_cost">Low cost (&lt;$50)</option>
                      <option value="moderate_upgrade">Upgrades OK</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <p className="text-xs text-slate-500">
                  Live pollutant readings from Open-Meteo · Tailored by Gemini
                </p>
                <button
                  type="button"
                  onClick={onGeneratePlan}
                  disabled={loadingPlan || loadingAir}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {loadingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Tailoring Plan…</span>
                    </>
                  ) : (
                    <span>Generate Tailored Plan</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-80 lg:h-full">
              {!imgError ? (
                <img
                  src="/src/assets/images/winter_urban_morning_1795168234934.jpg"
                  alt="Winter residential street with electric transit and residents cycling in crisp morning sunlight"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-teal-50 p-6 text-center">
                  <Wind className="h-10 w-10 text-teal-700" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    Winter Urban Air Quality Context
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-5 text-white">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {airQuality
                      ? `${airQuality.city}, ${airQuality.country}`
                      : profile.city}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-white">
                  Winter thermal inversions trap wood smoke, vehicle NO₂, and PM2.5 near street
                  level—making timing and indoor filtration critical.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column live telemetry bar */}
        <div
          aria-live="polite"
          className="mt-8 rounded-xl border border-slate-200 bg-slate-50/60"
        >
          {loadingAir && !airQuality ? (
            <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="h-16 animate-pulse rounded-lg bg-slate-200/70" />
              ))}
            </div>
          ) : airQuality ? (
            <>
              <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">US Air Quality Index</div>
                  <div className="mt-1.5 flex items-baseline gap-2.5">
                    <span className="font-mono text-3xl font-semibold tabular-nums text-slate-900">
                      {airQuality.usAqi}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${airQuality.classification.dotColorClass}`}
                    >
                      {renderAqiIcon(airQuality.classification.level)}
                      <span>{airQuality.classification.label}</span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {airQuality.classification.advisory}
                  </p>
                </div>

                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">Fine Particulates (PM2.5)</div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-semibold tabular-nums text-slate-900">
                      {airQuality.pm25}
                    </span>
                    <span className="font-mono text-xs text-slate-500">µg/m³</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    WHO 24h guideline is 15 µg/m³ · PM10: {airQuality.pm10} µg/m³
                  </p>
                </div>

                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Combustion &amp; Traffic (NO₂)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-semibold tabular-nums text-slate-900">
                      {airQuality.no2}
                    </span>
                    <span className="font-mono text-xs text-slate-500">µg/m³</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Inversion trapping risk:{' '}
                    <span className="font-semibold capitalize text-slate-800">
                      {airQuality.inversionRisk}
                    </span>
                  </p>
                </div>

                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Best Ventilation Window
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-teal-800">
                    {airQuality.bestVentilationWindow}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Based on today&apos;s hourly dispersion forecast for {airQuality.city}.
                  </p>
                </div>
              </div>

              {airQuality.hourlyForecast.length > 0 && (
                <div className="border-t border-slate-200 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      Today&apos;s Hourly PM2.5 Curve (µg/m³)
                    </span>
                    <span>Lower bars indicate safer midday airing or outdoor errand windows</span>
                  </div>
                  <div
                    className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12"
                    role="list"
                    aria-label="Hourly PM2.5 forecast"
                  >
                    {airQuality.hourlyForecast.map((point, idx) => {
                      const heightPct = Math.max(
                        14,
                        Math.min(100, Math.round((point.pm25 / maxHourlyPm25) * 100)),
                      );
                      const barColor =
                        point.aqi > 150
                          ? 'bg-red-600'
                          : point.aqi > 100
                            ? 'bg-orange-500'
                            : point.aqi > 50
                              ? 'bg-amber-500'
                              : 'bg-teal-700';

                      return (
                        <div
                          key={`${point.hour}-${idx}`}
                          role="listitem"
                          className="flex flex-col items-center gap-1"
                        >
                          <span className="font-mono text-[11px] tabular-nums text-slate-600">
                            {point.pm25}
                          </span>
                          <div className="flex h-12 w-full items-end justify-center rounded bg-slate-200/70 p-0.5">
                            <div
                              className={`w-full rounded-sm ${barColor}`}
                              style={{ height: `${heightPct}%` }}
                              aria-hidden="true"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 whitespace-nowrap">
                            {point.hour}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
