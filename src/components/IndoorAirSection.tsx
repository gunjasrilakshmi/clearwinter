import { useState } from 'react';
import { Check, Home, Plus, ShieldCheck } from 'lucide-react';
import type { IndoorHack, SmogActionPlan } from '../types/airQuality.ts';

interface IndoorAirSectionProps {
  plan: SmogActionPlan | null;
  loading: boolean;
  adoptedIds: ReadonlySet<string>;
  onToggleAdopt: (id: string) => void;
}

type CostFilter = 'All' | 'Free' | 'Under $30' | '$30–$150';
const COST_FILTERS: CostFilter[] = ['All', 'Free', 'Under $30', '$30–$150'];

export function IndoorAirSection({
  plan,
  loading,
  adoptedIds,
  onToggleAdopt,
}: IndoorAirSectionProps) {
  const [costFilter, setCostFilter] = useState<CostFilter>('All');
  const [imgError, setImgError] = useState(false);

  const filteredHacks: IndoorHack[] = (plan?.indoorHacks ?? []).filter((hack) =>
    costFilter === 'All' ? true : hack.costTier === costFilter,
  );

  return (
    <section id="indoor-air" className="border-b border-slate-200 bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold text-teal-800">02. Indoor Air Quality Hacks</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Turn your living room into a verified clean-air refuge
            </h2>
          </div>

          <div
            role="group"
            aria-label="Filter indoor hacks by budget"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start md:self-auto"
          >
            {COST_FILTERS.map((tier) => (
              <button
                key={tier}
                type="button"
                aria-pressed={costFilter === tier}
                onClick={() => setCostFilter(tier)}
                className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  costFilter === tier
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-5">
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="relative h-64 sm:h-72 lg:flex-1">
                {!imgError ? (
                  <img
                    src="/src/assets/images/indoor_clean_air_home_1795168234486.jpg"
                    alt="Modern family living room with HEPA air purifier beside a sealed frosted winter window"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-6 text-center">
                    <Home className="h-10 w-10 text-teal-700" aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Clean-Air Zone Setup
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  The Clean-Air Room Principle
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  During multi-day winter inversions, sealing one primary bedroom or living space
                  with continuous MERV-13 or HEPA recirculation cuts inhaled PM2.5 far more
                  effectively than trying to purify an entire drafty floor at once.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
                  />
                ))}
              </div>
            ) : filteredHacks.length > 0 ? (
              <div className="space-y-4">
                {filteredHacks.map((hack) => {
                  const isAdopted = adoptedIds.has(hack.id);
                  return (
                    <article
                      key={hack.id}
                      className={`rounded-xl border bg-white p-5 transition-colors ${
                        isAdopted ? 'border-teal-700' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-800">{hack.costTier}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-teal-800">
                              -{hack.indoorPm25DropPct}% indoor PM2.5
                            </span>
                          </div>
                          <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                            {hack.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          aria-pressed={isAdopted}
                          onClick={() => onToggleAdopt(hack.id)}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isAdopted
                              ? 'bg-teal-700 text-white hover:bg-teal-800'
                              : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {isAdopted ? (
                            <>
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Adopted</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Add Hack</span>
                            </>
                          )}
                        </button>
                      </div>

                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                        {hack.steps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ol>

                      <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                        <p>
                          <span className="font-semibold text-teal-800">Direct impact: </span>
                          {hack.directImpact}
                        </p>
                        <p className="inline-flex items-start gap-1.5 text-slate-600">
                          <ShieldCheck
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
                            aria-hidden="true"
                          />
                          <span>
                            <strong className="font-medium text-slate-700">Safety check:</strong>{' '}
                            {hack.safetyNote}
                          </span>
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-600">
                  No hacks match the <span className="font-medium">{costFilter}</span> filter.
                </p>
                <button
                  type="button"
                  onClick={() => setCostFilter('All')}
                  className="mt-3 min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                >
                  Show All Hacks
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
