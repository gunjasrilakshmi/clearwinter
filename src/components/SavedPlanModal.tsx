import { useEffect, useState } from 'react';
import { Check, Copy, Trash2, X } from 'lucide-react';
import type {
  AdoptedImpactSummary,
  AirQualityReading,
  SmogActionPlan,
} from '../types/airQuality.ts';

interface SavedPlanModalProps {
  open: boolean;
  onClose: () => void;
  airQuality: AirQualityReading | null;
  plan: SmogActionPlan | null;
  adoptedIds: ReadonlySet<string>;
  impact: AdoptedImpactSummary;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export function SavedPlanModal({
  open,
  onClose,
  airQuality,
  plan,
  adoptedIds,
  impact,
  onRemoveItem,
  onClearAll,
}: SavedPlanModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const adoptedRoutines = plan?.routines.filter((r) => adoptedIds.has(r.id)) ?? [];
  const adoptedHacks = plan?.indoorHacks.filter((h) => adoptedIds.has(h.id)) ?? [];
  const adoptedAlts = plan?.alternatives.filter((a) => adoptedIds.has(a.id)) ?? [];

  const handleCopySummary = async () => {
    const lines: string[] = [
      `ClearWinter Action Plan — ${airQuality?.city ?? 'Your Location'}`,
      `Current Air: US AQI ${airQuality?.usAqi ?? '--'} (${airQuality?.classification.label ?? ''})`,
      `Projected Indoor Exposure Drop: -${impact.exposureReductionPct}% | Weekly Carbon Avoided: ${impact.weeklyCo2SavedKg} kg CO2e`,
      '',
    ];
    if (adoptedRoutines.length > 0) {
      lines.push('DAILY ROUTINES:');
      adoptedRoutines.forEach((r) => lines.push(`- [${r.timeWindow}] ${r.title}: ${r.action}`));
      lines.push('');
    }
    if (adoptedHacks.length > 0) {
      lines.push('INDOOR AIR QUALITY HACKS:');
      adoptedHacks.forEach((h) => lines.push(`- ${h.title} (${h.costTier}): ${h.directImpact}`));
      lines.push('');
    }
    if (adoptedAlts.length > 0) {
      lines.push('SUSTAINABLE ALTERNATIVES:');
      adoptedAlts.forEach((a) =>
        lines.push(`- Switch "${a.currentHabit}" -> "${a.sustainableSwap}" (${a.weeklyCo2SavedKg} kg CO2e/wk)`),
      );
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-plan-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="saved-plan-title" className="font-display text-lg font-bold text-slate-900">
              Your Saved Household Plan
            </h2>
            <p className="text-xs text-slate-500">
              {airQuality ? `${airQuality.city} · US AQI ${airQuality.usAqi}` : 'Personal checklist'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close saved plan dialog"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-4 text-center">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Actions Saved</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {impact.adoptedCount}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Exposure Drop</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-teal-800">
                -{impact.exposureReductionPct}%
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Weekly CO₂e Saved</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {impact.weeklyCo2SavedKg} kg
              </div>
            </div>
          </div>

          {impact.adoptedCount === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600">
              You have not added any routines, indoor hacks, or swaps yet. Click &ldquo;Add to
              Plan&rdquo; on any recommendation to build your shareable checklist.
            </p>
          ) : (
            <div className="space-y-4">
              {adoptedRoutines.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3.5"
                >
                  <div>
                    <div className="text-xs font-medium text-teal-800">
                      Routine · {r.timeWindow}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900">{r.title}</div>
                    <div className="mt-1 text-xs text-slate-600">{r.directImpact}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(r.id)}
                    aria-label={`Remove ${r.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}

              {adoptedHacks.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3.5"
                >
                  <div>
                    <div className="text-xs font-medium text-teal-800">
                      Indoor Hack · {h.costTier}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900">{h.title}</div>
                    <div className="mt-1 text-xs text-slate-600">{h.directImpact}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(h.id)}
                    aria-label={`Remove ${h.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}

              {adoptedAlts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3.5"
                >
                  <div>
                    <div className="text-xs font-medium text-teal-800">
                      Sustainable Swap · -{a.weeklyCo2SavedKg} kg CO₂e/wk
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900">
                      {a.sustainableSwap}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{a.localPm25Impact}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(a.id)}
                    aria-label={`Remove ${a.sustainableSwap}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClearAll}
            disabled={impact.adoptedCount === 0}
            className="min-h-[40px] rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 disabled:opacity-40 cursor-pointer"
          >
            Clear All
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              disabled={impact.adoptedCount === 0}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-40 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copied Checklist</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
