import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { formatItemValue, round1, scoreLineItem, sortPeriodsChronologically } from '../domain/scoring.ts';
import { getMonthLabel } from '../store/useLedgerStore.ts';
import type { CashFlowAllocation, LedgerState } from '../domain/types.ts';

interface PeriodicReviewModalProps {
  state: LedgerState;
  onCommitReview: (payload: {
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
  }) => void;
  onClose: () => void;
}

interface DraftEntry {
  value: number;
  target: number;
  weight: number;
  note: string;
  previousValue?: number;
}

interface DraftCashFlow {
  intendedHours: number;
  actualHours: number;
  assetHours: number;
  liabilityHours: number;
  recoveryHours: number;
  strainHours: number;
  energyNet: number;
  note: string;
}

export function PeriodicReviewModal({
  state,
  onCommitReview,
  onClose,
}: PeriodicReviewModalProps) {
  const orderedPeriods = useMemo(() => sortPeriodsChronologically(state.periods), [state.periods]);
  const latestPeriod = orderedPeriods[orderedPeriods.length - 1];

  // Default to the next month after the latest period
  const defaultNextMonth = latestPeriod
    ? latestPeriod.month === 12
      ? { year: latestPeriod.year + 1, month: 1 }
      : { year: latestPeriod.year, month: latestPeriod.month + 1 }
    : { year: 2026, month: 12 };

  const activeAreas = useMemo(
    () => state.areas.filter((a) => !a.archived).sort((a, b) => a.order - b.order),
    [state.areas]
  );

  const activeItems = useMemo(
    () => state.lineItems.filter((i) => !i.archived),
    [state.lineItems]
  );

  const [reviewYear, setReviewYear] = useState(defaultNextMonth.year);
  const [reviewMonth, setReviewMonth] = useState(defaultNextMonth.month);
  // Step 0 = intro/month select, 1..N = each Life Area, N+1 = Closing summary
  const [step, setStep] = useState(0);
  const [summaryNote, setSummaryNote] = useState('');

  // Pre-fill entries from the latest recorded period
  const [draftEntries, setDraftEntries] = useState<Record<string, DraftEntry>>(() => {
    const map: Record<string, DraftEntry> = {};
    const prevByItem = new Map(
      latestPeriod
        ? state.entries
            .filter((e) => e.periodId === latestPeriod.id)
            .map((e) => [e.lineItemId, e])
        : []
    );

    for (const item of activeItems) {
      const prev = prevByItem.get(item.id);
      map[item.id] = {
        value: prev ? prev.value : item.valueType === 'qualitative' ? 5 : item.defaultTarget,
        target: prev ? prev.target : item.defaultTarget,
        weight: prev ? prev.weight : item.defaultWeight,
        note: '',
        previousValue: prev?.value,
      };
    }
    return map;
  });

  // Pre-fill Cash Flow from latest recorded period
  const [draftCashFlows, setDraftCashFlows] = useState<Record<string, DraftCashFlow>>(() => {
    const map: Record<string, DraftCashFlow> = {};
    const prevByArea = new Map<string, CashFlowAllocation>(
      latestPeriod
        ? state.cashFlows
            .filter((c) => c.periodId === latestPeriod.id)
            .map((c) => [c.areaId, c])
        : []
    );

    for (const area of activeAreas) {
      const prev = prevByArea.get(area.id);
      map[area.id] = {
        intendedHours: prev?.intendedHours ?? 16,
        actualHours: prev?.actualHours ?? 14,
        assetHours: prev?.assetHours ?? 10,
        liabilityHours: prev?.liabilityHours ?? 4,
        recoveryHours: prev?.recoveryHours ?? 10,
        strainHours: prev?.strainHours ?? 4,
        energyNet: prev?.energyNet ?? 1,
        note: '',
      };
    }
    return map;
  });

  const totalSteps = activeAreas.length + 2; // Intro + Areas + Summary
  const currentArea = step >= 1 && step <= activeAreas.length ? activeAreas[step - 1] : null;
  const currentAreaItems = currentArea
    ? activeItems.filter((i) => i.areaId === currentArea.id)
    : [];

  const updateDraftEntry = (itemId: string, patch: Partial<DraftEntry>) => {
    setDraftEntries((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  };

  const updateDraftCf = (areaId: string, patch: Partial<DraftCashFlow>) => {
    setDraftCashFlows((prev) => ({
      ...prev,
      [areaId]: { ...prev[areaId], ...patch },
    }));
  };

  const handleComplete = () => {
    onCommitReview({
      year: reviewYear,
      month: reviewMonth,
      summaryNote: summaryNote.trim(),
      entries: activeItems.map((item) => {
        const d = draftEntries[item.id];
        return {
          lineItemId: item.id,
          value: d?.value ?? 0,
          target: d?.target ?? item.defaultTarget,
          weight: d?.weight ?? item.defaultWeight,
          note: d?.note ?? '',
        };
      }),
      cashFlows: activeAreas.map((area) => {
        const c = draftCashFlows[area.id];
        return {
          areaId: area.id,
          intendedHours: c?.intendedHours ?? 0,
          actualHours: c?.actualHours ?? 0,
          assetHours: c?.assetHours ?? 0,
          liabilityHours: c?.liabilityHours ?? 0,
          recoveryHours: c?.recoveryHours ?? 0,
          strainHours: c?.strainHours ?? 0,
          energyNet: c?.energyNet ?? 0,
          note: c?.note ?? '',
        };
      }),
    });
    onClose();
  };

  const progressPercent = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#E2DCD0] bg-[#FBF9F5]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DCD0] px-6 py-4">
          <div>
            <p className="text-xs text-[#686259]">
              Guided Periodic Review · Step {step + 1} of {totalSteps} · ~10 min check-in
            </p>
            <h2 id="review-modal-title" className="mt-0.5 font-serif text-2xl font-medium text-[#1C1917]">
              {step === 0
                ? 'Begin Monthly Check-In'
                : currentArea
                  ? `${currentArea.name} (${getMonthLabel(reviewYear, reviewMonth)})`
                  : `Close ${getMonthLabel(reviewYear, reviewMonth)} Statement`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close periodic review"
            className="rounded-md p-1.5 text-[#686259] hover:bg-[#F4F0E8] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thin reading/progress bar */}
        <div className="h-1 w-full bg-[#ECE6DA]">
          <div
            className="h-full bg-[#1B4332] transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 0 && (
            <div className="max-w-xl space-y-6">
              <p className="text-sm leading-relaxed text-[#44403C]">
                This guided review walks calmly through each of your {activeAreas.length} life areas.
                Values are pre-filled from{' '}
                <strong className="font-semibold text-[#1C1917]">
                  {latestPeriod ? latestPeriod.label : 'your defaults'}
                </strong>{' '}
                so you only need to adjust what actually changed this month.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#44403C]">Month</label>
                  <select
                    value={reviewMonth}
                    onChange={(e) => setReviewMonth(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917]"
                  >
                    {[
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
                    ].map((mName, idx) => (
                      <option key={mName} value={idx + 1}>
                        {mName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#44403C]">Year</label>
                  <input
                    type="number"
                    min={2020}
                    max={2040}
                    value={reviewYear}
                    onChange={(e) => setReviewYear(Number(e.target.value) || 2026)}
                    className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 font-mono text-sm text-[#1C1917]"
                  />
                </div>
              </div>

              <div className="border-t border-[#E2DCD0] pt-4 text-xs text-[#686259]">
                If a period for {getMonthLabel(reviewYear, reviewMonth)} already exists, saving will
                cleanly update that period&apos;s snapshot without affecting other months.
              </div>
            </div>
          )}

          {currentArea && (
            <div className="space-y-6">
              {currentArea.description && (
                <p className="text-sm text-[#44403C]">{currentArea.description}</p>
              )}

              {/* Area Line Items */}
              <div className="space-y-4">
                {currentAreaItems.map((item) => {
                  const d = draftEntries[item.id];
                  if (!d) return null;
                  const scored = scoreLineItem(item, {
                    id: 'preview',
                    periodId: 'draft',
                    lineItemId: item.id,
                    value: d.value,
                    target: d.target,
                    weight: d.weight,
                    note: d.note,
                    updatedAt: '',
                  });

                  return (
                    <div
                      key={item.id}
                      className="border border-[#E2DCD0] bg-[#FBF9F5] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="text-sm font-medium text-[#1C1917]">{item.name}</span>
                          <span className="ml-2 text-xs text-[#686259] capitalize">
                            {item.section} · Target {formatItemValue(d.target, item)}
                            {d.previousValue !== undefined
                              ? ` · Last period: ${formatItemValue(d.previousValue, item)}`
                              : ''}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold tabular-nums text-[#1B4332]">
                          {scored.healthScore} / 100
                        </span>
                      </div>

                      {item.rubric && (
                        <div className="grid grid-cols-1 gap-1.5 bg-[#F4F0E8]/60 p-2.5 text-[11px] text-[#44403C] sm:grid-cols-3">
                          <div>
                            <strong className="font-mono">2:</strong> {item.rubric.anchor2}
                          </div>
                          <div>
                            <strong className="font-mono">5:</strong> {item.rubric.anchor5}
                          </div>
                          <div>
                            <strong className="font-mono">8:</strong> {item.rubric.anchor8}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
                        <div className="sm:col-span-4 flex items-center gap-2">
                          <input
                            type="number"
                            step={item.valueType === 'qualitative' ? '0.5' : 'any'}
                            min={item.valueType === 'qualitative' ? 1 : undefined}
                            max={item.valueType === 'qualitative' ? 10 : undefined}
                            value={d.value}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v)) updateDraftEntry(item.id, { value: v });
                            }}
                            className="w-28 rounded border border-[#E2DCD0] bg-[#FBF9F5] px-2.5 py-1.5 font-mono text-sm tabular-nums text-[#1C1917]"
                          />
                          <span className="font-mono text-xs text-[#686259]">
                            {item.valueType === 'qualitative' ? '/ 10' : item.unit ?? ''}
                          </span>
                        </div>
                        <div className="sm:col-span-8">
                          <input
                            type="text"
                            value={d.note}
                            onChange={(e) => updateDraftEntry(item.id, { note: e.target.value })}
                            placeholder="Optional brief note for this period…"
                            className="w-full rounded border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917] placeholder:text-[#686259]/70"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Area Cash Flow Quick Check */}
              {draftCashFlows[currentArea.id] && (
                <div className="border-t border-[#E2DCD0] pt-5">
                  <h3 className="font-serif text-base font-medium text-[#1C1917]">
                    {currentArea.name} — Time &amp; Energy Cash Flow (Monthly Hours)
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(
                      [
                        ['intendedHours', 'Intended hrs'],
                        ['actualHours', 'Actual hrs'],
                        ['assetHours', 'Asset hrs'],
                        ['liabilityHours', 'Liability hrs'],
                        ['recoveryHours', 'Recovery hrs'],
                        ['strainHours', 'Strain hrs'],
                        ['energyNet', 'Energy (−5..+5)'],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field}>
                        <label className="block text-[11px] text-[#686259]">{label}</label>
                        <input
                          type="number"
                          step={field === 'energyNet' ? '1' : '0.5'}
                          min={field === 'energyNet' ? -5 : 0}
                          max={field === 'energyNet' ? 5 : undefined}
                          value={draftCashFlows[currentArea.id][field]}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v)) {
                              updateDraftCf(currentArea.id, { [field]: v });
                            }
                          }}
                          className="mt-1 w-full rounded border border-[#E2DCD0] bg-[#FBF9F5] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#1C1917]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === activeAreas.length + 1 && (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-[#44403C]">
                Here is a preview of your updated area health scores for{' '}
                <strong className="font-semibold text-[#1C1917]">
                  {getMonthLabel(reviewYear, reviewMonth)}
                </strong>
                . Add a brief reflection note below before closing the period.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {activeAreas.map((area) => {
                  const bsItems = activeItems.filter(
                    (i) => i.areaId === area.id && i.statement === 'balance_sheet'
                  );
                  const scored = bsItems.map((item) => {
                    const d = draftEntries[item.id];
                    return scoreLineItem(item, {
                      id: 'p',
                      periodId: 'draft',
                      lineItemId: item.id,
                      value: d?.value ?? 0,
                      target: d?.target ?? item.defaultTarget,
                      weight: d?.weight ?? item.defaultWeight,
                      note: '',
                      updatedAt: '',
                    });
                  });
                  const totalW = scored.reduce((s, i) => s + i.entry.weight, 0);
                  const areaScore =
                    totalW > 0
                      ? round1(
                          scored.reduce((s, i) => s + i.healthScore * i.entry.weight, 0) / totalW
                        )
                      : 0;
                  return (
                    <div key={area.id} className="border border-[#E2DCD0] bg-[#F4F0E8]/50 p-3">
                      <p className="text-xs text-[#686259]">{area.name}</p>
                      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#1C1917]">
                        {areaScore}
                        <span className="text-xs font-normal text-[#686259]">/100</span>
                      </p>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#44403C]">
                  Period Closing Note (optional)
                </label>
                <textarea
                  rows={3}
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  placeholder="One or two calm sentences summarizing what stood out this month…"
                  className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#686259]/70 focus:border-[#1B4332] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="flex items-center justify-between border-t border-[#E2DCD0] bg-[#F4F0E8]/60 px-6 py-4">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3.5 py-2 text-xs font-medium text-[#44403C] disabled:opacity-40 hover:bg-[#ECE6DA] cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </button>

          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#143326] cursor-pointer"
            >
              {step === 0 ? 'Begin Area Check-In' : 'Next Area'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#143326] cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Save {getMonthLabel(reviewYear, reviewMonth)} Statement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
