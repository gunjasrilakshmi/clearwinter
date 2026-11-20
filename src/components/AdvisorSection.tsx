import { useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import type { AdvisorMessage } from '../types/airQuality.ts';

interface AdvisorSectionProps {
  cityName: string;
  aqi: number | null;
  messages: AdvisorMessage[];
  loading: boolean;
  error: string | null;
  onAsk: (question: string) => void;
}

const STARTER_QUESTIONS = [
  'Is it safe to open windows for 10 minutes right now, or should we keep them sealed?',
  'How do we build a safe MERV-13 DIY air cleaner for a child’s bedroom?',
  'What can our school PTA do on severe winter smog mornings?',
  'Does a steam humidifier help or trap particles indoors during smog?',
];

export function AdvisorSection({
  cityName,
  aqi,
  messages,
  loading,
  error,
  onAsk,
}: AdvisorSectionProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length >= 3 && !loading) {
      onAsk(trimmed);
      setQuestion('');
    }
  };

  return (
    <section id="advisor" className="bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold text-teal-800">04. Context-Aware Smog Advisor</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Ask follow-up questions for your home or block
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Every answer is grounded in {cityName}&apos;s current air reading
              {aqi !== null ? ` (US AQI ${aqi})` : ''} and your household setup, explaining the
              direct impact of each option.
            </p>

            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Suggested questions</p>
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => onAsk(q)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs leading-relaxed text-slate-700 transition-colors hover:border-teal-700 hover:bg-white disabled:opacity-60 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
              <div
                aria-live="polite"
                className="max-h-[420px] min-h-[260px] space-y-4 overflow-y-auto pr-1"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
                    <MessageSquare className="h-8 w-8 text-slate-400" aria-hidden="true" />
                    <p className="mt-3 max-w-md text-sm font-medium text-slate-700">
                      Ask about mask fit for kids, gas stove ventilation, DIY Corsi-Rosenthal
                      filters, or neighborhood anti-idling campaigns.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl border p-4 ${
                        msg.role === 'user'
                          ? 'ml-auto max-w-[85%] border-teal-700 bg-teal-700 text-white'
                          : 'mr-auto max-w-[92%] border-slate-200 bg-white text-slate-800'
                      }`}
                    >
                      <div
                        className={`text-[11px] font-medium ${
                          msg.role === 'user' ? 'text-teal-100' : 'text-slate-500'
                        }`}
                      >
                        {msg.role === 'user' ? 'Your Question' : 'ClearWinter Advisor'} ·{' '}
                        {msg.timestamp}
                      </div>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">
                        {msg.content}
                      </p>
                      {msg.directImpactTakeaway && (
                        <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-teal-800">
                          <span className="font-semibold">Direct impact: </span>
                          {msg.directImpactTakeaway}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {loading && (
                  <div className="mr-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700" aria-hidden="true" />
                    <span>Checking local smog factors and formulating guidance…</span>
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-800"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
                <label htmlFor="advisor-input" className="sr-only">
                  Ask the winter smog advisor
                </label>
                <input
                  id="advisor-input"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={400}
                  placeholder="Ask a question about indoor air, commute, or community action…"
                  className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700"
                />
                <button
                  type="submit"
                  disabled={loading || question.trim().length < 3}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
