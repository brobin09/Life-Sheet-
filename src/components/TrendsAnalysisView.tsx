import { ArrowRight, Info } from 'lucide-react';
import type {
  AnalysisFlags,
  AreaTrendPoint,
  PeriodSummary,
  ScoreExplanation,
} from '../domain/types.ts';
import { EditorialTrendChart } from './EditorialTrendChart.tsx';

interface TrendsAnalysisViewProps {
  summary: PeriodSummary;
  previousSummary: PeriodSummary | null;
  trends: AreaTrendPoint[];
  flags: AnalysisFlags;
  isQuarterly: boolean;
  onSelectArea: (areaId: string) => void;
  onInspectScore: (explanation: ScoreExplanation) => void;
}

export function TrendsAnalysisView({
  summary,
  previousSummary,
  trends,
  flags,
  isQuarterly,
  onSelectArea,
  onInspectScore,
}: TrendsAnalysisViewProps) {
  const overallPoints = trends.map((t) => ({
    id: t.periodId,
    label: t.label,
    shortLabel: t.shortLabel,
    value: t.lifeEquity,
  }));

  return (
    <div className="space-y-10">
      <section className="border-b border-[#E2DCD0] pb-6">
        <p className="text-xs text-[#686259]">
          Analysis &amp; Period-over-Period Trajectory · {summary.label}
          {isQuarterly ? ' · Quarterly Series' : ' · Monthly Series'}
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-[#1C1917] sm:text-4xl">
          Trends &amp; Diagnostic Flags
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#44403C]">
          Calm, factual signals from your ledger: where life equity is compounding, which liabilities
          carry the heaviest drag, and what moved most since the prior period.
        </p>
      </section>

      {/* Overall Life Equity Chart + Key Ratios Sidebar */}
      <section className="grid grid-cols-1 gap-10 border-b border-[#E2DCD0] pb-9 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#1C1917]">
                Overall Life Equity Over Time
              </h2>
              <p className="text-xs text-[#686259]">
                Weighted 0–100 composite across all active life areas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onInspectScore(summary.equityExplanation)}
              className="inline-flex items-center gap-1 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Inspect current math
            </button>
          </div>
          <div className="mt-5">
            <EditorialTrendChart
              points={overallPoints}
              height={220}
              ariaLabel="Overall Life Equity trend across periods"
            />
          </div>
        </div>

        <aside className="space-y-5 lg:col-span-4 lg:border-l lg:border-[#E2DCD0] lg:pl-8">
          <h2 className="font-serif text-xl font-medium text-[#1C1917]">Key Balance Ratios</h2>
          <dl className="divide-y divide-[#E2DCD0]">
            <div className="py-3">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-[#686259]">Liability vs. Asset Time</dt>
                <button
                  type="button"
                  onClick={() => onInspectScore(summary.ratios.explanations.liabilityVsAsset)}
                  className="text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
                >
                  Math
                </button>
              </div>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#1C1917]">
                {summary.ratios.liabilityToAssetTimeRatio !== null
                  ? `${summary.ratios.liabilityToAssetTimeRatio}×`
                  : '—'}
              </dd>
              <p className="mt-0.5 text-xs text-[#686259]">
                {summary.ratios.liabilityTimeSharePercent}% liability time ·{' '}
                {summary.ratios.assetTimeSharePercent}% asset time
              </p>
            </div>

            <div className="py-3">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-[#686259]">Recovery vs. Strain</dt>
                <button
                  type="button"
                  onClick={() => onInspectScore(summary.ratios.explanations.recoveryVsStrain)}
                  className="text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
                >
                  Math
                </button>
              </div>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#1C1917]">
                {summary.ratios.recoveryToStrainRatio !== null
                  ? `${summary.ratios.recoveryToStrainRatio}×`
                  : '—'}
              </dd>
              <p className="mt-0.5 text-xs text-[#686259]">
                {summary.ratios.totalRecoveryHours}h recovery vs. {summary.ratios.totalStrainHours}h strain
              </p>
            </div>

            <div className="py-3">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-[#686259]">Intended vs. Actual Hours</dt>
                <button
                  type="button"
                  onClick={() => onInspectScore(summary.ratios.explanations.intendedVsActual)}
                  className="text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
                >
                  Math
                </button>
              </div>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#1B4332]">
                {summary.ratios.intendedVsActualAdherencePercent}%
              </dd>
              <p className="mt-0.5 text-xs text-[#686259]">
                {summary.ratios.totalActualHours}h logged vs. {summary.ratios.totalIntendedHours}h intended
              </p>
            </div>
          </dl>
        </aside>
      </section>

      {/* Diagnostic Flags: 3 Factual Columns */}
      <section className="grid grid-cols-1 gap-8 border-b border-[#E2DCD0] pb-10 lg:grid-cols-3">
        {/* Biggest Liabilities */}
        <div>
          <h2 className="font-serif text-xl font-medium text-[#1C1917]">Largest Liabilities</h2>
          <p className="mt-1 text-xs text-[#686259]">
            Ranked by drag load multiplied by item importance weight
          </p>
          {flags.biggestLiabilities.length === 0 ? (
            <p className="mt-4 text-xs text-[#686259]">No active liability drag recorded.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#E2DCD0]/70">
              {flags.biggestLiabilities.map((flag) => (
                <li key={flag.lineItemId} className="py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectArea(flag.areaId)}
                      className="text-left text-sm font-medium text-[#1C1917] hover:text-[#1B4332] hover:underline cursor-pointer"
                    >
                      {flag.lineItemName}
                    </button>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#9A3412]">
                      Drag {flag.liabilityLoad}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#686259]">
                    {flag.areaName} · {flag.valueLabel} (target {flag.targetLabel}) · Weight{' '}
                    {flag.weight}/5
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Most Neglected High-Weight Areas */}
        <div className="lg:border-l lg:border-[#E2DCD0] lg:pl-7">
          <h2 className="font-serif text-xl font-medium text-[#1C1917]">
            High-Weight Areas Needing Attention
          </h2>
          <p className="mt-1 text-xs text-[#686259]">
            Important areas scoring below 72 or receiving less than 80% of intended hours
          </p>
          {flags.neglectedHighWeightAreas.length === 0 ? (
            <p className="mt-4 text-xs text-[#686259]">
              All high-weight areas are currently healthy and receiving planned attention.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#E2DCD0]/70">
              {flags.neglectedHighWeightAreas.map((flag) => (
                <li key={flag.areaId} className="py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectArea(flag.areaId)}
                      className="text-left text-sm font-medium text-[#1C1917] hover:text-[#1B4332] hover:underline cursor-pointer"
                    >
                      {flag.areaName}
                    </button>
                    <span className="font-mono text-xs tabular-nums text-[#9A6700]">
                      Weight {flag.weight}/5
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#686259]">{flag.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Biggest Movers Since Last Period */}
        <div className="lg:border-l lg:border-[#E2DCD0] lg:pl-7">
          <h2 className="font-serif text-xl font-medium text-[#1C1917]">
            Largest Movers Since Prior Period
          </h2>
          <p className="mt-1 text-xs text-[#686259]">
            {previousSummary
              ? `Compared against ${previousSummary.label}`
              : 'Record at least two periods to compare period-over-period movement'}
          </p>

          {previousSummary && (
            <div className="mt-4 space-y-4">
              {flags.biggestPositiveMovers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#1B4332]">Improved most</p>
                  <ul className="mt-1.5 divide-y divide-[#E2DCD0]/60">
                    {flags.biggestPositiveMovers.map((m) => (
                      <li key={m.lineItemId} className="py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectArea(m.areaId)}
                            className="text-left text-sm text-[#1C1917] hover:underline cursor-pointer"
                          >
                            {m.lineItemName}
                          </button>
                          <span className="font-mono text-xs font-semibold tabular-nums text-[#1B4332]">
                            +{m.delta} pts
                          </span>
                        </div>
                        <p className="text-xs text-[#686259]">
                          {m.areaName} · {m.previousValueLabel} → {m.currentValueLabel}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {flags.biggestNegativeMovers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#9A3412]">Softened most</p>
                  <ul className="mt-1.5 divide-y divide-[#E2DCD0]/60">
                    {flags.biggestNegativeMovers.map((m) => (
                      <li key={m.lineItemId} className="py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectArea(m.areaId)}
                            className="text-left text-sm text-[#1C1917] hover:underline cursor-pointer"
                          >
                            {m.lineItemName}
                          </button>
                          <span className="font-mono text-xs font-semibold tabular-nums text-[#9A3412]">
                            {m.delta} pts
                          </span>
                        </div>
                        <p className="text-xs text-[#686259]">
                          {m.areaName} · {m.previousValueLabel} → {m.currentValueLabel}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {flags.biggestPositiveMovers.length === 0 &&
                flags.biggestNegativeMovers.length === 0 && (
                  <p className="text-xs text-[#686259]">
                    All line items remained within 2 points of the prior period.
                  </p>
                )}
            </div>
          )}
        </div>
      </section>

      {/* Per-Area Trend Charts Grid */}
      <section className="space-y-5">
        <div>
          <h2 className="font-serif text-2xl font-medium text-[#1C1917]">
            Area-by-Area Trajectories
          </h2>
          <p className="text-xs text-[#686259]">
            Select any area to open its full balance sheet and line items
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {summary.areaBalanceSheets.map((areaBs) => {
            const pts = trends.map((t) => ({
              id: t.periodId,
              label: t.label,
              shortLabel: t.shortLabel,
              value: t.areaScores[areaBs.area.id] ?? 0,
            }));
            const strokeColor =
              areaBs.areaHealthScore >= 75
                ? '#1B4332'
                : areaBs.areaHealthScore >= 58
                  ? '#9A6700'
                  : '#9A3412';

            return (
              <div
                key={areaBs.area.id}
                className="border border-[#E2DCD0] bg-[#FBF9F5] p-4 transition-colors hover:border-[#CEC6B6]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectArea(areaBs.area.id)}
                      className="inline-flex items-center gap-1 font-serif text-base font-medium text-[#1C1917] hover:text-[#1B4332] cursor-pointer"
                    >
                      {areaBs.area.name}
                      <ArrowRight className="h-3.5 w-3.5 text-[#686259]" aria-hidden="true" />
                    </button>
                    <p className="text-[11px] text-[#686259]">
                      Weight {areaBs.area.weight}/5 · Spread{' '}
                      {areaBs.equitySpread > 0 ? `+${areaBs.equitySpread}` : areaBs.equitySpread}
                    </p>
                  </div>
                  <span className="font-mono text-base font-semibold tabular-nums text-[#1C1917]">
                    {areaBs.areaHealthScore}
                  </span>
                </div>

                <div className="mt-3">
                  <EditorialTrendChart
                    points={pts}
                    height={115}
                    accentColor={strokeColor}
                    compact
                    ariaLabel={`${areaBs.area.name} period trend`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
