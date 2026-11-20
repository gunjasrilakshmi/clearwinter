import { useState } from 'react';
import { ArrowRight, Check, Plus, Users } from 'lucide-react';
import type {
  AdoptedImpactSummary,
  SmogActionPlan,
} from '../types/airQuality.ts';

interface ImpactAlternativesSectionProps {
  plan: SmogActionPlan | null;
  loading: boolean;
  adoptedIds: ReadonlySet<string>;
  impact: AdoptedImpactSummary;
  communityHouseholds: number;
  onCommunityHouseholdsChange: (count: number) => void;
  onToggleAdopt: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  heating: 'Home Heating',
  mobility: 'Mobility & Commute',
  cooking: 'Clean Cooking',
  community: 'Neighborhood',
};

export function ImpactAlternativesSection({
  plan,
  loading,
  adoptedIds,
  impact,
  communityHouseholds,
  onCommunityHouseholdsChange,
  onToggleAdopt,
}: ImpactAlternativesSectionProps) {
  const [commImgError, setCommImgError] = useState(false);

  return (
    <section id="alternatives" className="border-b border-slate-200 bg-slate-50 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold text-teal-800">
            03. Sustainable Alternatives &amp; Direct Impact
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
            See how household swaps add up across your street
          </h2>
        </div>

        {/* Live Choice Impact Simulator */}
        <div
          aria-live="polite"
          className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Your Choice Impact Simulator
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {impact.adoptedCount > 0
                  ? `Calculating cumulative effect of ${impact.adoptedCount} adopted actions using diminishing-returns indoor filtration math.`
                  : 'Toggle any routine, indoor hack, or sustainable swap to measure your direct health and emissions impact.'}
              </p>
            </div>

            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <label htmlFor="community-scale-slider">Neighborhood Scale</label>
                <span className="font-mono tabular-nums text-teal-800">
                  {communityHouseholds} {communityHouseholds === 1 ? 'household' : 'households'}
                </span>
              </div>
              <input
                id="community-scale-slider"
                type="range"
                min={1}
                max={500}
                step={5}
                value={communityHouseholds}
                onChange={(e) => onCommunityHouseholdsChange(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-teal-700"
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs font-medium text-slate-500">Projected Indoor PM2.5</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {impact.projectedIndoorPm25}
                </span>
                <span className="font-mono text-xs text-slate-500">µg/m³</span>
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-slate-600">
                Unmitigated baseline: {impact.baselineIndoorPm25} µg/m³
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs font-medium text-slate-500">Inhaled Exposure Drop</div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-semibold tabular-nums text-teal-800">
                  -{impact.exposureReductionPct}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Estimated fine-particle reduction at home
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs font-medium text-slate-500">Your Household Avoided</div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {impact.weeklyCo2SavedKg}
                </span>
                <span className="font-mono text-xs text-slate-500">kg CO₂e/wk</span>
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-slate-600">
                {impact.annualCo2SavedKg} kg CO₂e/year
              </p>
            </div>

            <div className="rounded-lg bg-teal-50/70 p-4">
              <div className="text-xs font-medium text-teal-900">
                Community Impact ({communityHouseholds} homes)
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-semibold tabular-nums text-teal-900">
                  {impact.communityAnnualCo2SavedTons}
                </span>
                <span className="font-mono text-xs text-teal-800">metric tons/yr</span>
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-teal-800">
                {impact.communityWeeklyCo2SavedKg} kg CO₂e avoided weekly
              </p>
            </div>
          </div>
        </div>

        {/* Sustainable Swaps Grid */}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : plan ? (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {plan.alternatives.map((alt) => {
              const isAdopted = adoptedIds.has(alt.id);
              return (
                <article
                  key={alt.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-6 transition-colors ${
                    isAdopted ? 'border-teal-700' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {CATEGORY_LABELS[alt.category] ?? alt.category}
                      </span>
                      <span>{alt.effortLevel}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3.5 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div>
                        <span className="block text-[11px] font-medium text-slate-500">
                          Current Habit
                        </span>
                        <span className="text-slate-700">{alt.currentHabit}</span>
                      </div>
                      <ArrowRight
                        className="hidden h-4 w-4 text-teal-700 sm:block"
                        aria-hidden="true"
                      />
                      <div>
                        <span className="block text-[11px] font-medium text-teal-800">
                          Lower-Emission Alternative
                        </span>
                        <span className="font-semibold text-slate-900">{alt.sustainableSwap}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Household impact: </span>
                        {alt.householdImpact}
                      </p>
                      <p>
                        <span className="font-semibold text-teal-800">Local smog impact: </span>
                        {alt.localPm25Impact}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Community effect: </span>
                        {alt.communityMultiplierNote}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="font-mono text-xs tabular-nums text-slate-600">
                      Saves {alt.weeklyCo2SavedKg} kg CO₂e/week
                    </span>

                    <button
                      type="button"
                      aria-pressed={isAdopted}
                      onClick={() => onToggleAdopt(alt.id)}
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isAdopted
                          ? 'bg-teal-700 text-white hover:bg-teal-800'
                          : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {isAdopted ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Swapped</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Adopt Swap</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {/* Community Collective Playbook */}
        {plan && plan.communityInitiatives.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-8 rounded-xl border border-slate-200 bg-white p-6 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-5">
              <div className="relative h-56 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-64 lg:h-full">
                {!commImgError ? (
                  <img
                    src="/src/assets/images/community_clean_commute_1795168234656.jpg"
                    alt="Parents and children walking together in winter along a calm neighborhood sidewalk"
                    referrerPolicy="no-referrer"
                    onError={() => setCommImgError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-6 text-center">
                    <Users className="h-10 w-10 text-teal-700" aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Neighborhood Clean-Air Action
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center lg:col-span-7">
              <p className="text-xs font-semibold text-teal-800">Community Playbook</p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                Collective actions for blocks, PTAs, and apartment buildings
              </h3>

              <div className="mt-4 divide-y divide-slate-200">
                {plan.communityInitiatives.map((item) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                      <span className="text-xs text-slate-500">{item.participantsNeeded}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.actionSteps}</p>
                    <p className="mt-1 text-xs font-medium text-teal-800">
                      Collective impact: {item.collectiveImpact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
