import { useEffect, useMemo, useState } from 'react';
import { AreaDetailView } from './components/AreaDetailView.tsx';
import { BalanceSheetView } from './components/BalanceSheetView.tsx';
import { CashFlowView } from './components/CashFlowView.tsx';
import { GoalsSuggestionsView } from './components/GoalsSuggestionsView.tsx';
import { IncomeStatementView } from './components/IncomeStatementView.tsx';
import { LedgerToolbar, type PeriodCadence } from './components/LedgerToolbar.tsx';
import { LineItemModal } from './components/LineItemModal.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { PeriodicReviewModal } from './components/PeriodicReviewModal.tsx';
import { PrintLedgerView } from './components/PrintLedgerView.tsx';
import { ScoreBreakdownModal } from './components/ScoreBreakdownModal.tsx';
import { TopBar, type PrimaryTab } from './components/TopBar.tsx';
import { TrendsAnalysisView } from './components/TrendsAnalysisView.tsx';
import {
  downloadLedgerJsonBackup,
  downloadPeriodCsv,
  parseAndValidateLedgerBackup,
} from './domain/export.ts';
import {
  computeAnalysisFlags,
  computeMonthlyTrends,
  computePeriodSummary,
  computeQuarterlyRollup,
  computeQuarterlyTrends,
  getAvailableQuarters,
  sortPeriodsChronologically,
} from './domain/scoring.ts';
import { generateOfflineSuggestions } from './domain/suggestions.ts';
import type {
  LineItemDefinition,
  LineItemEntry,
  ScoreExplanation,
  StatementSection,
} from './domain/types.ts';
import { useLedgerStore } from './store/useLedgerStore.ts';

