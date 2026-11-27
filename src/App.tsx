import { lazy, Suspense, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useAirQualityApp } from './hooks/useAirQualityApp';
import { Header } from './components/Header';
import { LiveAqiRibbon } from './components/LiveAqiRibbon';
import { PanelSkeleton } from './components/PanelSkeleton';
import { MethodologyDialog } from './components/MethodologyDialog';

const ProfileIntakeWorkspace = lazy(() => import('./components/ProfileIntakeWorkspace'));
const DailyRoutineWorkspace = lazy(() => import('./components/DailyRoutineWorkspace'));
const IndoorLabWorkspace = lazy(() => import('./components/IndoorLabWorkspace'));
const AlternativesSimulatorWorkspace = lazy(() => import('./components/AlternativesSimulatorWorkspace'));
const CommunityBriefingWorkspace = lazy(() => import('./components/CommunityBriefingWorkspace'));

export default function App() {
  const app = useAirQualityApp();
  const [auditOpen, setAuditOpen] = useState<boolean>(false);

  const handleGenerateAndGoToRoutine = () => {
    app.setActiveWorkspace('routine');
    void app.runDailyRoutine();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <Header
        activeTab={app.activeWorkspace}
        onTabChange={app.setActiveWorkspace}
        onOpenAudit={() => setAuditOpen(true)}
      />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 outline-none md:px-6 md:py-8">
        <LiveAqiRibbon
          location={app.location}
          liveData={app.liveData}
          cpcb={app.cpcb}
          profile={app.profile}
          hasHouseholdProfile={app.hasHouseholdProfile}
          protectionScorePct={app.protectionScorePct}
          loading={app.aqiLoading}
          onRefresh={app.refreshAqi}
        />

        {app.aqiError && !app.liveData && (
          <div role="alert" className="border border-red-200 bg-red-50 p-5 text-sm text-red-900">
            <p className="font-semibold">Unable to retrieve live Open-Meteo air quality telemetry</p>
            <p className="mt-1 text-xs">{app.aqiError}</p>
            <button
              type="button"
              onClick={app.refreshAqi}
              className="mt-3 rounded-md bg-red-800 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-900"
            >
              Retry Live Fetch
            </button>
          </div>
        )}

        {!app.liveData || !app.cpcb || !app.ventilation ? (
          <PanelSkeleton />
        ) : (
          <Suspense fallback={<PanelSkeleton />}>
            {app.activeWorkspace === 'intake' && (
              <ProfileIntakeWorkspace
                location={app.location}
                activePresetId={app.activePresetId}
                hasHouseholdProfile={app.hasHouseholdProfile}
                liveData={app.liveData}
                cpcb={app.cpcb}
                profile={app.profile}
                questionsSlot={app.questionsSlot}
                loadingMoreQuestions={app.loadingMoreQuestions}
                answers={app.answers}
                additionalContext={app.additionalContext}
                routineLoading={app.routineSlot.loading}
                onSelectCity={app.selectCity}
                onSelectSampleProfile={app.selectSampleProfile}
                onSyncSetup={app.updateProfile}
                onSaveCustomProfile={app.saveCustomProfile}
                onClearHousehold={app.clearHouseholdProfile}
                onAskQuestions={() => void app.runClarifyingQuestions()}
                onAskMoreQuestions={() => void app.askTwoMoreQuestions()}
                onSetAnswer={app.setAnswer}
                onChangeAdditionalContext={app.setAdditionalContext}
                onGenerateAndGoToRoutine={handleGenerateAndGoToRoutine}
              />
            )}

            {app.activeWorkspace === 'routine' && (
              <DailyRoutineWorkspace
                liveData={app.liveData}
                cpcb={app.cpcb}
                profile={app.profile}
                hasHouseholdProfile={app.hasHouseholdProfile}
                ventilation={app.ventilation}
                routineSlot={app.routineSlot}
                completedBlockIds={app.completedBlockIds}
                protectionScorePct={app.protectionScorePct}
                appliedShockNote={app.appliedShockNote}
                onToggleBlock={app.toggleRoutineBlock}
                onGenerateRoutine={() => void app.runDailyRoutine()}
              />
            )}

            {app.activeWorkspace === 'indoor' && (
              <IndoorLabWorkspace
                liveData={app.liveData}
                cpcb={app.cpcb}
                profile={app.profile}
                hasHouseholdProfile={app.hasHouseholdProfile}
                indoorMeter={app.indoorMeter}
                indoorSlot={app.indoorSlot}
                indoorQuestions={app.indoorQuestions}
                indoorAnswers={app.indoorAnswers}
                loadingMoreIndoorQuestions={app.loadingMoreIndoorQuestions}
                moreIndoorQuestionsError={app.moreIndoorQuestionsError}
                onUpdateProfile={app.updateProfile}
                onSetIndoorAnswer={app.setIndoorAnswer}
                onAskTwoMoreIndoorQuestions={() => void app.askTwoMoreIndoorQuestions()}
                onGenerateProtocol={() => void app.runIndoorProtocol()}
              />
            )}

            {app.activeWorkspace === 'simulator' && (
              <AlternativesSimulatorWorkspace
                liveData={app.liveData}
                cpcb={app.cpcb}
                profile={app.profile}
                selectedSwapIds={app.selectedSwapIds}
                swapTotals={app.swapTotals}
                shockSlot={app.shockSlot}
                appliedShockPatches={app.appliedShockPatches}
                onToggleSwap={app.toggleHabitSwap}
                onUpdateCommuteKm={(km) => app.updateProfile({ commuteDistanceKm: km })}
                onRunSmogShock={(scenario) => void app.runSmogShock(scenario)}
                onApplyShockStrategy={app.applyShockStrategy}
              />
            )}

            {app.activeWorkspace === 'community' && (
              <CommunityBriefingWorkspace
                liveData={app.liveData}
                cpcb={app.cpcb}
                profile={app.profile}
                ventilation={app.ventilation}
                indoorMeter={app.indoorMeter}
                swapTotals={app.swapTotals}
                protectionScorePct={app.protectionScorePct}
                routine={app.routineSlot.data}
                indoorProtocol={app.indoorSlot.data}
                communitySlot={app.communitySlot}
                onGenerateBriefing={() => void app.runCommunityBriefing()}
              />
            )}
          </Suspense>
        )}
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-600 md:px-6">
          <span>
            BreatheWise · Live Open-Meteo Air Quality & Geocoding API · Deterministic Indian CPCB National AQI (0–500)
          </span>
          <span className="font-mono text-[11px] tabular-nums">
            Zero Hallucinated AQI · Gemini Flash Routine & Mitigation Synthesis
          </span>
        </div>
      </footer>

      <MethodologyDialog
        open={auditOpen}
        liveData={app.liveData}
        cpcb={app.cpcb}
        onClose={() => setAuditOpen(false)}
      />
      <Analytics />
    </div>
  );
}
