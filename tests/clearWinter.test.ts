import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdoptedImpact,
  calculateUsAqiFromPm25,
  classifyAqi,
  estimateBaselineIndoorPm25,
} from '../src/utils/impactCalculator.ts';
import {
  sanitizePlainText,
  validateAdvisorQuestion,
  validateCityQuery,
  validateCoordinates,
  validateHouseholdProfile,
} from '../src/utils/validation.ts';
import { TtlCache } from '../server/cache.ts';
import { SlidingWindowRateLimiter } from '../server/rateLimiter.ts';
import type { SmogActionPlan } from '../src/types/airQuality.ts';

test('calculateUsAqiFromPm25 computes accurate EPA breakpoints', () => {
  assert.equal(calculateUsAqiFromPm25(0), 0);
  assert.equal(calculateUsAqiFromPm25(9.0), 50);
  assert.equal(calculateUsAqiFromPm25(35.4), 100);
  assert.equal(calculateUsAqiFromPm25(55.4), 150);
  assert.equal(calculateUsAqiFromPm25(150.5), 226);
  assert.equal(calculateUsAqiFromPm25(-5), 0);
  assert.equal(calculateUsAqiFromPm25(600), 500);
});

test('classifyAqi returns explicit labels and advisories for all bands', () => {
  assert.equal(classifyAqi(32).level, 'good');
  assert.equal(classifyAqi(78).level, 'moderate');
  assert.equal(classifyAqi(125).level, 'sensitive');
  assert.equal(classifyAqi(175).level, 'unhealthy');
  assert.equal(classifyAqi(240).level, 'very_unhealthy');
  assert.equal(classifyAqi(360).level, 'hazardous');
});

test('calculateAdoptedImpact applies diminishing returns and community scaling', () => {
  const samplePlan: SmogActionPlan = {
    locationSummary: 'Test summary',
    smogDynamicsExplanation: 'Test explanation',
    routines: [
      {
        id: 'r1',
        timeWindow: '7:30 AM',
        title: 'Delay outdoor walk',
        action: 'Walk at 1 PM instead',
        whyItWorks: 'Dispersion',
        directImpact: 'Lower inhaled dose',
        pm25ReductionPct: 30,
        weeklyCo2SavedKg: 5,
        emissionFocus: 'exposure_shield',
      },
    ],
    indoorHacks: [
      {
        id: 'h1',
        title: 'Corsi-Rosenthal Box',
        steps: ['Tape MERV-13 filters to box fan'],
        costTier: 'Under $30',
        indoorPm25DropPct: 60,
        mechanism: 'CADR filtration',
        directImpact: 'Cuts indoor particulates',
        safetyNote: 'Use UL-listed fan',
      },
    ],
    alternatives: [
      {
        id: 'a1',
        currentHabit: 'Solo car school drop-off',
        sustainableSwap: 'Neighborhood walking school bus',
        category: 'mobility',
        weeklyCo2SavedKg: 12,
        localPm25Impact: 'Reduces tailpipe NO2 near school gates',
        householdImpact: 'Saves fuel and adds light morning activity',
        communityMultiplierNote: 'Eliminates idling queues',
        effortLevel: 'This Week',
      },
    ],
    communityInitiatives: [],
  };

  const baseline = estimateBaselineIndoorPm25(100);
  assert.equal(baseline, 66.5);

  const emptyImpact = calculateAdoptedImpact(new Set(), samplePlan, 100, 50);
  assert.equal(emptyImpact.adoptedCount, 0);
  assert.equal(emptyImpact.projectedIndoorPm25, 66.5);

  const adopted = new Set(['r1', 'h1', 'a1']);
  const impact = calculateAdoptedImpact(adopted, samplePlan, 100, 100);

  // Multiplicative: 1 - (0.7 * 0.4 * 0.92) = 1 - 0.2576 = 74.24% -> 74%
  assert.equal(impact.adoptedCount, 3);
  assert.equal(impact.exposureReductionPct, 74);
  assert.ok(impact.projectedIndoorPm25 < baseline);
  assert.equal(impact.weeklyCo2SavedKg, 17);
  assert.equal(impact.communityWeeklyCo2SavedKg, 1700);
});

test('validation utilities sanitize and reject malformed inputs', () => {
  assert.equal(sanitizePlainText('Delhi\u0000 <script>alert(1)</script>'), 'Delhi script alert(1) /script');

  assert.equal(validateCityQuery('a').valid, false);
  assert.equal(validateCityQuery('Salt Lake City').valid, true);
  assert.equal(validateCityQuery('Kraków').valid, true);

  assert.equal(validateCoordinates(95, 10).valid, false);
  assert.equal(validateCoordinates(28.61, 77.2).valid, true);

  assert.equal(
    validateHouseholdProfile({
      city: 'Delhi',
      householdType: 'family_kids',
      commuteMode: 'car_petrol',
      heatingSource: 'gas_furnace',
      housingType: 'apartment',
      budgetTier: 'low_cost',
    }).valid,
    true,
  );

  assert.equal(
    validateHouseholdProfile({
      city: 'Delhi',
      householdType: 'invalid_role',
    }).valid,
    false,
  );

  assert.equal(validateAdvisorQuestion('hi').valid, false);
  assert.equal(validateAdvisorQuestion('Is MERV 13 safe in a nursery?').valid, true);
});

test('TtlCache evicts oldest entry when maxEntries exceeded', () => {
  const cache = new TtlCache<string>(10_000, 2);
  cache.set('k1', 'v1');
  cache.set('k2', 'v2');
  cache.set('k3', 'v3');

  assert.equal(cache.get('k1'), undefined);
  assert.equal(cache.get('k2'), 'v2');
  assert.equal(cache.get('k3'), 'v3');
});

test('SlidingWindowRateLimiter enforces request ceiling', () => {
  const limiter = new SlidingWindowRateLimiter(10_000, 2);
  assert.equal(limiter.check('1.2.3.4').allowed, true);
  assert.equal(limiter.check('1.2.3.4').allowed, true);
  const third = limiter.check('1.2.3.4');
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds >= 1);
});
