import { useCallback, useEffect, useState } from 'react';
import { getQuarterKey, sortPeriodsChronologically } from '../domain/scoring.ts';
import { createSampleLedgerState } from '../domain/seedData.ts';
import type {
  CashFlowAllocation,
  Goal,
  GoalStatus,
  LedgerState,
  LifeArea,
  LineItemDefinition,
  LineItemEntry,
  Period,
  SuggestedAction,
} from '../domain/types.ts';

const STORAGE_KEY = 'life-statements-ledger-v1';

function loadInitialState(): LedgerState {
  if (typeof window === 'undefined') {
    return createSampleLedgerState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSampleLedgerState();
    const parsed = JSON.parse(raw) as LedgerState;
    if (
      parsed &&
      Array.isArray(parsed.areas) &&
      Array.isArray(parsed.lineItems) &&
      Array.isArray(parsed.periods)
    ) {
      return parsed;
    }
  } catch {
    // Fall back gracefully to sample data
  }
  return createSampleLedgerState();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getMonthLabel(year: number, month: number): string {
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${names[(month - 1) % 12] ?? 'Month'} ${year}`;
}

export function useLedgerStore() {
  const [state, setState] = useState<LedgerState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors silently
    }
  }, [state]);

  // --- Life Areas ---
  const addArea = useCallback((name: string, description: string, weight: number) => {
    const id = makeId('area');
    setState((prev) => {
      const nextOrder = prev.areas.reduce((m, a) => Math.max(m, a.order), 0) + 1;
      const newArea: LifeArea = {
        id,
        name: name.trim(),
        description: description.trim(),
        weight: Math.min(5, Math.max(1, Math.round(weight))),
        order: nextOrder,
        archived: false,
      };
      return { ...prev, isSampleData: false, areas: [...prev.areas, newArea] };
    });
    return id;
  }, []);

  const updateArea = useCallback(
    (areaId: string, patch: Partial<Pick<LifeArea, 'name' | 'description' | 'weight' | 'archived'>>) => {
      setState((prev) => ({
        ...prev,
        isSampleData: false,
        areas: prev.areas.map((a) => (a.id === areaId ? { ...a, ...patch } : a)),
      }));
    },
    []
  );

  // --- Line Items & Entries ---
  const upsertLineItem = useCallback(
    (
      definitionInput: Omit<LineItemDefinition, 'id' | 'archived'> & { id?: string },
      periodId: string,
      entryInput: { value: number; target: number; weight: number; note: string }
    ) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const isEdit = Boolean(definitionInput.id);
        const itemId = definitionInput.id ?? makeId('item');

        const nextLineItems = isEdit
          ? prev.lineItems.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    ...definitionInput,
                    id: itemId,
                    archived: false,
                  }
                : item
            )
          : [
              ...prev.lineItems,
              {
                ...definitionInput,
                id: itemId,
                archived: false,
              },
            ];

        const existingEntryIdx = prev.entries.findIndex(
          (e) => e.periodId === periodId && e.lineItemId === itemId
        );

        let nextEntries: LineItemEntry[];
        if (existingEntryIdx >= 0) {
          nextEntries = prev.entries.map((e, idx) =>
            idx === existingEntryIdx
              ? {
                  ...e,
                  value: entryInput.value,
                  target: entryInput.target,
                  weight: entryInput.weight,
                  note: entryInput.note,
                  updatedAt: now,
                }
              : e
          );
        } else {
          nextEntries = [
            ...prev.entries,
            {
              id: makeId('entry'),
              periodId,
              lineItemId: itemId,
              value: entryInput.value,
              target: entryInput.target,
              weight: entryInput.weight,
              note: entryInput.note,
              updatedAt: now,
            },
          ];
        }

        return {
          ...prev,
          isSampleData: false,
          lineItems: nextLineItems,
          entries: nextEntries,
        };
      });
    },
    []
  );

  const archiveLineItem = useCallback((lineItemId: string) => {
    setState((prev) => ({
      ...prev,
      isSampleData: false,
      lineItems: prev.lineItems.map((i) =>
        i.id === lineItemId ? { ...i, archived: true } : i
      ),
    }));
  }, []);

  const updateEntry = useCallback(
    (
      periodId: string,
      lineItemId: string,
      patch: Partial<Pick<LineItemEntry, 'value' | 'target' | 'weight' | 'note'>>
    ) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const idx = prev.entries.findIndex(
          (e) => e.periodId === periodId && e.lineItemId === lineItemId
        );
        if (idx >= 0) {
          return {
            ...prev,
            isSampleData: false,
            entries: prev.entries.map((e, i) =>
              i === idx ? { ...e, ...patch, updatedAt: now } : e
            ),
          };
        }
        const def = prev.lineItems.find((d) => d.id === lineItemId);
        if (!def) return prev;
        const created: LineItemEntry = {
          id: makeId('entry'),
          periodId,
          lineItemId,
          value: patch.value ?? (def.valueType === 'qualitative' ? 5 : 0),
          target: patch.target ?? def.defaultTarget,
          weight: patch.weight ?? def.defaultWeight,
          note: patch.note ?? '',
          updatedAt: now,
        };
        return {
          ...prev,
          isSampleData: false,
          entries: [...prev.entries, created],
        };
      });
    },
    []
  );

  // --- Cash Flow Allocations ---
  const upsertCashFlow = useCallback(
    (
      periodId: string,
      areaId: string,
      patch: Partial<
        Pick<
          CashFlowAllocation,
          | 'intendedHours'
          | 'actualHours'
          | 'assetHours'
          | 'liabilityHours'
          | 'recoveryHours'
          | 'strainHours'
          | 'energyNet'
          | 'note'
        >
      >
    ) => {
      setState((prev) => {
        const idx = prev.cashFlows.findIndex(
          (c) => c.periodId === periodId && c.areaId === areaId
        );
        if (idx >= 0) {
          return {
            ...prev,
            isSampleData: false,
            cashFlows: prev.cashFlows.map((c, i) =>
              i === idx ? { ...c, ...patch } : c
            ),
          };
        }
        const created: CashFlowAllocation = {
          id: makeId('cf'),
          periodId,
          areaId,
          intendedHours: patch.intendedHours ?? 0,
          actualHours: patch.actualHours ?? 0,
          assetHours: patch.assetHours ?? 0,
          liabilityHours: patch.liabilityHours ?? 0,
          recoveryHours: patch.recoveryHours ?? 0,
          strainHours: patch.strainHours ?? 0,
          energyNet: patch.energyNet ?? 0,
          note: patch.note ?? '',
        };
        return {
          ...prev,
          isSampleData: false,
          cashFlows: [...prev.cashFlows, created],
        };
      });
    },
    []
  );

  // --- Guided Periodic Review Commit ---
  const commitPeriodicReview = useCallback(
    (payload: {
      year: number;
      month: number;
      summaryNote: string;
      entries: Array<{
        lineItemId: string;
        value: number;
        target: number;
        weight: number;
        note: string;
      }>;
      cashFlows: Array<{
        areaId: string;
        intendedHours: number;
        actualHours: number;
        assetHours: number;
        liabilityHours: number;
        recoveryHours: number;
        strainHours: number;
        energyNet: number;
        note: string;
      }>;
    }): string => {
      const monthStr = String(payload.month).padStart(2, '0');
      const periodId = `${payload.year}-${monthStr}`;
      const now = new Date().toISOString();

      setState((prev) => {
        const existingPeriod = prev.periods.find((p) => p.id === periodId);
        const periodObj: Period = existingPeriod
          ? {
              ...existingPeriod,
              status: 'completed',
              summaryNote: payload.summaryNote,
              completedAt: now,
            }
          : {
              id: periodId,
              label: getMonthLabel(payload.year, payload.month),
              year: payload.year,
              month: payload.month,
              quarter: getQuarterKey(payload.year, payload.month),
              status: 'completed',
              summaryNote: payload.summaryNote,
              createdAt: now,
              completedAt: now,
            };

        const nextPeriods = existingPeriod
          ? prev.periods.map((p) => (p.id === periodId ? periodObj : p))
          : sortPeriodsChronologically([...prev.periods, periodObj]);

        const remainingEntries = prev.entries.filter((e) => e.periodId !== periodId);
        const newEntries: LineItemEntry[] = payload.entries.map((item) => ({
          id: makeId('entry'),
          periodId,
          lineItemId: item.lineItemId,
          value: item.value,
          target: item.target,
          weight: item.weight,
          note: item.note,
          updatedAt: now,
        }));

        const remainingCashFlows = prev.cashFlows.filter((c) => c.periodId !== periodId);
        const newCashFlows: CashFlowAllocation[] = payload.cashFlows.map((cf) => ({
          id: makeId('cf'),
          periodId,
          areaId: cf.areaId,
          intendedHours: cf.intendedHours,
          actualHours: cf.actualHours,
          assetHours: cf.assetHours,
          liabilityHours: cf.liabilityHours,
          recoveryHours: cf.recoveryHours,
          strainHours: cf.strainHours,
          energyNet: cf.energyNet,
          note: cf.note,
        }));

        return {
          ...prev,
          isSampleData: false,
          periods: nextPeriods,
          entries: [...remainingEntries, ...newEntries],
          cashFlows: [...remainingCashFlows, ...newCashFlows],
        };
      });

      return periodId;
    },
    []
  );

  // --- Goals & Suggestions ---
  const acceptSuggestionAsGoal = useCallback(
    (suggestion: SuggestedAction, createdPeriodId: string) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const duplicate = prev.goals.some(
          (g) =>
            g.lineItemId === suggestion.lineItemId &&
            g.title.toLowerCase() === suggestion.title.toLowerCase() &&
            g.status !== 'completed'
        );
        if (duplicate) return prev;
        const goal: Goal = {
          id: makeId('goal'),
          areaId: suggestion.areaId,
          lineItemId: suggestion.lineItemId,
          title: suggestion.title,
          actionStep: suggestion.actionStep,
          source: 'suggestion',
          status: 'active',
          createdPeriodId,
          note: suggestion.rationale,
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, isSampleData: false, goals: [goal, ...prev.goals] };
      });
    },
    []
  );

  const addCustomGoal = useCallback(
    (input: {
      areaId: string;
      lineItemId: string;
      title: string;
      actionStep: string;
      createdPeriodId: string;
      note?: string;
    }) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const goal: Goal = {
          id: makeId('goal'),
          areaId: input.areaId,
          lineItemId: input.lineItemId,
          title: input.title.trim(),
          actionStep: input.actionStep.trim(),
          source: 'custom',
          status: 'active',
          createdPeriodId: input.createdPeriodId,
          note: input.note?.trim() ?? '',
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, isSampleData: false, goals: [goal, ...prev.goals] };
      });
    },
    []
  );

  const updateGoalStatus = useCallback((goalId: string, status: GoalStatus, note?: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      isSampleData: false,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? { ...g, status, note: note !== undefined ? note : g.note, updatedAt: now }
          : g
      ),
    }));
  }, []);

  const deleteGoal = useCallback((goalId: string) => {
    setState((prev) => ({
      ...prev,
      isSampleData: false,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
  }, []);

  // --- Onboarding & Data Management ---
  const applyOnboardingSetup = useCallback(
    (payload: {
      areas: LifeArea[];
      lineItems: LineItemDefinition[];
      initialValues: Record<string, number>;
      periodYear: number;
      periodMonth: number;
    }): string => {
      const monthStr = String(payload.periodMonth).padStart(2, '0');
      const periodId = `${payload.periodYear}-${monthStr}`;
      const now = new Date().toISOString();

      const period: Period = {
        id: periodId,
        label: getMonthLabel(payload.periodYear, payload.periodMonth),
        year: payload.periodYear,
        month: payload.periodMonth,
        quarter: getQuarterKey(payload.periodYear, payload.periodMonth),
        status: 'completed',
        summaryNote: 'Initial personal baseline configured during onboarding.',
        createdAt: now,
        completedAt: now,
      };

      const entries: LineItemEntry[] = payload.lineItems.map((item) => ({
        id: makeId('entry'),
        periodId,
        lineItemId: item.id,
        value:
          payload.initialValues[item.id] !== undefined
            ? payload.initialValues[item.id]
            : item.valueType === 'qualitative'
              ? 5
              : item.direction === 'lower_is_better'
                ? item.defaultTarget
                : Math.round(item.defaultTarget * 0.7),
        target: item.defaultTarget,
        weight: item.defaultWeight,
        note: '',
        updatedAt: now,
      }));

      const cashFlows: CashFlowAllocation[] = payload.areas
        .filter((a) => !a.archived)
        .map((area) => ({
          id: makeId('cf'),
          periodId,
          areaId: area.id,
          intendedHours: area.id === 'area-career' ? 160 : 16,
          actualHours: area.id === 'area-career' ? 160 : 14,
          assetHours: area.id === 'area-career' ? 100 : 10,
          liabilityHours: area.id === 'area-career' ? 60 : 4,
          recoveryHours: area.id === 'area-career' ? 20 : 10,
          strainHours: area.id === 'area-career' ? 90 : 4,
          energyNet: 1,
          note: '',
        }));

      setState({
        version: 1,
        isSampleData: false,
        hasCompletedOnboarding: true,
        areas: payload.areas,
        lineItems: payload.lineItems,
        periods: [period],
        entries,
        cashFlows,
        goals: [],
      });

      return periodId;
    },
    []
  );

  const restoreSampleData = useCallback(() => {
    setState(createSampleLedgerState());
  }, []);

  const importFullState = useCallback((nextState: LedgerState) => {
    setState(nextState);
  }, []);

  return {
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
  };
}
