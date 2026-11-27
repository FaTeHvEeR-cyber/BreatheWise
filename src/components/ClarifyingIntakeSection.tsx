import type { ClarifyingQuestionsResponse } from '../types';
import type { AsyncSlot } from '../hooks/useAirQualityApp';

interface ClarifyingIntakeSectionProps {
  cityName: string;
  cpcbAqi: number;
  hasHouseholdProfile: boolean;
  householdName: string;
  questionsSlot: AsyncSlot<ClarifyingQuestionsResponse>;
  loadingMoreQuestions: boolean;
  answers: Record<string, string>;
  additionalContext: string;
  routineLoading: boolean;
  onAskQuestions: () => void;
  onAskMoreQuestions: () => void;
  onSetAnswer: (questionId: string, value: string) => void;
  onChangeAdditionalContext: (value: string) => void;
  onGenerateRoutine: () => void;
}

export function ClarifyingIntakeSection({
  cityName,
  cpcbAqi,
  hasHouseholdProfile,
  householdName,
  questionsSlot,
  loadingMoreQuestions,
  answers,
  additionalContext,
  routineLoading,
  onAskQuestions,
  onAskMoreQuestions,
  onSetAnswer,
  onChangeAdditionalContext,
  onGenerateRoutine,
}: ClarifyingIntakeSectionProps) {
  const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length;

  return (
    <section aria-label="Clarifying intake before planning" className="border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Step 2: Clarifying Intake &amp; Household Notes
          </h2>
          <p className="text-xs text-slate-600">
            Analyze {cityName}’s live CPCB AQI ({cpcbAqi})
            {hasHouseholdProfile && householdName ? ` for ${householdName}` : ''} to ask 3 quick questions, or add your own context below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAskQuestions}
            disabled={questionsSlot.loading || loadingMoreQuestions}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-teal-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {questionsSlot.loading
              ? 'Analyzing Air…'
              : questionsSlot.data
                ? 'Re-Analyze Questions'
                : 'Analyze Air & Ask Clarifying Questions'}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="additional-household-context" className="block text-xs font-medium text-slate-800">
          Additional Household Suggestions, Answers, or Context (Optional)
        </label>
        <textarea
          id="additional-household-context"
          rows={2}
          value={additionalContext}
          onChange={(e) => onChangeAdditionalContext(e.target.value)}
          placeholder="Add any extra household notes, medical needs, work shifts, or suggestions you want factored into the analysis…"
          className="mt-1.5 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          {hasHouseholdProfile && householdName
            ? `If questions below are left unanswered, your plan will align directly to "${householdName}".`
            : 'If no household profile is selected and questions are left unanswered, your plan will provide general city-level guidance.'}
        </p>
      </div>

      {questionsSlot.loading && !questionsSlot.data && (
        <div role="status" className="mt-4 space-y-2 border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-teal-900">
            Streaming live analysis for {cityName} (CPCB AQI {cpcbAqi})…
          </p>
          <div className="h-2.5 w-3/4 animate-pulse bg-slate-200" />
          <div className="h-2.5 w-1/2 animate-pulse bg-slate-200" />
        </div>
      )}

      {questionsSlot.error && (
        <p role="status" className="mt-4 border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          Gemini live note ({questionsSlot.error}) — showing deterministic local intake questions grounded in live Open-Meteo readings.
        </p>
      )}

      {questionsSlot.data && (questionsSlot.data.airContextNote || questionsSlot.data.questions.length > 0) && (
        <div className="mt-5 space-y-5" aria-live="polite">
          {questionsSlot.data.airContextNote && (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-slate-800">
                {questionsSlot.data.airContextNote}
                {questionsSlot.loading && questionsSlot.data.questions.length === 0 && (
                  <span aria-hidden="true" className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-teal-700 align-middle" />
                )}
              </p>
              {!questionsSlot.loading && questionsSlot.data.source && (
                <span className="font-mono text-[11px] text-slate-600">Source: {questionsSlot.data.source}</span>
              )}
            </div>
          )}

          <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {questionsSlot.data.questions.map((q, idx) => {
              const currentAnswer = answers[q.id] ?? '';
              return (
                <div key={q.id} className="space-y-2.5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {String(idx + 1).padStart(2, '0')}. {q.question}
                    </h3>
                    <p className="text-xs text-slate-600">{q.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`Quick options for ${q.question}`}>
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
                    <label htmlFor={`custom-${q.id}`} className="sr-only">
                      Custom answer for {q.question}
                    </label>
                    <input
                      id={`custom-${q.id}`}
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

            {questionsSlot.loading && questionsSlot.data.questions.length < 3 && (
              <div role="status" className="space-y-2 py-4">
                <p className="text-xs font-medium text-teal-900">
                  Loading question {questionsSlot.data.questions.length + 1} of 3…
                </p>
                <div className="h-2.5 w-2/3 animate-pulse bg-slate-200" />
              </div>
            )}
          </div>

          {!questionsSlot.loading && questionsSlot.data.questions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600">
                Want to personalize further? Generate 2 additional follow-up questions.
              </p>
              <button
                type="button"
                onClick={onAskMoreQuestions}
                disabled={loadingMoreQuestions}
                className="rounded-md border border-teal-800 bg-white px-3.5 py-1.5 text-xs font-semibold text-teal-900 whitespace-nowrap transition-colors hover:bg-teal-50 disabled:opacity-60"
              >
                {loadingMoreQuestions ? 'Generating 2 More…' : '+ Ask 2 More Questions'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-600">
          {questionsSlot.data
            ? `${answeredCount} of ${questionsSlot.data.questions.length} questions answered`
            : hasHouseholdProfile && householdName
              ? `Ready to generate routine for: ${householdName}`
              : 'Optional: select or specify a household profile above, or generate general city routine'}
        </span>
        <button
          type="button"
          onClick={onGenerateRoutine}
          disabled={routineLoading}
          className="rounded-md bg-teal-800 px-5 py-2.5 text-sm font-medium text-white whitespace-nowrap hover:bg-teal-900 disabled:opacity-60"
        >
          {routineLoading ? 'Generating Daily Routine…' : 'Generate Personalized Daily Routine →'}
        </button>
      </div>
    </section>
  );
}
