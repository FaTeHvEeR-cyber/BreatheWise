import type { ClarifyingQuestion } from '../types';

interface IndoorQuestionsPanelProps {
  questions: readonly ClarifyingQuestion[];
  answers: Record<string, string>;
  loadingMore: boolean;
  moreError: string | null;
  onSetAnswer: (questionId: string, value: string) => void;
  onAskTwoMore: () => void;
}

export function IndoorQuestionsPanel({
  questions,
  answers,
  loadingMore,
  moreError,
  onSetAnswer,
  onAskTwoMore,
}: IndoorQuestionsPanelProps) {
  const answeredCount = questions.filter((q) => (answers[q.id] ?? '').trim().length > 0).length;

  return (
    <section
      aria-label="Indoor air quality setup questions"
      className="border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Quick Indoor &amp; Budget-Mode Questions ({questions.length})
          </h2>
          <p className="text-xs text-slate-600">
            Focused on details not already set in your household profile. Answer any below to
            sharpen your room-by-room protocol.
          </p>
        </div>
        <button
          type="button"
          onClick={onAskTwoMore}
          disabled={loadingMore}
          className="rounded-md border border-teal-800 bg-white px-3.5 py-2 text-xs font-semibold text-teal-900 whitespace-nowrap shrink-0 transition-colors hover:bg-teal-50 disabled:opacity-60"
        >
          {loadingMore ? 'Generating 2 More…' : '+ Ask 2 More Questions'}
        </button>
      </div>

      {moreError && (
        <p
          role="status"
          className="mt-3 border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900"
        >
          Gemini live note ({moreError}) — added 2 local indoor setup questions.
        </p>
      )}

      <div className="divide-y divide-slate-200">
        {questions.map((q, idx) => {
          const currentAnswer = answers[q.id] ?? '';
          return (
            <div key={q.id} className="space-y-2.5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {String(idx + 1).padStart(2, '0')}. {q.question}
                </h3>
                <p className="text-xs text-slate-600">{q.reason}</p>
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={`Quick options for ${q.question}`}
              >
                {q.quickOptions.map((option) => {
                  const active = currentAnswer === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSetAnswer(q.id, option)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-teal-800 bg-teal-800 text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <div>
                <label htmlFor={`indoor-custom-${q.id}`} className="sr-only">
                  Custom answer for {q.question}
                </label>
                <input
                  id={`indoor-custom-${q.id}`}
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => onSetAnswer(q.id, e.target.value)}
                  placeholder="Or type a custom answer…"
                  className="w-full max-w-xl rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-slate-100 pt-3 text-xs text-slate-600">
        {answeredCount} of {questions.length} indoor questions answered
      </p>
    </section>
  );
}
