import { Info } from 'lucide-react';
import type { CashFlowAllocation, PeriodSummary, ScoreExplanation } from '../domain/types.ts';

interface CashFlowViewProps {
  summary: PeriodSummary;
  isQuarterly: boolean;
  onInspectScore: (explanation: ScoreExplanation) => void;
  onUpdateCashFlow: (
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
      >
    >
  ) => void;
}

export function CashFlowView({
  summary,
  isQuarterly,
  onInspectScore,
  onUpdateCashFlow,
}: CashFlowViewProps) {
  const { ratios, areaCashFlows } = summary;
  const maxHours = Math.max(
    1,
    ...areaCashFlows.map((c) => Math.max(c.allocation.intendedHours, c.allocation.actualHours))
  );

  const handleNumeric = (
    areaId: string,
    field: keyof Pick<
      CashFlowAllocation,
      | 'intendedHours'
      | 'actualHours'
      | 'assetHours'
      | 'liabilityHours'
      | 'recoveryHours'
      | 'strainHours'
      | 'energyNet'
    >,
    raw: string
  ) => {
    const val = Number(raw);
    if (!Number.isFinite(val)) return;
    const bounded = field === 'energyNet' ? Math.max(-5, Math.min(5, val)) : Math.max(0, val);
    onUpdateCashFlow(areaId, { [field]: bounded });
  };

  return (
    <div className="space-y-8">
      <section className="border-b border-[#E2DCD0] pb-6">
        <p className="text-xs text-[#686259]">
          Statement 03 · Time &amp; Energy Allocation · {summary.label}
          {isQuarterly ? ' · Summed across months in quarter' : ''}
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-[#1C1917] sm:text-4xl">
          Time &amp; Energy Cash Flow
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#44403C]">
          Compare where your hours and energy actually went against where you intended them to go,
          separated into asset-building versus liability-servicing and recovery versus strain.
        </p>
      </section>

      {/* Three Key Ratios */}
      <section className="grid grid-cols-1 gap-6 border-b border-[#E2DCD0] pb-7 md:grid-cols-3">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#686259]">Liability vs. Asset Time</span>
            <button
              type="button"
              onClick={() => onInspectScore(ratios.explanations.liabilityVsAsset)}
              className="inline-flex items-center gap-1 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
            >
              <Info className="h-3 w-3" /> Math
            </button>
          </div>
          <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-[#1C1917]">
            {ratios.liabilityToAssetTimeRatio !== null
              ? `${ratios.liabilityToAssetTimeRatio}×`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-[#686259]">
            {ratios.totalLiabilityHours}h on liabilities · {ratios.totalAssetHours}h on assets (
            {ratios.assetTimeSharePercent}% asset share)
          </p>
        </div>

        <div className="md:border-l md:border-[#E2DCD0] md:pl-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#686259]">Recovery vs. Strain Ratio</span>
            <button
              type="button"
              onClick={() => onInspectScore(ratios.explanations.recoveryVsStrain)}
              className="inline-flex items-center gap-1 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
            >
              <Info className="h-3 w-3" /> Math
            </button>
          </div>
          <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-[#1C1917]">
            {ratios.recoveryToStrainRatio !== null ? `${ratios.recoveryToStrainRatio}×` : '—'}
          </p>
          <p className="mt-1 text-xs text-[#686259]">
            {ratios.totalRecoveryHours}h recovery · {ratios.totalStrainHours}h strain
          </p>
        </div>

        <div className="md:border-l md:border-[#E2DCD0] md:pl-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#686259]">Intended vs. Actual Alignment</span>
            <button
              type="button"
              onClick={() => onInspectScore(ratios.explanations.intendedVsActual)}
              className="inline-flex items-center gap-1 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
            >
              <Info className="h-3 w-3" /> Math
            </button>
          </div>
          <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-[#1B4332]">
            {ratios.intendedVsActualAdherencePercent}%
          </p>
          <p className="mt-1 text-xs text-[#686259]">
            {ratios.totalActualHours}h actual vs. {ratios.totalIntendedHours}h intended
          </p>
        </div>
      </section>

      {/* Visual Intended vs. Actual Horizontal Comparison */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl font-medium text-[#1C1917]">
            Intended vs. Actual Hours by Area
          </h2>
          <div className="flex items-center gap-5 text-xs text-[#686259]">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-4 bg-[#CEC6B6]" aria-hidden="true" />
              Intended hours
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-4 bg-[#1B4332]" aria-hidden="true" />
              Actual hours
            </span>
          </div>
        </div>

        <div className="space-y-3.5 border-t border-b border-[#E2DCD0] py-5">
          {areaCashFlows.map((cf) => {
            const intendedPct = (cf.allocation.intendedHours / maxHours) * 100;
            const actualPct = (cf.allocation.actualHours / maxHours) * 100;
            const isUnder = cf.varianceHours < -2;
            const isOver = cf.varianceHours > 4;

            return (
              <div key={cf.area.id} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                <div className="sm:col-span-3">
                  <span className="text-sm font-medium text-[#1C1917]">{cf.area.name}</span>
                  <span className="ml-2 font-mono text-xs text-[#686259] tabular-nums">
                    {cf.varianceHours > 0 ? `+${cf.varianceHours}h` : `${cf.varianceHours}h`}
                  </span>
                </div>
                <div className="sm:col-span-7 space-y-1.5">
                  <div className="h-2 w-full bg-[#F4F0E8]">
                    <div
                      className="h-full bg-[#CEC6B6]"
                      style={{ width: `${Math.max(1, intendedPct)}%` }}
                    />
                  </div>
                  <div className="h-2 w-full bg-[#F4F0E8]">
                    <div
                      className={`h-full ${
                        isOver ? 'bg-[#9A6700]' : isUnder ? 'bg-[#9A3412]' : 'bg-[#1B4332]'
                      }`}
                      style={{ width: `${Math.max(1, actualPct)}%` }}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 text-right font-mono text-xs tabular-nums text-[#44403C]">
                  {cf.allocation.actualHours}h / {cf.allocation.intendedHours}h
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Editable Allocation Ledger Table */}
      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-2xl font-medium text-[#1C1917]">
            Area Allocation Ledger
          </h2>
          <p className="text-xs text-[#686259]">
            {isQuarterly
              ? 'Quarterly totals are aggregated automatically from your monthly cash flow logs. Switch to Monthly to edit hours.'
              : 'Adjust hours directly in the table below; all ratios recalculate immediately.'}
          </p>
        </div>

        <div className="overflow-x-auto border-t border-b border-[#E2DCD0]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E2DCD0] bg-[#F4F0E8]/60 text-xs text-[#686259]">
                <th className="py-2.5 pr-4 pl-3 font-medium">Life Area</th>
                <th className="py-2.5 px-2 text-right font-medium whitespace-nowrap">Intended (h)</th>
                <th className="py-2.5 px-2 text-right font-medium whitespace-nowrap">Actual (h)</th>
                <th className="py-2.5 px-2 text-right font-medium whitespace-nowrap">Asset (h)</th>
                <th className="py-2.5 px-2 text-right font-medium whitespace-nowrap">Liability (h)</th>
                <th className="py-2.5 px-2 text-right font-medium whitespace-nowrap">Recovery (h)</th>
                <th className="py-2.5 px-2 text-right font-medium whitespace-nowrap">Strain (h)</th>
                <th className="py-2.5 pl-2 pr-3 text-right font-medium whitespace-nowrap">Energy (−5..+5)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DCD0]/65">
              {areaCashFlows.map((cf) => {
                const a = cf.allocation;
                const renderCell = (
                  field:
                    | 'intendedHours'
                    | 'actualHours'
                    | 'assetHours'
                    | 'liabilityHours'
                    | 'recoveryHours'
                    | 'strainHours'
                    | 'energyNet',
                  val: number
                ) =>
                  isQuarterly ? (
                    <span className="font-mono text-xs tabular-nums text-[#1C1917]">
                      {field === 'energyNet' && val > 0 ? `+${val}` : val}
                    </span>
                  ) : (
                    <input
                      type="number"
                      step={field === 'energyNet' ? '1' : '0.5'}
                      min={field === 'energyNet' ? -5 : 0}
                      max={field === 'energyNet' ? 5 : undefined}
                      value={val}
                      aria-label={`${cf.area.name} ${field}`}
                      onChange={(e) => handleNumeric(cf.area.id, field, e.target.value)}
                      className="w-16 rounded border border-[#E2DCD0] bg-[#FBF9F5] px-1.5 py-1 text-right font-mono text-xs tabular-nums text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
                    />
                  );

                return (
                  <tr key={cf.area.id} className="hover:bg-[#F4F0E8]/45">
                    <td className="py-2.5 pr-4 pl-3 text-sm font-medium text-[#1C1917]">
                      {cf.area.name}
                    </td>
                    <td className="py-2.5 px-2 text-right">{renderCell('intendedHours', a.intendedHours)}</td>
                    <td className="py-2.5 px-2 text-right">{renderCell('actualHours', a.actualHours)}</td>
                    <td className="py-2.5 px-2 text-right">{renderCell('assetHours', a.assetHours)}</td>
                    <td className="py-2.5 px-2 text-right">{renderCell('liabilityHours', a.liabilityHours)}</td>
                    <td className="py-2.5 px-2 text-right">{renderCell('recoveryHours', a.recoveryHours)}</td>
                    <td className="py-2.5 px-2 text-right">{renderCell('strainHours', a.strainHours)}</td>
                    <td className="py-2.5 pl-2 pr-3 text-right">{renderCell('energyNet', a.energyNet)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-[#CEC6B6] bg-[#F4F0E8]/70 font-mono text-xs font-semibold tabular-nums text-[#1C1917]">
                <td className="py-3 pr-4 pl-3 font-sans">Total</td>
                <td className="py-3 px-2 text-right">{ratios.totalIntendedHours}</td>
                <td className="py-3 px-2 text-right">{ratios.totalActualHours}</td>
                <td className="py-3 px-2 text-right">{ratios.totalAssetHours}</td>
                <td className="py-3 px-2 text-right">{ratios.totalLiabilityHours}</td>
                <td className="py-3 px-2 text-right">{ratios.totalRecoveryHours}</td>
                <td className="py-3 px-2 text-right">{ratios.totalStrainHours}</td>
                <td className="py-3 pl-2 pr-3 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
