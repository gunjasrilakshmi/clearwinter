import { Check, Clock, Plus } from 'lucide-react';
import type { SmogActionPlan } from '../types/airQuality.ts';

interface RoutinesSectionProps {
  plan: SmogActionPlan | null;
  loading: boolean;
  adoptedIds: ReadonlySet<string>;
  onToggleAdopt: (id: string) => void;
}

const FOCUS_LABELS: Record<string, string> = {
  exposure_shield: 'Exposure Reduction',
  low_emission: 'Emission Avoidance',
  community_action: 'Neighborhood Action',
};

export function RoutinesSection({
  plan,
  loading,
  adoptedIds,
  onToggleAdopt,
}: RoutinesSectionProps) {
  return (
    <section id="routines" className="border-b border-slate-200 bg-slate-50 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold text-teal-800">01. Low-Emission Daily Routines</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Time your day around winter air dispersion
            </h2>
          </div>
          <p className="max-w-md text-sm text-slate-600">
            Select routines below to add them to your household checklist and preview real-time
            exposure and carbon savings.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white p-6"
              />
            ))}
          </div>
        ) : plan ? (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Local Air Briefing</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {plan.locationSummary}
                  </p>
                </div>
                <div className="lg:pl-6">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Why Winter Smog Traps Here
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {plan.smogDynamicsExplanation}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              {plan.routines.map((routine) => {
                const isAdopted = adoptedIds.has(routine.id);
                return (
                  <article
                    key={routine.id}
                    className={`flex flex-col justify-between rounded-xl border bg-white p-6 transition-colors ${
                      isAdopted ? 'border-teal-700' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                          <span>{routine.timeWindow}</span>
                        </span>
                        <span>{FOCUS_LABELS[routine.emissionFocus] ?? 'Daily Routine'}</span>
                      </div>

                      <h3 className="mt-2.5 font-display text-lg font-semibold text-slate-900">
                        {routine.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {routine.action}
                      </p>

                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs leading-relaxed text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">Mechanism: </span>
                          {routine.whyItWorks}
                        </p>
                        <p>
                          <span className="font-semibold text-teal-800">Direct impact: </span>
                          {routine.directImpact}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-slate-600">
                        <span>-{routine.pm25ReductionPct}% PM2.5</span>
                        <span aria-hidden="true">·</span>
                        <span>{routine.weeklyCo2SavedKg} kg CO₂e/wk</span>
                      </div>

                      <button
                        type="button"
                        aria-pressed={isAdopted}
                        onClick={() => onToggleAdopt(routine.id)}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isAdopted
                            ? 'bg-teal-700 text-white hover:bg-teal-800'
                            : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {isAdopted ? (
                          <>
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>In Your Plan</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Add to Plan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              Select your city and household profile above to generate a tailored winter smog
              schedule.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
