export type HouseholdType =
  | 'family_kids'
  | 'multigenerational'
  | 'respiratory_sensitive'
  | 'young_adults'
  | 'community_leader';

export type CommuteMode =
  | 'car_petrol'
  | 'public_transit'
  | 'walking_cycling'
  | 'remote_hybrid';

export type HeatingSource =
  | 'gas_furnace'
  | 'wood_biomass'
  | 'electric_heat_pump'
  | 'district_heating';

export type HousingType =
  | 'apartment'
  | 'single_family_home'
  | 'older_drafty_home';

export type BudgetTier = 'zero_cost' | 'low_cost' | 'moderate_upgrade';

export interface HouseholdProfile {
  city: string;
  householdType: HouseholdType;
  commuteMode: CommuteMode;
  heatingSource: HeatingSource;
  housingType: HousingType;
  budgetTier: BudgetTier;
}

export type AqiLevel =
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'very_unhealthy'
  | 'hazardous';

export interface AqiClassification {
  level: AqiLevel;
  label: string;
  advisory: string;
  badgeClass: string;
  dotColorClass: string;
}

export interface HourlyAirPoint {
  hour: string;
  pm25: number;
  aqi: number;
}

export interface AirQualityReading {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  pm25: number;
  pm10: number;
  no2: number;
  ozone: number;
  usAqi: number;
  classification: AqiClassification;
  inversionRisk: 'low' | 'moderate' | 'high';
  bestVentilationWindow: string;
  observedAt: string;
  source: 'open-meteo-live' | 'estimated-winter-baseline';
  hourlyForecast: HourlyAirPoint[];
}

export interface RoutineStep {
  id: string;
  timeWindow: string;
  title: string;
  action: string;
  whyItWorks: string;
  directImpact: string;
  pm25ReductionPct: number;
  weeklyCo2SavedKg: number;
  emissionFocus: 'exposure_shield' | 'low_emission' | 'community_action';
}

export interface IndoorHack {
  id: string;
  title: string;
  steps: string[];
  costTier: 'Free' | 'Under $30' | '$30–$150';
  indoorPm25DropPct: number;
  mechanism: string;
  directImpact: string;
  safetyNote: string;
}

export interface SustainableAlternative {
  id: string;
  currentHabit: string;
  sustainableSwap: string;
  category: 'heating' | 'mobility' | 'cooking' | 'community';
  weeklyCo2SavedKg: number;
  localPm25Impact: string;
  householdImpact: string;
  communityMultiplierNote: string;
  effortLevel: 'Immediate' | 'This Week' | 'Seasonal Upgrade';
}

export interface CommunityInitiative {
  id: string;
  title: string;
  participantsNeeded: string;
  actionSteps: string;
  collectiveImpact: string;
}

export interface SmogActionPlan {
  locationSummary: string;
  smogDynamicsExplanation: string;
  routines: RoutineStep[];
  indoorHacks: IndoorHack[];
  alternatives: SustainableAlternative[];
  communityInitiatives: CommunityInitiative[];
}

export interface AdoptedImpactSummary {
  adoptedCount: number;
  exposureReductionPct: number;
  baselineIndoorPm25: number;
  projectedIndoorPm25: number;
  weeklyCo2SavedKg: number;
  annualCo2SavedKg: number;
  communityWeeklyCo2SavedKg: number;
  communityAnnualCo2SavedTons: number;
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  directImpactTakeaway?: string;
  timestamp: string;
}
