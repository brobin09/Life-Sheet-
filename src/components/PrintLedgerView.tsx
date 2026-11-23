import { formatItemValue } from '../domain/scoring.ts';
import type { AnalysisFlags, Goal, PeriodSummary } from '../domain/types.ts';

interface PrintLedgerViewProps {
  summary: PeriodSummary;
  flags: AnalysisFlags;
  goals: Goal[];
}

export function PrintLedgerView({ summary, flags, goals }: PrintLedgerViewProps) {
  const activeGoals = goals.filter((g) => g.status === 'active');

  return (
    <div className="print-only hidden text-[#111111]">
      <header className="border-b-2 border-[#111111] pb-4">
        <p className="text-xs uppercase tracking-widest text-[#555555]">
          Personal Financial-Style Life Ledger
        </p>
        <div className="mt-1 flex items-baseline justify-between">
          <h1 className="font-serif text-3xl font-medium">Life Statements — {summary.label}</h1>
          <span className="font-mono text-xs text-[#555555]">
            Generated {new Date().toLocaleDateString('en-US')}
          </span>
        </div>
      </header>

      {/* Executive Summary */}
      <section className="mt-6 grid grid-cols-4 gap-4 border-b border-[#CCCCCC] pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#555555]">Overall Life Equity</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{summary.overallLifeEquity} / 100</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#555555]">Asset Strength</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{summary.overallAssetStrength}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#555555]">Liability Load</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{summary.overallLiabilityLoad}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#555555]">Equity Spread</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {summary.overallEquitySpread > 0
              ? `+${summary.overallEquitySpread}`
              : summary.overallEquitySpread}
          </p>
        </div>
      </section>

      {/* Statement 1: Balance Sheet */}
      <section className="mt-6">
        <h2 className="font-serif text-xl font-medium">01. Balance Sheet by Life Area</h2>
        <table className="mt-3 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#111111]">
              <th className="py-1.5 pr-3">Area / Line Item</th>
              <th className="py-1.5 px-2">Section</th>
              <th className="py-1.5 px-2 text-right">Value</th>
              <th className="py-1.5 px-2 text-right">Target</th>
              <th className="py-1.5 px-2 text-right">Wt</th>
              <th className="py-1.5 pl-2 text-right">Health</th>
            </tr>
          </thead>
          {summary.areaBalanceSheets.map((areaBs) => (
            <tbody key={areaBs.area.id} className="print-break-inside-avoid">
              <tr className="border-t border-[#999999] bg-[#F5F5F5] font-semibold">
                <td className="py-1.5 pr-3">{areaBs.area.name}</td>
                <td className="py-1.5 px-2">Area Rollup</td>
                <td className="py-1.5 px-2 text-right font-mono">
                  Assets {areaBs.assetStrength}
                </td>
                <td className="py-1.5 px-2 text-right font-mono">
                  Drag {areaBs.liabilityLoad}
                </td>
                <td className="py-1.5 px-2 text-right font-mono">{areaBs.area.weight}/5</td>
                <td className="py-1.5 pl-2 text-right font-mono">{areaBs.areaHealthScore}</td>
              </tr>
              {[...areaBs.assets, ...areaBs.liabilities].map((item) => (
                <tr key={item.definition.id} className="border-t border-[#E5E5E5]">
                  <td className="py-1 pr-3 pl-4">{item.definition.name}</td>
                  <td className="py-1 px-2 capitalize">{item.definition.section}</td>
                  <td className="py-1 px-2 text-right font-mono">
                    {formatItemValue(item.entry.value, item.definition)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {formatItemValue(item.entry.target, item.definition)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">{item.entry.weight}</td>
                  <td className="py-1 pl-2 text-right font-mono">{item.healthScore}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </section>

      {/* Statement 2: Income Statement */}
      <section className="mt-7 print-break-inside-avoid">
        <h2 className="font-serif text-xl font-medium">
          02. Income Statement (Net Health: {summary.overallIncomeNetScore}/100)
        </h2>
        <table className="mt-3 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#111111]">
              <th className="py-1.5 pr-3">Line Item</th>
              <th className="py-1.5 px-2">Area</th>
              <th className="py-1.5 px-2">Flow</th>
              <th className="py-1.5 px-2 text-right">Value</th>
              <th className="py-1.5 px-2 text-right">Target</th>
              <th className="py-1.5 pl-2 text-right">Health</th>
            </tr>
          </thead>
          <tbody>
            {summary.areaIncomeStatements.flatMap((a) =>
              [...a.inflows, ...a.outflows].map((item) => (
                <tr key={item.definition.id} className="border-t border-[#E5E5E5]">
                  <td className="py-1 pr-3">{item.definition.name}</td>
                  <td className="py-1 px-2">{a.area.name}</td>
                  <td className="py-1 px-2 capitalize">{item.definition.section}</td>
                  <td className="py-1 px-2 text-right font-mono">
                    {formatItemValue(item.entry.value, item.definition)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {formatItemValue(item.entry.target, item.definition)}
                  </td>
                  <td className="py-1 pl-2 text-right font-mono">{item.healthScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Statement 3: Cash Flow & Ratios */}
      <section className="mt-7 print-break-inside-avoid">
        <h2 className="font-serif text-xl font-medium">03. Time &amp; Energy Cash Flow</h2>
        <p className="mt-1 font-mono text-xs text-[#444444]">
          Liability:Asset Time {summary.ratios.liabilityToAssetTimeRatio ?? '—'}× ·
          Recovery:Strain {summary.ratios.recoveryToStrainRatio ?? '—'}× ·
          Intended vs. Actual Alignment {summary.ratios.intendedVsActualAdherencePercent}%
        </p>
        <table className="mt-3 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#111111]">
              <th className="py-1.5 pr-3">Area</th>
              <th className="py-1.5 px-2 text-right">Intended (h)</th>
              <th className="py-1.5 px-2 text-right">Actual (h)</th>
              <th className="py-1.5 px-2 text-right">Asset (h)</th>
              <th className="py-1.5 px-2 text-right">Liability (h)</th>
              <th className="py-1.5 px-2 text-right">Recovery (h)</th>
              <th className="py-1.5 pl-2 text-right">Strain (h)</th>
            </tr>
          </thead>
          <tbody>
            {summary.areaCashFlows.map((cf) => (
              <tr key={cf.area.id} className="border-t border-[#E5E5E5]">
                <td className="py-1 pr-3">{cf.area.name}</td>
                <td className="py-1 px-2 text-right font-mono">{cf.allocation.intendedHours}</td>
                <td className="py-1 px-2 text-right font-mono">{cf.allocation.actualHours}</td>
                <td className="py-1 px-2 text-right font-mono">{cf.allocation.assetHours}</td>
                <td className="py-1 px-2 text-right font-mono">{cf.allocation.liabilityHours}</td>
                <td className="py-1 px-2 text-right font-mono">{cf.allocation.recoveryHours}</td>
                <td className="py-1 pl-2 text-right font-mono">{cf.allocation.strainHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Flags & Active Goals */}
      <section className="mt-7 grid grid-cols-2 gap-6 border-t border-[#CCCCCC] pt-5 print-break-inside-avoid">
        <div>
          <h3 className="font-serif text-base font-medium">Top Liabilities Flagged</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {flags.biggestLiabilities.map((f) => (
              <li key={f.lineItemId}>
                <strong>{f.lineItemName}</strong> ({f.areaName}): {f.valueLabel} — Drag{' '}
                {f.liabilityLoad}/100
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-serif text-base font-medium">Active Improvement Goals</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {activeGoals.length === 0 ? (
              <li>No active goals recorded.</li>
            ) : (
              activeGoals.map((g) => (
                <li key={g.id}>
                  <strong>{g.title}</strong> — {g.actionStep}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
