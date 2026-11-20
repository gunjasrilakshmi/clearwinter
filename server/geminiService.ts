import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AdvisorMessage,
  AirQualityReading,
  HouseholdProfile,
  SmogActionPlan,
} from '../src/types/airQuality.ts';
import { TtlCache } from './cache.ts';

const planCache = new TtlCache<SmogActionPlan>(15 * 60 * 1000, 100);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Do not retry auth/permission/bad-request errors
      if (
        msg.includes('400') ||
        msg.includes('403') ||
        msg.includes('API_KEY') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('GEMINI_API_KEY_MISSING')
      ) {
        throw err;
      }
      if (attempt < retries) {
        const delayMs = 450 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

const PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    locationSummary: {
      type: Type.STRING,
      description: '2-sentence plain-language summary of current winter smog conditions in this city and household priority.',
    },
    smogDynamicsExplanation: {
      type: Type.STRING,
      description: 'Clear explanation of how local winter meteorology (e.g., thermal inversions, valley trapping, heating/traffic emissions) affects PM2.5 and NO2 here.',
    },
    routines: {
      type: Type.ARRAY,
      description: 'Exactly 4 low-emission daily routine steps spanning Morning, Midday Window, Commute/School, and Evening Home.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          timeWindow: { type: Type.STRING },
          title: { type: Type.STRING },
          action: { type: Type.STRING },
          whyItWorks: { type: Type.STRING },
          directImpact: {
            type: Type.STRING,
            description: 'Concrete quantitative explanation of health exposure reduction and emissions avoided.',
          },
          pm25ReductionPct: {
            type: Type.NUMBER,
            description: 'Realistic estimated household PM2.5 exposure reduction percentage between 5 and 45.',
          },
          weeklyCo2SavedKg: {
            type: Type.NUMBER,
            description: 'Realistic weekly CO2e avoided in kg (0 to 40).',
          },
          emissionFocus: {
            type: Type.STRING,
            description: 'One of: exposure_shield, low_emission, community_action',
          },
        },
        required: [
          'id',
          'timeWindow',
          'title',
          'action',
          'whyItWorks',
          'directImpact',
          'pm25ReductionPct',
          'weeklyCo2SavedKg',
          'emissionFocus',
        ],
      },
    },
    indoorHacks: {
      type: Type.ARRAY,
      description: 'Exactly 4 practical indoor air quality hacks covering Free, Under $30, and $30-$150 budget tiers.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          costTier: {
            type: Type.STRING,
            description: 'Must be exactly one of: Free, Under $30, $30–$150',
          },
          indoorPm25DropPct: {
            type: Type.NUMBER,
            description: 'Realistic indoor PM2.5 reduction percentage between 10 and 75.',
          },
          mechanism: { type: Type.STRING },
          directImpact: { type: Type.STRING },
          safetyNote: { type: Type.STRING },
        },
        required: [
          'id',
          'title',
          'steps',
          'costTier',
          'indoorPm25DropPct',
          'mechanism',
          'directImpact',
          'safetyNote',
        ],
      },
    },
    alternatives: {
      type: Type.ARRAY,
      description: 'Exactly 4 sustainable lifestyle alternatives tailored to their heating, commute, cooking, and neighborhood.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          currentHabit: { type: Type.STRING },
          sustainableSwap: { type: Type.STRING },
          category: {
            type: Type.STRING,
            description: 'One of: heating, mobility, cooking, community',
          },
          weeklyCo2SavedKg: { type: Type.NUMBER },
          localPm25Impact: { type: Type.STRING },
          householdImpact: { type: Type.STRING },
          communityMultiplierNote: { type: Type.STRING },
          effortLevel: {
            type: Type.STRING,
            description: 'One of: Immediate, This Week, Seasonal Upgrade',
          },
        },
        required: [
          'id',
          'currentHabit',
          'sustainableSwap',
          'category',
          'weeklyCo2SavedKg',
          'localPm25Impact',
          'householdImpact',
          'communityMultiplierNote',
          'effortLevel',
        ],
      },
    },
    communityInitiatives: {
      type: Type.ARRAY,
      description: 'Exactly 3 actionable neighborhood, school, or building-level community initiatives.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          participantsNeeded: { type: Type.STRING },
          actionSteps: { type: Type.STRING },
          collectiveImpact: { type: Type.STRING },
        },
        required: ['id', 'title', 'participantsNeeded', 'actionSteps', 'collectiveImpact'],
      },
    },
  },
  required: [
    'locationSummary',
    'smogDynamicsExplanation',
    'routines',
    'indoorHacks',
    'alternatives',
    'communityInitiatives',
  ],
};

