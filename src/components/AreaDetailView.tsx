import { useState } from 'react';
import { ArrowLeft, Check, Info, Pencil, Plus } from 'lucide-react';
import { formatItemValue } from '../domain/scoring.ts';
import type {
  AreaTrendPoint,
  Goal,
  GoalStatus,
  LifeArea,
  LineItemDefinition,
  LineItemEntry,
  PeriodSummary,
  ScoredLineItem,
  ScoreExplanation,
  StatementSection,
} from '../domain/types.ts';
import { EditorialTrendChart } from './EditorialTrendChart.tsx';

interface AreaDetailViewProps {
  areaId: string;
  summary: PeriodSummary;
  trends: AreaTrendPoint[];
  goals: Goal[];
  isQuarterly: boolean;
  onBack: () => void;
  onInspectScore: (explanation: ScoreExplanation) => void;
  onAddLineItem: (areaId: string, section: StatementSection) => void;
  onEditLineItem: (def: LineItemDefinition, entry?: LineItemEntry) => void;
  onQuickUpdateEntry: (lineItemId: string, value: number) => void;
  onUpdateArea: (
    areaId: string,
    patch: Partial<Pick<LifeArea, 'name' | 'description' | 'weight'>>
  ) => void;
  onUpdateGoalStatus: (goalId: string, status: GoalStatus) => void;
}

