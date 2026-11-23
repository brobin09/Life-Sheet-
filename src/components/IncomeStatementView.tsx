import { Info, Pencil, Plus } from 'lucide-react';
import { formatItemValue } from '../domain/scoring.ts';
import type {
  LineItemDefinition,
  LineItemEntry,
  PeriodSummary,
  ScoredLineItem,
  ScoreExplanation,
  StatementSection,
} from '../domain/types.ts';

interface IncomeStatementViewProps {
  summary: PeriodSummary;
  isQuarterly: boolean;
  onInspectScore: (explanation: ScoreExplanation) => void;
  onAddLineItem: (areaId?: string, section?: StatementSection) => void;
  onEditLineItem: (def: LineItemDefinition, entry?: LineItemEntry) => void;
  onQuickUpdateEntry: (lineItemId: string, value: number) => void;
}

export function IncomeStatementView({
  summary,
  isQuarterly,
  onInspectScore,
  onAddLineItem,
  onEditLineItem,
  onQuickUpdateEntry,
}: IncomeStatementViewProps) {
  const allInflows: Array<{ areaName: string; item: ScoredLineItem }> = [];
  const allOutflows: Array<{ areaName: string; item: ScoredLineItem }> = [];

  for (const areaInc of summary.areaIncomeStatements) {
    for (const item of areaInc.inflows) {
      allInflows.push({ areaName: areaInc.area.name, item });
    }
    for (const item of areaInc.outflows) {
      allOutflows.push({ areaName: areaInc.area.name, item });
    }
  }

  const avgInflow =
    allInflows.length > 0
      ? Math.round(
          (allInflows.reduce((s, r) => s + r.item.healthScore * r.item.entry.weight, 0) /
            allInflows.reduce((s, r) => s + r.item.entry.weight, 0)) *
            10
        ) / 10
      : 0;

  const avgOutflowLoad =
    allOutflows.length > 0
      ? Math.round(
          (allOutflows.reduce((s, r) => s + r.item.liabilityLoad * r.item.entry.weight, 0) /
            allOutflows.reduce((s, r) => s + r.item.entry.weight, 0)) *
            10
        ) / 10
      : 0;

  const renderFlowTable = (
    heading: string,
    description: string,
    rows: Array<{ areaName: string; item: ScoredLineItem }>,
    section: 'inflow' | 'outflow'
  ) => (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E2DCD0] pb-3">
        <div>
          <h2 className="font-serif text-2xl font-medium text-[#1C1917]">{heading}</h2>
          <p className="text-xs text-[#686259]">{description}</p>
        </div>
        {!isQuarterly && (
          <button
            type="button"
            onClick={() => onAddLineItem(undefined, section)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4332] hover:underline cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add {section}
          </button>
        )}
      </div>

      <div className="overflow-x-auto border-b border-[#E2DCD0]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#E2DCD0] bg-[#F4F0E8]/60 text-xs text-[#686259]">
              <th className="py-2.5 pr-4 pl-3 font-medium">Line Item · Area</th>
              <th className="py-2.5 px-3 text-right font-medium">Period Value</th>
              <th className="py-2.5 px-3 text-right font-medium">Target</th>
              <th className="py-2.5 px-3 text-right font-medium">Health Score</th>
              <th className="py-2.5 px-3 text-right font-medium">Status</th>
              <th className="py-2.5 pl-2 pr-3 text-right font-medium">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DCD0]/65">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-[#686259]">
                  No {section} items recorded for {summary.label}.
                </td>
              </tr>
            ) : (
              rows.map(({ areaName, item }) => (
                <tr key={item.definition.id} className="hover:bg-[#F4F0E8]/45 transition-colors">
                  <td className="py-3 pr-4 pl-3">
                    <div className="text-sm font-medium text-[#1C1917]">{item.definition.name}</div>
                    <div className="text-xs text-[#686259]">
                      {areaName} · Weight {item.entry.weight}/5
                      {item.entry.note ? ` · ${item.entry.note}` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {!isQuarterly ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          step="any"
                          value={item.entry.value}
                          aria-label={`Period value for ${item.definition.name}`}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v)) onQuickUpdateEntry(item.definition.id, v);
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
                      <span className="font-normal text-[#686259]">/100</span>
                      <Info className="h-3 w-3 text-[#686259]" aria-hidden="true" />
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right text-xs text-[#686259] whitespace-nowrap">
                    {section === 'outflow' ? `Drag ${item.liabilityLoad}` : item.statusLabel}
                  </td>
                  <td className="py-3 pl-2 pr-3 text-right whitespace-nowrap">
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      <section className="border-b border-[#E2DCD0] pb-6">
        <p className="text-xs text-[#686259]">
          Statement 02 · Period Flow · {summary.label}
          {isQuarterly ? ' · Aggregated across months in quarter' : ''}
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-[#1C1917] sm:text-4xl">
          Life Income Statement
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#44403C]">
          What added energy, money, progress, or joy during this period versus what consumed time,
          money, attention, or energy.
        </p>
      </section>

      {/* Net Result Strip */}
      <section className="grid grid-cols-2 gap-6 border-b border-[#E2DCD0] pb-7 lg:grid-cols-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#686259]">Net Period Health</span>
            <button
              type="button"
              onClick={() => onInspectScore(summary.incomeExplanation)}
              className="inline-flex items-center gap-1 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
            >
              <Info className="h-3 w-3" /> Math
            </button>
          </div>
          <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-[#1C1917]">
            {summary.overallIncomeNetScore}
            <span className="text-xs font-normal text-[#686259]"> / 100</span>
          </p>
          <p className="mt-1 text-xs text-[#686259]">Weighted across period flows</p>
        </div>

        <div className="border-l border-[#E2DCD0] pl-5">
          <span className="text-xs text-[#686259]">Inflow Strength</span>
          <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-[#1B4332]">
            {avgInflow}
          </p>
          <p className="mt-1 text-xs text-[#686259]">{allInflows.length} tracked inflow items</p>
        </div>

        <div className="lg:border-l lg:border-[#E2DCD0] lg:pl-5">
          <span className="text-xs text-[#686259]">Outflow Drag</span>
          <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-[#9A3412]">
            {avgOutflowLoad}
          </p>
          <p className="mt-1 text-xs text-[#686259]">{allOutflows.length} tracked outflow items</p>
        </div>

        <div className="border-l border-[#E2DCD0] pl-5">
          <span className="text-xs text-[#686259]">Net Flow Spread</span>
          <p
            className={`mt-1.5 font-mono text-3xl font-semibold tabular-nums ${
              summary.overallIncomeSpread >= 20
                ? 'text-[#1B4332]'
                : summary.overallIncomeSpread >= 0
                  ? 'text-[#9A6700]'
                  : 'text-[#9A3412]'
            }`}
          >
            {summary.overallIncomeSpread > 0
              ? `+${summary.overallIncomeSpread}`
              : summary.overallIncomeSpread}
          </p>
          <p className="mt-1 text-xs text-[#686259]">Inflows minus Outflow Drag</p>
        </div>
      </section>

      {renderFlowTable(
        'Inflows',
        'Deposits of energy, savings, deep focus, nourishment, connection, and restorative play.',
        allInflows,
        'inflow'
      )}

      {renderFlowTable(
        'Outflows',
        'Withdrawals of time, attention, unplanned spending, sleep debt, and administrative friction.',
        allOutflows,
        'outflow'
      )}
    </div>
  );
}