function normalizePlan(raw: SmogActionPlan): SmogActionPlan {
  const validCostTiers = new Set(['Free', 'Under $30', '$30–$150']);
  const validFocus = new Set(['exposure_shield', 'low_emission', 'community_action']);
  const validCats = new Set(['heating', 'mobility', 'cooking', 'community']);
  const validEfforts = new Set(['Immediate', 'This Week', 'Seasonal Upgrade']);

  return {
    locationSummary: raw.locationSummary || '',
    smogDynamicsExplanation: raw.smogDynamicsExplanation || '',
    routines: (raw.routines ?? []).slice(0, 6).map((r, idx) => ({
      ...r,
      id: r.id || `routine-${idx + 1}`,
      pm25ReductionPct: Math.max(0, Math.min(75, Number(r.pm25ReductionPct) || 12)),
      weeklyCo2SavedKg: Math.max(0, Math.min(120, Number(r.weeklyCo2SavedKg) || 0)),
      emissionFocus: validFocus.has(r.emissionFocus) ? r.emissionFocus : 'exposure_shield',
    })),
    indoorHacks: (raw.indoorHacks ?? []).slice(0, 6).map((h, idx) => ({
      ...h,
      id: h.id || `hack-${idx + 1}`,
      costTier: validCostTiers.has(h.costTier)
        ? h.costTier
        : idx === 0
          ? 'Free'
          : idx === 1
            ? 'Under $30'
            : '$30–$150',
      indoorPm25DropPct: Math.max(5, Math.min(80, Number(h.indoorPm25DropPct) || 25)),
      steps: Array.isArray(h.steps) ? h.steps.slice(0, 4) : [],
    })),
    alternatives: (raw.alternatives ?? []).slice(0, 6).map((a, idx) => ({
      ...a,
      id: a.id || `alt-${idx + 1}`,
      category: validCats.has(a.category) ? a.category : 'mobility',
      effortLevel: validEfforts.has(a.effortLevel) ? a.effortLevel : 'This Week',
      weeklyCo2SavedKg: Math.max(0, Math.min(200, Number(a.weeklyCo2SavedKg) || 6)),
    })),
    communityInitiatives: (raw.communityInitiatives ?? []).slice(0, 4).map((c, idx) => ({
      ...c,
      id: c.id || `comm-${idx + 1}`,
    })),
  };
}

export async function generateSmogActionPlan(
  profile: HouseholdProfile,
  airQuality: AirQualityReading,
): Promise<SmogActionPlan> {
  const aqiBand = Math.floor(airQuality.usAqi / 25) * 25;
  const cacheKey = JSON.stringify({
    city: airQuality.city.toLowerCase(),
    aqiBand,
    profile,
  });

  const cached = planCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const ai = getGeminiClient();

  const systemInstruction =
    'You are an environmental health engineer and urban air quality advisor helping families and local communities navigate severe winter smog and urban air pollution. ' +
    'Provide grounded, science-backed, practical advice tailored strictly to the provided city, measured air quality metrics, housing, heating, commute, and budget profile. ' +
    'Never recommend unsafe ozone-generating air purifiers or unventilated combustion heaters. Always explain the direct physical, health, and emissions impact of each choice clearly and quantitatively.';

  const userContext = JSON.stringify({
    location: {
      city: airQuality.city,
      country: airQuality.country,
      usAqi: airQuality.usAqi,
      aqiLabel: airQuality.classification.label,
      pm25UgM3: airQuality.pm25,
      pm10UgM3: airQuality.pm10,
      no2UgM3: airQuality.no2,
      inversionRisk: airQuality.inversionRisk,
      bestVentilationWindow: airQuality.bestVentilationWindow,
    },
    householdProfile: profile,
  });

  const prompt =
    `Generate a complete, actionable winter smog plan for this household and community context:\n${userContext}\n` +
    'Ensure routines align with the bestVentilationWindow, indoorHacks include a DIY MERV-13/Corsi-Rosenthal or HEPA clean-air room strategy plus zero-cost source-control steps, alternatives address their exact heatingSource and commuteMode, and communityInitiatives empower neighborhood/school collective action.';

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: PLAN_RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Empty response from Gemini model.');
  }

  const parsed = JSON.parse(rawText) as SmogActionPlan;
  const normalized = normalizePlan(parsed);
  planCache.set(cacheKey, normalized);
  return normalized;
}

const ADVISOR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: 'Clear, empathetic, science-grounded answer (2-4 concise paragraphs or short actionable bullets in plain text).',
    },
    directImpactTakeaway: {
      type: Type.STRING,
      description: 'One crisp sentence explaining the direct health or emission impact of following this advice.',
    },
  },
  required: ['answer', 'directImpactTakeaway'],
};

export async function askSmogAdvisor(
  question: string,
  profile: HouseholdProfile,
  airQuality: AirQualityReading,
  history: Array<Pick<AdvisorMessage, 'role' | 'content'>>,
): Promise<{ answer: string; directImpactTakeaway: string }> {
  const ai = getGeminiClient();

  const systemInstruction =
    'You are ClearWinter Advisor, an environmental health and community sustainability specialist. ' +
    'Answer questions from families and community organizers dealing with winter smog and urban air pollution. ' +
    'Ground every answer in their specific city air quality numbers and household profile. ' +
    'Keep responses concise, practical, and free of medical overreach; explicitly note safety precautions (such as avoiding ozone generators or gas stove unvented cooking).';

  const recentHistory = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Family' : 'Advisor'}: ${m.content.slice(0, 300)}`)
    .join('\n');

  const prompt = [
    `Current Context: ${airQuality.city}, ${airQuality.country} | US AQI ${airQuality.usAqi} (${airQuality.classification.label}) | PM2.5: ${airQuality.pm25} µg/m³ | NO2: ${airQuality.no2} µg/m³ | Inversion risk: ${airQuality.inversionRisk} | Best ventilation window: ${airQuality.bestVentilationWindow}`,
    `Household Profile: ${JSON.stringify(profile)}`,
    recentHistory ? `Recent Conversation:\n${recentHistory}` : '',
    `Question: ${question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: ADVISOR_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Empty response from Gemini model.');
  }

  return JSON.parse(rawText) as { answer: string; directImpactTakeaway: string };
}