export function AreaDetailView({
  areaId,
  summary,
  trends,
  goals,
  isQuarterly,
  onBack,
  onInspectScore,
  onAddLineItem,
  onEditLineItem,
  onQuickUpdateEntry,
  onUpdateArea,
  onUpdateGoalStatus,
}: AreaDetailViewProps) {
  const areaBs = summary.areaBalanceSheets.find((a) => a.area.id === areaId);
  const areaIncome = summary.areaIncomeStatements.find((a) => a.area.id === areaId);
  const areaCf = summary.areaCashFlows.find((a) => a.area.id === areaId);

  const [editingAreaMeta, setEditingAreaMeta] = useState(false);
  const [nameDraft, setNameDraft] = useState(areaBs?.area.name ?? '');
  const [descDraft, setDescDraft] = useState(areaBs?.area.description ?? '');
  const [weightDraft, setWeightDraft] = useState(areaBs?.area.weight ?? 3);

  if (!areaBs) {
    return (
      <div className="py-12 text-center text-sm text-[#686259]">
        Life area not found.{' '}
        <button type="button" onClick={onBack} className="underline text-[#1B4332] cursor-pointer">
          Return to Balance Sheet
        </button>
      </div>
    );
  }

  const areaGoals = goals.filter((g) => g.areaId === areaId);
  const areaTrendPoints = trends.map((t) => ({
    id: t.periodId,
    label: t.label,
    shortLabel: t.shortLabel,
    value: t.areaScores[areaId] ?? 0,
  }));

  const saveAreaMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    onUpdateArea(areaId, {
      name: nameDraft.trim(),
      description: descDraft.trim(),
      weight: weightDraft,
    });
    setEditingAreaMeta(false);
  };

  const renderSectionTable = (
    title: string,
    subtitle: string,
    items: ScoredLineItem[],
    section: StatementSection
  ) => (
    <div className="space-y-3">
      <div className="flex items-end justify-between border-b border-[#E2DCD0] pb-2.5">
        <div>
          <h3 className="font-serif text-xl font-medium text-[#1C1917]">{title}</h3>
          <p className="text-xs text-[#686259]">{subtitle}</p>
        </div>
        {!isQuarterly && (
          <button
            type="button"
            onClick={() => onAddLineItem(areaId, section)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4332] hover:underline cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add {section}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-xs text-[#686259]">No {section} items recorded for this area yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E2DCD0] text-xs text-[#686259]">
                <th className="py-2 pr-4 font-medium">Line Item</th>
                <th className="py-2 px-3 text-right font-medium">Value</th>
                <th className="py-2 px-3 text-right font-medium">Target</th>
                <th className="py-2 px-3 text-right font-medium">Health</th>
                <th className="py-2 pl-2 text-right font-medium">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCD0]/65">
              {items.map((item) => (
                <tr key={item.definition.id} className="align-top">
                  <td className="py-3 pr-4">
                    <div className="text-sm font-medium text-[#1C1917]">{item.definition.name}</div>
                    <div className="mt-0.5 text-xs text-[#686259]">
                      Weight {item.entry.weight}/5 · {item.statusLabel}
                      {item.entry.note ? ` · ${item.entry.note}` : ''}
                    </div>
                    {item.definition.rubric && (
                      <div className="mt-1.5 text-[11px] text-[#686259]">
                        Rubric — 2: {item.definition.rubric.anchor2} · 8: {item.definition.rubric.anchor8}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {!isQuarterly ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          step={item.definition.valueType === 'qualitative' ? '0.5' : 'any'}
                          min={item.definition.valueType === 'qualitative' ? 1 : undefined}
                          max={item.definition.valueType === 'qualitative' ? 10 : undefined}
                          value={item.entry.value}
                          aria-label={`Value for ${item.definition.name}`}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v)) {
                              onQuickUpdateEntry(item.definition.id, v);
                            }
                          }}
                          className="w-24 rounded border border-[#E2DCD0] bg-[#FBF9F5] px-2 py-1 text-right font-mono text-xs tabular-nums text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
                        />
                        <span className="font-mono text-[11px] text-[#686259]">
                          {item.definition.valueType === 'qualitative' ? '/10' : item.definition.unit ?? ''}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs tabular-nums text-[#1C1917]">
                        {formatItemValue(item.entry.value, item.definition)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs tabular-nums text-[#686259] whitespace-nowrap">
                    {formatItemValue(item.entry.target, item.definition)}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onInspectScore(item.explanation)}
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-[#1C1917] hover:text-[#1B4332] hover:underline cursor-pointer"
                    >
                      {item.healthScore}
                      <Info className="h-3 w-3 text-[#686259]" aria-hidden="true" />
                    </button>
                  </td>
                  <td className="py-3 pl-2 text-right whitespace-nowrap">
                    {!isQuarterly && (
                      <button
                        type="button"
                        onClick={() => onEditLineItem(item.definition, item.entry)}
                        aria-label={`Edit ${item.definition.name}`}
                        className="rounded p-1.5 text-[#686259] hover:bg-[#ECE6DA] hover:text-[#1C1917] cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header & Back Nav */}
      <div className="border-b border-[#E2DCD0] pb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#686259] hover:text-[#1C1917] cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Full Balance Sheet
        </button>

        {!editingAreaMeta ? (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs text-[#686259]">
                Life Area Drill-Down · Importance Weight {areaBs.area.weight}/5 · {summary.label}
              </p>
              <h1 className="mt-1 font-serif text-3xl font-medium text-[#1C1917] sm:text-4xl">
                {areaBs.area.name}
              </h1>
              {areaBs.area.description && (
                <p className="mt-2 text-sm leading-relaxed text-[#44403C]">
                  {areaBs.area.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setNameDraft(areaBs.area.name);
                setDescDraft(areaBs.area.description);
                setWeightDraft(areaBs.area.weight);
                setEditingAreaMeta(true);
              }}
              className="rounded-md border border-[#E2DCD0] px-3 py-1.5 text-xs font-medium text-[#44403C] hover:bg-[#F4F0E8] cursor-pointer"
            >
              Edit Area &amp; Weight
            </button>
          </div>
        ) : (
          <form onSubmit={saveAreaMeta} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="sm:col-span-3 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917]"
              required
            />
            <input
              type="text"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              className="sm:col-span-5 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917]"
            />
            <select
              value={weightDraft}
              onChange={(e) => setWeightDraft(Number(e.target.value))}
              className="sm:col-span-2 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 font-mono text-xs text-[#1C1917]"
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  Weight {w}/5
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAreaMeta(false)}
                className="text-xs text-[#686259] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-[#1B4332] px-3 py-2 text-xs font-medium text-[#FBF9F5] cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Area KPI Strip */}
      <section className="grid grid-cols-2 gap-6 border-b border-[#E2DCD0] pb-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#686259]">Area Health Score</span>
            <button
              type="button"
              onClick={() => onInspectScore(areaBs.explanation)}
              className="inline-flex items-center gap-1 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
            >
              <Info className="h-3 w-3" /> Math
            </button>
          </div>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#1C1917]">
            {areaBs.areaHealthScore}
            <span className="text-xs font-normal text-[#686259]"> / 100</span>
          </p>
        </div>
        <div className="border-l border-[#E2DCD0] pl-5">
          <span className="text-xs text-[#686259]">Asset Strength</span>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#1B4332]">
            {areaBs.assetStrength}
          </p>
        </div>
        <div className="lg:border-l lg:border-[#E2DCD0] lg:pl-5">
          <span className="text-xs text-[#686259]">Liability Load</span>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#9A3412]">
            {areaBs.liabilityLoad}
          </p>
        </div>
        <div className="border-l border-[#E2DCD0] pl-5">
          <span className="text-xs text-[#686259]">Equity Spread</span>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#1C1917]">
            {areaBs.equitySpread > 0 ? `+${areaBs.equitySpread}` : areaBs.equitySpread}
          </p>
        </div>
      </section>

      {/* Main Split: Mini Balance Sheet (left) + Trend & Cash Flow sidebar (right) */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          {renderSectionTable(
            'Assets',
            'Things that provide stability, margin, or compounding capacity.',
            areaBs.assets,
            'asset'
          )}
          {renderSectionTable(
            'Liabilities',
            'Ongoing drains, unresolved obligations, or chronic friction.',
            areaBs.liabilities,
            'liability'
          )}

          {areaIncome && (
            <div className="border-t border-[#E2DCD0] pt-6 space-y-6">
              {renderSectionTable(
                'Period Inflows',
                'Activities and flows that added energy, progress, or stability this period.',
                areaIncome.inflows,
                'inflow'
              )}
              {renderSectionTable(
                'Period Outflows',
                'Flows that consumed time, money, attention, or energy this period.',
                areaIncome.outflows,
                'outflow'
              )}
            </div>
          )}
        </div>

        {/* Right Editorial Margin Column */}
        <aside className="space-y-8 lg:col-span-4 lg:border-l lg:border-[#E2DCD0] lg:pl-8">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#1C1917]">Area Trajectory</h3>
            <p className="mt-0.5 text-xs text-[#686259]">
              Balance sheet health across recorded periods
            </p>
            <div className="mt-4">
              <EditorialTrendChart
                points={areaTrendPoints}
                height={155}
                compact
                ariaLabel={`${areaBs.area.name} health trend`}
              />
            </div>
          </div>

          {areaCf && (
            <div className="border-t border-[#E2DCD0] pt-6">
              <h3 className="font-serif text-lg font-medium text-[#1C1917]">Time &amp; Energy Flow</h3>
              <p className="mt-0.5 text-xs text-[#686259]">Intended vs. actual hours ({summary.label})</p>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[#686259]">Intended hours</dt>
                  <dd className="font-mono tabular-nums text-[#1C1917]">{areaCf.allocation.intendedHours} hrs</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#686259]">Actual hours</dt>
                  <dd className="font-mono tabular-nums text-[#1C1917]">{areaCf.allocation.actualHours} hrs</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#686259]">Variance</dt>
                  <dd className="font-mono tabular-nums text-[#44403C]">
                    {areaCf.varianceHours > 0 ? `+${areaCf.varianceHours}` : areaCf.varianceHours} hrs
                  </dd>
                </div>
                <div className="flex justify-between border-t border-[#E2DCD0]/70 pt-2">
                  <dt className="text-[#686259]">Asset / Liability split</dt>
                  <dd className="font-mono tabular-nums text-[#1C1917]">
                    {areaCf.allocation.assetHours}h / {areaCf.allocation.liabilityHours}h
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#686259]">Recovery / Strain split</dt>
                  <dd className="font-mono tabular-nums text-[#1C1917]">
                    {areaCf.allocation.recoveryHours}h / {areaCf.allocation.strainHours}h
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="border-t border-[#E2DCD0] pt-6">
            <h3 className="font-serif text-lg font-medium text-[#1C1917]">Linked Goals</h3>
            <p className="mt-0.5 text-xs text-[#686259]">Small improvement actions tied to this area</p>
            {areaGoals.length === 0 ? (
              <p className="mt-3 text-xs text-[#686259]">
                No goals linked to {areaBs.area.name} yet. Review the Goals tab to accept an offline suggestion or add one.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[#E2DCD0]/70">
                {areaGoals.map((goal) => (
                  <li key={goal.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[#1C1917]">{goal.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#686259]">
                          {goal.actionStep}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateGoalStatus(
                            goal.id,
                            goal.status === 'completed' ? 'active' : 'completed'
                          )
                        }
                        title={goal.status === 'completed' ? 'Reopen goal' : 'Mark complete'}
                        className={`mt-0.5 rounded border p-1 cursor-pointer ${
                          goal.status === 'completed'
                            ? 'border-[#1B4332] bg-[#1B4332] text-[#FBF9F5]'
                            : 'border-[#E2DCD0] text-[#686259] hover:border-[#1B4332]'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
