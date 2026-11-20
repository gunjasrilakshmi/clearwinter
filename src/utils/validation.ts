import type {
  BudgetTier,
  CommuteMode,
  HeatingSource,
  HouseholdProfile,
  HouseholdType,
  HousingType,
} from '../types/airQuality.ts';

const VALID_HOUSEHOLD_TYPES: ReadonlySet<HouseholdType> = new Set([
  'family_kids',
  'multigenerational',
  'respiratory_sensitive',
  'young_adults',
  'community_leader',
]);

const VALID_COMMUTE_MODES: ReadonlySet<CommuteMode> = new Set([
  'car_petrol',
  'public_transit',
  'walking_cycling',
  'remote_hybrid',
]);

const VALID_HEATING_SOURCES: ReadonlySet<HeatingSource> = new Set([
  'gas_furnace',
  'wood_biomass',
  'electric_heat_pump',
  'district_heating',
]);

const VALID_HOUSING_TYPES: ReadonlySet<HousingType> = new Set([
  'apartment',
  'single_family_home',
  'older_drafty_home',
]);

const VALID_BUDGET_TIERS: ReadonlySet<BudgetTier> = new Set([
  'zero_cost',
  'low_cost',
  'moderate_upgrade',
]);

/**
 * Strips control characters, collapses excessive whitespace, and enforces max length
 * to guard against oversized inputs and prompt/header control character injection.
 */
export function sanitizePlainText(input: unknown, maxLength = 120): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/[\u0000-\u001F\u007F<>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateCityQuery(cityRaw: unknown): { valid: boolean; city: string; error?: string } {
  const city = sanitizePlainText(cityRaw, 80);
  if (city.length < 2) {
    return { valid: false, city: '', error: 'Please enter a city name of at least 2 characters.' };
  }
  if (!/^[\p{L}\p{N}\s,.'-]+$/u.test(city)) {
    return { valid: false, city: '', error: 'City name contains unsupported characters.' };
  }
  return { valid: true, city };
}

export function validateCoordinates(
  latRaw: unknown,
  lonRaw: unknown,
): { valid: boolean; lat: number; lon: number; error?: string } {
  const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const lon = typeof lonRaw === 'number' ? lonRaw : Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { valid: false, lat: 0, lon: 0, error: 'Invalid geographic coordinates.' };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { valid: false, lat: 0, lon: 0, error: 'Coordinates are out of valid Earth bounds.' };
  }
  return { valid: true, lat, lon };
}

export function validateHouseholdProfile(raw: unknown): {
  valid: boolean;
  profile?: HouseholdProfile;
  error?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Profile payload must be an object.' };
  }
  const obj = raw as Record<string, unknown>;
  const cityCheck = validateCityQuery(obj.city);
  if (!cityCheck.valid) {
    return { valid: false, error: cityCheck.error };
  }

  const householdType = obj.householdType as HouseholdType;
  const commuteMode = obj.commuteMode as CommuteMode;
  const heatingSource = obj.heatingSource as HeatingSource;
  const housingType = obj.housingType as HousingType;
  const budgetTier = obj.budgetTier as BudgetTier;

  if (!VALID_HOUSEHOLD_TYPES.has(householdType)) {
    return { valid: false, error: 'Invalid household type selection.' };
  }
  if (!VALID_COMMUTE_MODES.has(commuteMode)) {
    return { valid: false, error: 'Invalid commute mode selection.' };
  }
  if (!VALID_HEATING_SOURCES.has(heatingSource)) {
    return { valid: false, error: 'Invalid heating source selection.' };
  }
  if (!VALID_HOUSING_TYPES.has(housingType)) {
    return { valid: false, error: 'Invalid housing type selection.' };
  }
  if (!VALID_BUDGET_TIERS.has(budgetTier)) {
    return { valid: false, error: 'Invalid budget tier selection.' };
  }

  return {
    valid: true,
    profile: {
      city: cityCheck.city,
      householdType,
      commuteMode,
      heatingSource,
      housingType,
      budgetTier,
    },
  };
}

export function validateAdvisorQuestion(raw: unknown): {
  valid: boolean;
  question: string;
  error?: string;
} {
  const question = sanitizePlainText(raw, 400);
  if (question.length < 3) {
    return { valid: false, question: '', error: 'Please enter a question of at least 3 characters.' };
  }
  return { valid: true, question };
}