export default function App() {
  const {
    state,
    addArea,
    updateArea,
    upsertLineItem,
    archiveLineItem,
    updateEntry,
    upsertCashFlow,
    commitPeriodicReview,
    acceptSuggestionAsGoal,
    addCustomGoal,
    updateGoalStatus,
    deleteGoal,
    applyOnboardingSetup,
    restoreSampleData,
    importFullState,
  } = useLedgerStore();

  const orderedPeriods = useMemo(
    () => sortPeriodsChronologically(state.periods),
    [state.periods]
  );
  const availableQuarters = useMemo(
    () => getAvailableQuarters(state.periods),
    [state.periods]
  );

  const [activeTab, setActiveTab] = useState<PrimaryTab>('balance_sheet');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [cadence, setCadence] = useState<PeriodCadence>('monthly');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    () => orderedPeriods[orderedPeriods.length - 1]?.id ?? ''
  );
  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    () => availableQuarters[availableQuarters.length - 1] ?? ''
  );

  // Modals & notifications
  const [scoreExplanation, setScoreExplanation] = useState<ScoreExplanation | null>(null);
  const [lineItemModalState, setLineItemModalState] = useState<{
    open: boolean;
    areaId?: string;
    section?: StatementSection;
    editingItem?: { definition: LineItemDefinition; entry?: LineItemEntry } | null;
  }>({ open: false });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Keep selectedPeriodId / selectedQuarter valid if state is reset or imported
  useEffect(() => {
    if (
      orderedPeriods.length > 0 &&
      !orderedPeriods.some((p) => p.id === selectedPeriodId)
    ) {
      setSelectedPeriodId(orderedPeriods[orderedPeriods.length - 1].id);
    }
  }, [orderedPeriods, selectedPeriodId]);

  useEffect(() => {
    if (
      availableQuarters.length > 0 &&
      !availableQuarters.includes(selectedQuarter)
    ) {
      setSelectedQuarter(availableQuarters[availableQuarters.length - 1]);
    }
  }, [availableQuarters, selectedQuarter]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((curr) => (curr === msg ? null : curr));
    }, 3600);
  };

  // Compute current & previous summaries based on cadence
  const activePeriodId =
    selectedPeriodId || orderedPeriods[orderedPeriods.length - 1]?.id || '';
  const activeQuarter =
    selectedQuarter || availableQuarters[availableQuarters.length - 1] || '';

  const currentSummary = useMemo(() => {
    if (cadence === 'quarterly' && activeQuarter) {
      return computeQuarterlyRollup(state, activeQuarter);
    }
    return computePeriodSummary(state, activePeriodId);
  }, [state, cadence, activePeriodId, activeQuarter]);

  const previousSummary = useMemo(() => {
    if (cadence === 'quarterly') {
      const idx = availableQuarters.indexOf(activeQuarter);
      if (idx > 0) {
        return computeQuarterlyRollup(state, availableQuarters[idx - 1]);
      }
      return null;
    }
    const idx = orderedPeriods.findIndex((p) => p.id === activePeriodId);
    if (idx > 0) {
      return computePeriodSummary(state, orderedPeriods[idx - 1].id);
    }
    return null;
  }, [state, cadence, availableQuarters, activeQuarter, orderedPeriods, activePeriodId]);

  const activeTrends = useMemo(() => {
    return cadence === 'quarterly'
      ? computeQuarterlyTrends(state)
      : computeMonthlyTrends(state);
  }, [state, cadence]);

  const analysisFlags = useMemo(
    () => computeAnalysisFlags(state, currentSummary, previousSummary),
    [state, currentSummary, previousSummary]
  );

  const suggestionGroups = useMemo(
    () => generateOfflineSuggestions(currentSummary, state.goals),
    [currentSummary, state.goals]
  );

  const currentPeriodObj = orderedPeriods.find((p) => p.id === activePeriodId);

  const handleSelectTab = (tab: PrimaryTab) => {
    setSelectedAreaId(null);
    setActiveTab(tab);
  };

  const handleOpenAddLineItem = (areaId?: string, section: StatementSection = 'asset') => {
    setLineItemModalState({
      open: true,
      areaId,
      section,
      editingItem: null,
    });
  };

  const handleOpenEditLineItem = (definition: LineItemDefinition, entry?: LineItemEntry) => {
    setLineItemModalState({
      open: true,
      areaId: definition.areaId,
      section: definition.section,
      editingItem: { definition, entry },
    });
  };

  const handleExportCsv = () => {
    downloadPeriodCsv(currentSummary);
    showNotice(`Downloaded CSV statement for ${currentSummary.label}.`);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleExportJson = () => {
    downloadLedgerJsonBackup(state);
    showNotice('Downloaded full local JSON backup.');
  };

  const handleImportJson = (raw: string) => {
    try {
      const next = parseAndValidateLedgerBackup(raw);
      importFullState(next);
      setSelectedAreaId(null);
      showNotice('Restored ledger backup successfully.');
    } catch {
      showNotice('Could not read that backup file. Please select a valid Life Statements JSON.');
    }
  };

  const handleRestoreSample = () => {
    restoreSampleData();
    setSelectedAreaId(null);
    setCadence('monthly');
    showNotice('Loaded 4-month sample ledger (August–November 2026).');
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917] flex flex-col">
      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onStartReview={() => setReviewOpen(true)}
      />

      <LedgerToolbar
        cadence={cadence}
        onChangeCadence={setCadence}
        periods={orderedPeriods}
        selectedPeriodId={activePeriodId}
        onSelectPeriodId={setSelectedPeriodId}
        quarters={availableQuarters}
        selectedQuarter={activeQuarter}
        onSelectQuarter={setSelectedQuarter}
        isSampleData={state.isSampleData}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onRestoreSample={handleRestoreSample}
      />

      {/* Quiet Inline Notice */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="no-print border-b border-[#1B4332]/25 bg-[#ECF2EE] px-5 py-2.5 text-center text-xs font-medium text-[#1B4332]"
        >
          {notice}
        </div>
      )}

      {/* Main Content Container */}
      <main className="no-print mx-auto w-full max-w-[1280px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        {selectedAreaId ? (
          <AreaDetailView
            areaId={selectedAreaId}
            summary={currentSummary}
            trends={activeTrends}
            goals={state.goals}
            isQuarterly={cadence === 'quarterly'}
            onBack={() => setSelectedAreaId(null)}
            onInspectScore={setScoreExplanation}
            onAddLineItem={(areaId, section) => handleOpenAddLineItem(areaId, section)}
            onEditLineItem={handleOpenEditLineItem}
            onQuickUpdateEntry={(lineItemId, value) =>
              updateEntry(activePeriodId, lineItemId, { value })
            }
            onUpdateArea={updateArea}
            onUpdateGoalStatus={updateGoalStatus}
          />
        ) : activeTab === 'balance_sheet' ? (
          <BalanceSheetView
            summary={currentSummary}
            previousSummary={previousSummary}
            periodNote={currentPeriodObj?.summaryNote}
            isQuarterly={cadence === 'quarterly'}
            isSampleData={state.isSampleData}
            onInspectScore={setScoreExplanation}
            onSelectArea={(id) => setSelectedAreaId(id)}
            onAddLineItem={handleOpenAddLineItem}
            onEditLineItem={handleOpenEditLineItem}
            onAddArea={(name, description, weight) => {
              addArea(name, description, weight);
              showNotice(`Added life area "${name}".`);
            }}
            onOpenOnboarding={() => setOnboardingOpen(true)}
          />
        ) : activeTab === 'income' ? (
          <IncomeStatementView
            summary={currentSummary}
            isQuarterly={cadence === 'quarterly'}
            onInspectScore={setScoreExplanation}
            onAddLineItem={handleOpenAddLineItem}
            onEditLineItem={handleOpenEditLineItem}
            onQuickUpdateEntry={(lineItemId, value) =>
              updateEntry(activePeriodId, lineItemId, { value })
            }
          />
        ) : activeTab === 'cash_flow' ? (
          <CashFlowView
            summary={currentSummary}
            isQuarterly={cadence === 'quarterly'}
            onInspectScore={setScoreExplanation}
            onUpdateCashFlow={(areaId, patch) =>
              upsertCashFlow(activePeriodId, areaId, patch)
            }
          />
        ) : activeTab === 'trends' ? (
          <TrendsAnalysisView
            summary={currentSummary}
            previousSummary={previousSummary}
            trends={activeTrends}
            flags={analysisFlags}
            isQuarterly={cadence === 'quarterly'}
            onSelectArea={(id) => setSelectedAreaId(id)}
            onInspectScore={setScoreExplanation}
          />
        ) : (
          <GoalsSuggestionsView
            periodLabel={currentSummary.label}
            currentPeriodId={activePeriodId}
            areas={state.areas}
            lineItems={state.lineItems}
            suggestionGroups={suggestionGroups}
            goals={state.goals}
            onAcceptSuggestion={(sug) => {
              acceptSuggestionAsGoal(sug, activePeriodId);
              showNotice(`Accepted goal: "${sug.title}".`);
            }}
            onAddCustomGoal={(input) => {
              addCustomGoal({ ...input, createdPeriodId: activePeriodId });
              showNotice(`Added goal: "${input.title}".`);
            }}
            onUpdateGoalStatus={updateGoalStatus}
            onDeleteGoal={deleteGoal}
            onSelectArea={(id) => setSelectedAreaId(id)}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="no-print border-t border-[#E2DCD0] bg-[#FBF9F5]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-[#686259] sm:px-8">
          <span>
            Life Statements · Local-first personal ledger · All data remains on this device
          </span>
          <span>Click any score to inspect its transparent 0–100 formula</span>
        </div>
      </footer>

      {/* Print-Only PDF Archival Statement */}
      <PrintLedgerView
        summary={currentSummary}
        flags={analysisFlags}
        goals={state.goals}
      />

      {/* Modals */}
      <ScoreBreakdownModal
        explanation={scoreExplanation}
        onClose={() => setScoreExplanation(null)}
      />

      {lineItemModalState.open && (
        <LineItemModal
          areas={state.areas}
          periodId={activePeriodId}
          defaultAreaId={lineItemModalState.areaId}
          defaultSection={lineItemModalState.section}
          editingItem={lineItemModalState.editingItem}
          onSave={(def, entry) => {
            upsertLineItem(def, activePeriodId, entry);
            showNotice(`Saved "${def.name}" to ${currentSummary.label}.`);
          }}
          onArchive={(id) => {
            archiveLineItem(id);
            showNotice('Archived line item.');
          }}
          onClose={() => setLineItemModalState({ open: false })}
        />
      )}

      {reviewOpen && (
        <PeriodicReviewModal
          state={state}
          onCommitReview={(payload) => {
            const newId = commitPeriodicReview(payload);
            setCadence('monthly');
            setSelectedPeriodId(newId);
            setSelectedAreaId(null);
            setActiveTab('trends');
            showNotice('Periodic review saved. Here is what moved most since last period.');
          }}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {onboardingOpen && (
        <OnboardingModal
          onApplySetup={(payload) => {
            const periodId = applyOnboardingSetup(payload);
            setCadence('monthly');
            setSelectedPeriodId(periodId);
            setSelectedAreaId(null);
            setActiveTab('balance_sheet');
            showNotice('Your personal Life Statements ledger is ready.');
          }}
          onClose={() => setOnboardingOpen(false)}
        />
      )}
    </div>
  );
}
