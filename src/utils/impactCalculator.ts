import type {
  AdoptedImpactSummary,
  AqiClassification,
  SmogActionPlan,
} from '../types/airQuality.ts';

interface EpaBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: EpaBreakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 400 },
  { cLow: 325.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

/**
 * Calculates the US EPA AQI from PM2.5 concentration (ug/m3) using
 * 2024 EPA piecewise linear breakpoints.
 */
export function calculateUsAqiFromPm25(pm25Raw: number): number {
  if (!Number.isFinite(pm25Raw) || pm25Raw < 0) {
    return 0;
  }
  const c = Math.floor(pm25Raw * 10) / 10;
  if (c > 500.4) {
    return 500;
  }
  for (const bp of PM25_BREAKPOINTS) {
    if (c >= bp.cLow && c <= bp.cHigh) {
      const aqi =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }
  return 500;
}

export function classifyAqi(aqiRaw: number): AqiClassification {
  const aqi = Math.max(0, Math.round(aqiRaw));

  if (aqi <= 50) {
    return {
      level: 'good',
      label: 'Good',
      advisory:
        'Air is clean. Safe for outdoor walks, school runs, and full home cross-ventilation.',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotColorClass: 'text-emerald-700',
    };
  }
  if (aqi <= 100) {
    return {
      level: 'moderate',
      label: 'Moderate',
      advisory:
        'Acceptable for most families. Sensitive individuals should avoid heavy exertion near busy roads.',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotColorClass: 'text-amber-700',
    };
  }
  if (aqi <= 150) {
    return {
      level: 'sensitive',
      label: 'Unhealthy for Sensitive Groups',
      advisory:
        'Children, older adults, and people with asthma should shorten outdoor exertion and run indoor filtration.',
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
      dotColorClass: 'text-orange-700',
    };
  }
  if (aqi <= 200) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy',
      advisory:
        'Limit outdoor play, wear well-fitted N95/KF94 masks outdoors, and seal drafty windows.',
      badgeClass: 'bg-red-50 text-red-800 border-red-200',
      dotColorClass: 'text-red-700',
    };
  }
  if (aqi <= 300) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy',
      advisory:
        'Severe winter smog alert. Stay indoors with HEPA/MERV-13 filtration; avoid indoor combustion.',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      dotColorClass: 'text-purple-700',
    };
  }
  return {
    level: 'hazardous',
    label: 'Hazardous',
    advisory:
      'Emergency air quality conditions. Keep windows sealed, run clean-air rooms continuously, and shift travel.',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    dotColorClass: 'text-rose-800',
  };
}

/**
 * Estimates typical unmitigated winter indoor PM2.5 (~62% outdoor infiltration
 * plus baseline indoor cooking/heating contributions).
 */
export function estimateBaselineIndoorPm25(outdoorPm25: number): number {
  const safeOutdoor = Math.max(0, Number.isFinite(outdoorPm25) ? outdoorPm25 : 0);
  return Math.round((safeOutdoor * 0.62 + 4.5) * 10) / 10;
}

/**
 * Computes cumulative exposure reduction using multiplicative diminishing returns:
 * 1 - Π(1 - r_i), capped at 92% to remain physically realistic for residential homes.
 */
export function calculateAdoptedImpact(
  adoptedIds: ReadonlySet<string>,
  plan: SmogActionPlan | null,
  outdoorPm25: number,
  communityHouseholds: number,
): AdoptedImpactSummary {
  const baselineIndoorPm25 = estimateBaselineIndoorPm25(outdoorPm25);
  const safeHouseholds = Math.max(1, Math.min(10000, Math.round(communityHouseholds || 1)));

  if (!plan || adoptedIds.size === 0) {
    return {
      adoptedCount: 0,
      exposureReductionPct: 0,
      baselineIndoorPm25,
      projectedIndoorPm25: baselineIndoorPm25,
      weeklyCo2SavedKg: 0,
      annualCo2SavedKg: 0,
      communityWeeklyCo2SavedKg: 0,
      communityAnnualCo2SavedTons: 0,
    };
  }

  let remainingExposureFraction = 1;
  let weeklyCo2SavedKg = 0;
  let adoptedCount = 0;

  for (const routine of plan.routines) {
    if (adoptedIds.has(routine.id)) {
      adoptedCount += 1;
      const pct = Math.max(0, Math.min(75, routine.pm25ReductionPct)) / 100;
      remainingExposureFraction *= 1 - pct;
      weeklyCo2SavedKg += Math.max(0, routine.weeklyCo2SavedKg);
    }
  }

  for (const hack of plan.indoorHacks) {
    if (adoptedIds.has(hack.id)) {
      adoptedCount += 1;
      const pct = Math.max(0, Math.min(85, hack.indoorPm25DropPct)) / 100;
      remainingExposureFraction *= 1 - pct;
    }
  }

  for (const alt of plan.alternatives) {
    if (adoptedIds.has(alt.id)) {
      adoptedCount += 1;
      weeklyCo2SavedKg += Math.max(0, alt.weeklyCo2SavedKg);
      // Local ambient/indoor emission avoidance contributes modest exposure benefit
      remainingExposureFraction *= 1 - 0.08;
    }
  }

  const rawReductionPct = (1 - remainingExposureFraction) * 100;
  const exposureReductionPct = Math.round(Math.min(92, rawReductionPct));
  const projectedIndoorPm25 =
    Math.round(baselineIndoorPm25 * (1 - exposureReductionPct / 100) * 10) / 10;

  const roundedWeeklyCo2 = Math.round(weeklyCo2SavedKg * 10) / 10;
  const annualCo2SavedKg = Math.round(roundedWeeklyCo2 * 52);
  const communityWeeklyCo2SavedKg = Math.round(roundedWeeklyCo2 * safeHouseholds);
  const communityAnnualCo2SavedTons =
    Math.round(((annualCo2SavedKg * safeHouseholds) / 1000) * 10) / 10;

  return {
    adoptedCount,
    exposureReductionPct,
    baselineIndoorPm25,
    projectedIndoorPm25,
    weeklyCo2SavedKg: roundedWeeklyCo2,
    annualCo2SavedKg,
    communityWeeklyCo2SavedKg,
    communityAnnualCo2SavedTons,
  };
}
