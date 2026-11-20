/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AdvisorSection } from './components/AdvisorSection.tsx';
import { Header } from './components/Header.tsx';
import { HeroConditionPanel } from './components/HeroConditionPanel.tsx';
import { ImpactAlternativesSection } from './components/ImpactAlternativesSection.tsx';
import { IndoorAirSection } from './components/IndoorAirSection.tsx';
import { RoutinesSection } from './components/RoutinesSection.tsx';
import { SavedPlanModal } from './components/SavedPlanModal.tsx';
import type {
  AdvisorMessage,
  AirQualityReading,
  HouseholdProfile,
  SmogActionPlan,
} from './types/airQuality.ts';
import { parseApiResponse } from './utils/api.ts';
import { calculateAdoptedImpact } from './utils/impactCalculator.ts';

const DEFAULT_PROFILE: HouseholdProfile = {
  city: 'Delhi',
  householdType: 'family_kids',
  commuteMode: 'car_petrol',
  heatingSource: 'gas_furnace',
  housingType: 'apartment',
  budgetTier: 'low_cost',
};

const STORAGE_KEY_ADOPTED = 'clearwinter_adopted_ids_v1';

export default function App() {
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [airQuality, setAirQuality] = useState<AirQualityReading | null>(null);
  const [plan, setPlan] = useState<SmogActionPlan | null>(null);

  const [loadingAir, setLoadingAir] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [airError, setAirError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const [adoptedIds, setAdoptedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ADOPTED);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((id) => typeof id === 'string'));
        }
      }
    } catch {
      // Ignore storage read errors in restricted contexts
    }
    return new Set();
  });

  const [communityHouseholds, setCommunityHouseholds] = useState(50);
  const [savedModalOpen, setSavedModalOpen] = useState(false);

  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([]);
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ADOPTED, JSON.stringify(Array.from(adoptedIds)));
    } catch {
      // Ignore storage write errors
    }
  }, [adoptedIds]);

  const requestPlanForContext = useCallback(
    async (targetProfile: HouseholdProfile, targetAir: AirQualityReading) => {
      setLoadingPlan(true);
      setPlanError(null);
      try {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: targetProfile, airQuality: targetAir }),
        });
        const data = await parseApiResponse<{
          plan?: SmogActionPlan;
          airQuality?: AirQualityReading;
        }>(res);
        if (!data.plan) {
          throw new Error('Could not generate tailored action plan.');
        }
        setPlan(data.plan);
        if (data.airQuality) {
          setAirQuality(data.airQuality);
        }
        // Pre-select the first routine and first indoor hack when generating a fresh plan if nothing is adopted yet
        setAdoptedIds((prev) => {
          if (prev.size > 0) return prev;
          const initial = new Set<string>();
          if (data.plan?.routines[0]) initial.add(data.plan.routines[0].id);
          if (data.plan?.indoorHacks[0]) initial.add(data.plan.indoorHacks[0].id);
          return initial;
        });
      } catch (err) {
        setPlanError(
          err instanceof Error ? err.message : 'Unable to generate tailored action plan.',
        );
      } finally {
        setLoadingPlan(false);
      }
    },
    [],
  );

  const fetchAirAndPlan = useCallback(
    async (queryUrl: string, nextProfile: HouseholdProfile) => {
      setLoadingAir(true);
      setAirError(null);
      try {
        const res = await fetch(queryUrl);
        const data = await parseApiResponse<AirQualityReading>(res);
        setAirQuality(data);
        const syncedProfile = { ...nextProfile, city: data.city };
        setProfile(syncedProfile);
        await requestPlanForContext(syncedProfile, data);
      } catch (err) {
        setAirError(err instanceof Error ? err.message : 'Unable to fetch air quality.');
      } finally {
        setLoadingAir(false);
      }
    },
    [requestPlanForContext],
  );

  useEffect(() => {
    void fetchAirAndPlan(
      `/api/air-quality?city=${encodeURIComponent(DEFAULT_PROFILE.city)}`,
      DEFAULT_PROFILE,
    );
  }, [fetchAirAndPlan]);

  const handleLookupCity = (city: string) => {
    const nextProfile = { ...profile, city };
    setProfile(nextProfile);
    void fetchAirAndPlan(`/api/air-quality?city=${encodeURIComponent(city)}`, nextProfile);
  };

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      setAirError('Browser geolocation is unavailable. Enter your city name directly.');
      return;
    }
    setLoadingAir(true);
    setAirError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        void fetchAirAndPlan(
          `/api/air-quality?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
          profile,
        );
      },
      () => {
        setLoadingAir(false);
        setAirError('Location permission denied. Enter any city name above to check local smog.');
      },
      { timeout: 8000 },
    );
  };

  const handleGeneratePlan = () => {
    if (airQuality && airQuality.city.toLowerCase() === profile.city.toLowerCase()) {
      void requestPlanForContext(profile, airQuality);
    } else {
      void fetchAirAndPlan(
        `/api/air-quality?city=${encodeURIComponent(profile.city)}`,
        profile,
      );
    }
  };

  const handleToggleAdopt = (id: string) => {
    setAdoptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAskAdvisor = async (question: string) => {
    if (!airQuality) {
      setAdvisorError('Please load air quality data for a city before asking the advisor.');
      return;
    }
    setAdvisorError(null);
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: AdvisorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: nowLabel,
    };

    const nextHistory = [...advisorMessages, userMsg];
    setAdvisorMessages(nextHistory);
    setLoadingAdvisor(true);

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          profile,
          airQuality,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await parseApiResponse<{
        answer?: string;
        directImpactTakeaway?: string;
      }>(res);
      if (!data.answer) {
        throw new Error('Advisor request failed.');
      }
      const replyMsg: AdvisorMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        directImpactTakeaway: data.directImpactTakeaway,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAdvisorMessages((prev) => [...prev, replyMsg]);
    } catch (err) {
      setAdvisorError(err instanceof Error ? err.message : 'Unable to reach advisor right now.');
    } finally {
      setLoadingAdvisor(false);
    }
  };

  const impactSummary = useMemo(
    () =>
      calculateAdoptedImpact(
        adoptedIds,
        plan,
        airQuality?.pm25 ?? 25,
        communityHouseholds,
      ),
    [adoptedIds, plan, airQuality?.pm25, communityHouseholds],
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>

        <Header
          adoptedCount={impactSummary.adoptedCount}
          onOpenSavedPlan={() => setSavedModalOpen(true)}
        />

        <main id="main-content">
          <HeroConditionPanel
            profile={profile}
            airQuality={airQuality}
            loadingAir={loadingAir}
            loadingPlan={loadingPlan}
            airError={airError}
            onProfileChange={setProfile}
            onLookupCity={handleLookupCity}
            onUseGeolocation={handleUseGeolocation}
            onGeneratePlan={handleGeneratePlan}
          />

          {planError && (
            <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900"
              >
                <span>{planError}</span>
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  className="min-h-[38px] rounded-lg border border-red-300 bg-white px-4 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100 cursor-pointer"
                >
                  Retry Plan Generation
                </button>
              </div>
            </div>
          )}

          <RoutinesSection
            plan={plan}
            loading={loadingPlan}
            adoptedIds={adoptedIds}
            onToggleAdopt={handleToggleAdopt}
          />

          <IndoorAirSection
            plan={plan}
            loading={loadingPlan}
            adoptedIds={adoptedIds}
            onToggleAdopt={handleToggleAdopt}
          />

          <ImpactAlternativesSection
            plan={plan}
            loading={loadingPlan}
            adoptedIds={adoptedIds}
            impact={impactSummary}
            communityHouseholds={communityHouseholds}
            onCommunityHouseholdsChange={setCommunityHouseholds}
            onToggleAdopt={handleToggleAdopt}
          />

          <AdvisorSection
            cityName={airQuality?.city ?? profile.city}
            aqi={airQuality?.usAqi ?? null}
            messages={advisorMessages}
            loading={loadingAdvisor}
            error={advisorError}
            onAsk={handleAskAdvisor}
          />
        </main>

        <footer className="border-t border-slate-200 bg-slate-50 py-8">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
            <span>
              ClearWinter · Environmental guidance for families and communities during winter
              smog events
            </span>
            <span>
              Air quality telemetry via Open-Meteo · For medical emergencies consult local health
              services
            </span>
          </div>
        </footer>

        <SavedPlanModal
          open={savedModalOpen}
          onClose={() => setSavedModalOpen(false)}
          airQuality={airQuality}
          plan={plan}
          adoptedIds={adoptedIds}
          impact={impactSummary}
          onRemoveItem={handleToggleAdopt}
          onClearAll={() => setAdoptedIds(new Set())}
        />
      </div>
    </MotionConfig>
  );
}
