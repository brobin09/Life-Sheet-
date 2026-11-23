import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  Search,
} from 'lucide-react';
import { formatItemValue, round1 } from '../domain/scoring.ts';
import type {
  LifeArea,
  LineItemDefinition,
  LineItemEntry,
  PeriodSummary,
  ScoredLineItem,
  ScoreExplanation,
  StatementSection,
} from '../domain/types.ts';

interface BalanceSheetViewProps {
  summary: PeriodSummary;
  previousSummary: PeriodSummary | null;
  periodNote?: string;
  isQuarterly: boolean;
  isSampleData: boolean;
  onInspectScore: (explanation: ScoreExplanation) => void;
  onSelectArea: (areaId: string) => void;
  onAddLineItem: (areaId?: string, section?: StatementSection) => void;
  onEditLineItem: (def: LineItemDefinition, entry?: LineItemEntry) => void;
  onAddArea: (name: string, description: string, weight: number) => void;
  onOpenOnboarding: () => void;
}

function formatSpread(spread: number): string {
  return spread > 0 ? `+${spread}` : String(spread);
}

function scoreToneClass(score: number): string {
  if (score >= 78) return 'text-[#1B4332]';
  if (score >= 58) return 'text-[#9A6700]';
  return 'text-[#9A3412]';
}

export function BalanceSheetView({
  summary,
  previousSummary,
  periodNote,
  isQuarterly,
  isSampleData,
  onInspectScore,
  onSelectArea,
  onAddLineItem,
  onEditLineItem,
  onAddArea,
  onOpenOnboarding,
}: BalanceSheetViewProps) {
  const [expandedAreaIds, setExpandedAreaIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'asset' | 'liability'>('all');
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDesc, setNewAreaDesc] = useState('');
  const [newAreaWeight, setNewAreaWeight] = useState(3);

  const prevAreaMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!previousSummary) return map;
    for (const a of previousSummary.areaBalanceSheets) {
      map.set(a.area.id, a.areaHealthScore);
    }
    return map;
  }, [previousSummary]);

  const equityDelta = previousSummary
    ? round1(summary.overallLifeEquity - previousSummary.overallLifeEquity)
    : null;

  const filteredAreaSheets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return summary.areaBalanceSheets
      .map((areaBs) => {
        const assets =
          sectionFilter === 'liability'
            ? []
            : areaBs.assets.filter(
                (i) =>
                  !q ||
                  i.definition.name.toLowerCase().includes(q) ||
                  areaBs.area.name.toLowerCase().includes(q) ||
                  i.entry.note.toLowerCase().includes(q)
              );
        const liabilities =
          sectionFilter === 'asset'
            ? []
            : areaBs.liabilities.filter(
                (i) =>
                  !q ||
                  i.definition.name.toLowerCase().includes(q) ||
                  areaBs.area.name.toLowerCase().includes(q) ||
                  i.entry.note.toLowerCase().includes(q)
              );
        return { ...areaBs, filteredAssets: assets, filteredLiabilities: liabilities };
      })
      .filter((a) => {
        if (!q && sectionFilter === 'all') return true;
        return (
          a.area.name.toLowerCase().includes(q) ||
          a.filteredAssets.length > 0 ||
          a.filteredLiabilities.length > 0
        );
      });
  }, [summary.areaBalanceSheets, searchQuery, sectionFilter]);

  const allExpanded =
    filteredAreaSheets.length > 0 &&
    filteredAreaSheets.every((a) => expandedAreaIds[a.area.id]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedAreaIds({});
    } else {
      const next: Record<string, boolean> = {};
      for (const a of filteredAreaSheets) next[a.area.id] = true;
      setExpandedAreaIds(next);
    }
  };

  const handleCreateArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    onAddArea(newAreaName, newAreaDesc, newAreaWeight);
    setNewAreaName('');
    setNewAreaDesc('');
    setNewAreaWeight(3);
    setAddingArea(false);
  };

  const renderItemRow = (item: ScoredLineItem) => (
    <tr
      key={item.definition.id}
      className="border-t border-[#E2DCD0]/65 hover:bg-[#F4F0E8]/55 transition-colors"
    >
      <td className="py-2.5 pr-4 pl-9">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#1C1917]">{item.definition.name}</span>
          <span className="text-xs text-[#686259]">
            {item.definition.section === 'asset' ? 'Asset' : 'Liability'}
            <span aria-hidden="true"> · </span>
            {item.definition.valueType === 'quantitative' ? 'Quantitative' : 'Qualitative rubric'}
            <span aria-hidden="true"> · </span>
            Weight {item.entry.weight}/5
            {item.entry.note ? ` · ${item.entry.note}` : ''}
          </span>
        </div>
      </td>
      <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-[#1C1917] whitespace-nowrap">
        {formatItemValue(item.entry.value, item.definition)}
      </td>
      <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-[#686259] whitespace-nowrap">
        {formatItemValue(item.entry.target, item.definition)}
      </td>
      <td className="py-2.5 px-3 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => onInspectScore(item.explanation)}
          title="Inspect how this score was calculated"
          className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums hover:underline cursor-pointer"
        >
          <span className={scoreToneClass(item.healthScore)}>{item.healthScore}</span>
          <span className="font-normal text-[#686259]">/100</span>
          <Info className="h-3 w-3 text-[#686259]" aria-hidden="true" />
        </button>
      </td>
      <td className="py-2.5 px-3 text-right text-xs text-[#686259] whitespace-nowrap">
        {item.definition.section === 'liability'
          ? `Drag ${item.liabilityLoad}`
          : item.statusLabel}
      </td>
      <td className="py-2.5 pl-2 pr-3 text-right whitespace-nowrap">
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
  );

  return (
    <div className="space-y-8">
      {/* Editorial Statement Masthead */}
      <section className="border-b border-[#E2DCD0] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs text-[#686259]">
              Statement 01 · Point-in-Time Snapshot · {summary.label}
              {isQuarterly ? ' · Ending Balance Sheet' : ''}
            </p>
            <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-[#1C1917] sm:text-4xl">
              Personal Balance Sheet
            </h1>
            {periodNote && !isQuarterly && (
              <p className="mt-2 text-sm leading-relaxed text-[#44403C]">{periodNote}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {!isQuarterly && (
              <button
                type="button"
                onClick={() => onAddLineItem(undefined, 'asset')}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#1B4332] bg-[#FBF9F5] px-3.5 py-2 text-xs font-medium text-[#1B4332] whitespace-nowrap shrink-0 hover:bg-[#ECF2EE] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Line Item
              </button>
            )}
          </div>
        </div>

        {isSampleData && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2DCD0] pt-3.5 text-xs text-[#44403C]">
            <span>
              Exploring preloaded sample data across August–November 2026 (Q3 &amp; Q4). Every score
              below is live and transparent—click any score to see the exact formula.
            </span>
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="font-semibold text-[#1B4332] underline underline-offset-4 hover:text-[#143326] whitespace-nowrap cursor-pointer"
            >
              Start my own ledger →
            </button>
          </div>
        )}
      </section>

      {/* 4-Column Flat KPI Summary Strip (zero cards-within-cards) */}
      <section aria-label="Life Equity summary" className="grid grid-cols-2 gap-6 border-b border-[#E2DCD0] pb-7 lg:grid-cols-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#686259]">Overall Life Equity</span>
            <button
              type="button"
              onClick={() => onInspectScore(summary.equityExplanation)}
              className="inline-flex items-center gap-1 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
            >
              <Info className="h-3 w-3" aria-hidden="true" />
              Math
            </button>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums text-[#1C1917]">
              {summary.overallLifeEquity}
            </span>
            <span className="font-mono text-xs text-[#686259]">/ 100</span>
          </div>
          <p className="mt-1 text-xs text-[#686259]">
            {equityDelta !== null
              ? `${equityDelta >= 0 ? '+' : ''}${equityDelta} pts vs. prior ${isQuarterly ? 'quarter' : 'month'}`
              : 'Weighted across active areas'}
          </p>
        </div>

        <div className="border-l border-[#E2DCD0] pl-5">
          <span className="text-xs text-[#686259]">Asset Strength</span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums text-[#1B4332]">
              {summary.overallAssetStrength}
            </span>
            <span className="font-mono text-xs text-[#686259]">/ 100</span>
          </div>
          <p className="mt-1 text-xs text-[#686259]">Weighted capacity &amp; stability</p>
        </div>

        <div className="lg:border-l lg:border-[#E2DCD0] lg:pl-5">
          <span className="text-xs text-[#686259]">Liability Load</span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular-nums text-[#9A3412]">
              {summary.overallLiabilityLoad}
            </span>
            <span className="font-mono text-xs text-[#686259]">/ 100</span>
          </div>
          <p className="mt-1 text-xs text-[#686259]">
            100 − Liability Health ({summary.overallLiabilityHealth})
          </p>
        </div>

        <div className="border-l border-[#E2DCD0] pl-5">
          <span className="text-xs text-[#686259]">Net Equity Spread</span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-semibold tabular-nums ${
                summary.overallEquitySpread >= 25
                  ? 'text-[#1B4332]'
                  : summary.overallEquitySpread >= 0
                    ? 'text-[#9A6700]'
                    : 'text-[#9A3412]'
              }`}
            >
              {formatSpread(summary.overallEquitySpread)}
            </span>
            <span className="font-mono text-xs text-[#686259]">pts</span>
          </div>
          <p className="mt-1 text-xs text-[#686259]">Asset Strength minus Liability Load</p>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#686259]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter areas or line items…"
                className="w-60 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] py-1.5 pr-3 pl-8 text-xs text-[#1C1917] placeholder:text-[#686259] focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <div
              role="group"
              aria-label="Filter by balance sheet section"
              className="inline-flex items-center rounded-md border border-[#E2DCD0] bg-[#F4F0E8]/70 p-0.5"
            >
              {(['all', 'asset', 'liability'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSectionFilter(mode)}
                  className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    sectionFilter === mode
                      ? 'bg-[#FBF9F5] text-[#1C1917]'
                      : 'text-[#686259] hover:text-[#1C1917]'
                  }`}
                >
                  {mode === 'all' ? 'All Items' : mode === 'asset' ? 'Assets' : 'Liabilities'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={toggleExpandAll}
              className="font-medium text-[#44403C] hover:text-[#1C1917] cursor-pointer"
            >
              {allExpanded ? 'Collapse all line items' : 'Expand all line items'}
            </button>
            <button
              type="button"
              onClick={() => setAddingArea((v) => !v)}
              className="font-medium text-[#1B4332] hover:underline cursor-pointer"
            >
              + Add Life Area
            </button>
          </div>
        </div>

        {addingArea && (
          <form
            onSubmit={handleCreateArea}
            className="grid grid-cols-1 gap-3 rounded-md border border-[#E2DCD0] bg-[#F4F0E8]/60 p-4 sm:grid-cols-12"
          >
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="New area name (e.g., Community)"
              className="sm:col-span-3 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-sm text-[#1C1917]"
              required
            />
            <input
              type="text"
              value={newAreaDesc}
              onChange={(e) => setNewAreaDesc(e.target.value)}
              placeholder="Short description of what stability means here"
              className="sm:col-span-5 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-sm text-[#1C1917]"
            />
            <select
              value={newAreaWeight}
              onChange={(e) => setNewAreaWeight(Number(e.target.value))}
              className="sm:col-span-2 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-2.5 py-1.5 font-mono text-xs text-[#1C1917]"
            >
              <option value={1}>Weight 1</option>
              <option value={2}>Weight 2</option>
              <option value={3}>Weight 3</option>
              <option value={4}>Weight 4</option>
              <option value={5}>Weight 5</option>
            </select>
            <div className="sm:col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddingArea(false)}
                className="text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-[#1B4332] px-3 py-1.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#143326] cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Primary Ledger Table */}
        <div className="overflow-x-auto border-t border-b border-[#E2DCD0]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2DCD0] bg-[#F4F0E8]/60 text-xs text-[#686259]">
                <th className="py-3 pr-4 pl-3 font-medium">Life Area / Line Item</th>
                <th className="py-3 px-3 text-right font-medium whitespace-nowrap">Assets / Value</th>
                <th className="py-3 px-3 text-right font-medium whitespace-nowrap">Liability Load / Target</th>
                <th className="py-3 px-3 text-right font-medium whitespace-nowrap">Area Score</th>
                <th className="py-3 px-3 text-right font-medium whitespace-nowrap">Equity Spread</th>
                <th className="py-3 pl-2 pr-3 text-right font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAreaSheets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-[#686259]">
                    No life areas or line items match your current filter.
                  </td>
                </tr>
              ) : (
                filteredAreaSheets.map((areaBs) => {
                  const isExpanded =
                    Boolean(expandedAreaIds[areaBs.area.id]) ||
                    searchQuery.trim().length > 0 ||
                    sectionFilter !== 'all';
                  const prevScore = prevAreaMap.get(areaBs.area.id);
                  const delta =
                    prevScore !== undefined ? round1(areaBs.areaHealthScore - prevScore) : null;

                  return (
                    <AreaLedgerBlock
                      key={areaBs.area.id}
                      area={areaBs.area}
                      assetStrength={areaBs.assetStrength}
                      liabilityLoad={areaBs.liabilityLoad}
                      areaHealthScore={areaBs.areaHealthScore}
                      equitySpread={areaBs.equitySpread}
                      delta={delta}
                      assetCount={areaBs.assets.length}
                      liabilityCount={areaBs.liabilities.length}
                      isExpanded={isExpanded}
                      isQuarterly={isQuarterly}
                      onToggleExpand={() =>
                        setExpandedAreaIds((prev) => ({
                          ...prev,
                          [areaBs.area.id]: !prev[areaBs.area.id],
                        }))
                      }
                      onOpenArea={() => onSelectArea(areaBs.area.id)}
                      onInspectArea={() => onInspectScore(areaBs.explanation)}
                      onAddLineItem={() => onAddLineItem(areaBs.area.id, 'asset')}
                    >
                      {isExpanded && (
                        <>
                          {areaBs.filteredAssets.map(renderItemRow)}
                          {areaBs.filteredLiabilities.map(renderItemRow)}
                          {areaBs.filteredAssets.length === 0 &&
                            areaBs.filteredLiabilities.length === 0 && (
                              <tr className="border-t border-[#E2DCD0]/60">
                                <td
                                  colSpan={6}
                                  className="py-3 pl-9 text-xs text-[#686259]"
                                >
                                  No balance sheet line items in this view.
                                </td>
                              </tr>
                            )}
                        </>
                      )}
                    </AreaLedgerBlock>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

interface AreaLedgerBlockProps {
  area: LifeArea;
  assetStrength: number;
  liabilityLoad: number;
  areaHealthScore: number;
  equitySpread: number;
  delta: number | null;
  assetCount: number;
  liabilityCount: number;
  isExpanded: boolean;
  isQuarterly: boolean;
  onToggleExpand: () => void;
  onOpenArea: () => void;
  onInspectArea: () => void;
  onAddLineItem: () => void;
  children?: React.ReactNode;
}

function AreaLedgerBlock({
  area,
  assetStrength,
  liabilityLoad,
  areaHealthScore,
  equitySpread,
  delta,
  assetCount,
  liabilityCount,
  isExpanded,
  isQuarterly,
  onToggleExpand,
  onOpenArea,
  onInspectArea,
  onAddLineItem,
  children,
}: AreaLedgerBlockProps) {
  return (
    <>
      <tr className="border-t border-[#E2DCD0] bg-[#FBF9F5] hover:bg-[#F4F0E8]/45 transition-colors">
        <td className="py-3.5 pr-4 pl-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={isExpanded ? `Collapse ${area.name}` : `Expand ${area.name}`}
              className="mt-0.5 rounded p-0.5 text-[#686259] hover:bg-[#ECE6DA] hover:text-[#1C1917] cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <div>
              <button
                type="button"
                onClick={onOpenArea}
                className="font-serif text-base font-medium text-[#1C1917] hover:text-[#1B4332] hover:underline underline-offset-4 text-left cursor-pointer"
              >
                {area.name}
              </button>
              <p className="text-xs text-[#686259]">
                Weight {area.weight}/5
                <span aria-hidden="true"> · </span>
                {assetCount} assets
                <span aria-hidden="true"> · </span>
                {liabilityCount} liabilities
              </p>
            </div>
          </div>
        </td>
        <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums text-[#1B4332] whitespace-nowrap">
          {assetStrength}
        </td>
        <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums text-[#9A3412] whitespace-nowrap">
          {liabilityLoad}
        </td>
        <td className="py-3.5 px-3 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={onInspectArea}
            className="inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums hover:underline cursor-pointer"
          >
            <span className={scoreToneClass(areaHealthScore)}>{areaHealthScore}</span>
            <span className="text-xs font-normal text-[#686259]">/100</span>
          </button>
          {delta !== null && (
            <div className="font-mono text-[11px] tabular-nums text-[#686259]">
              {delta >= 0 ? `+${delta}` : delta} vs prior
            </div>
          )}
        </td>
        <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums whitespace-nowrap">
          <span
            className={
              equitySpread >= 25
                ? 'text-[#1B4332]'
                : equitySpread >= 0
                  ? 'text-[#9A6700]'
                  : 'text-[#9A3412]'
            }
          >
            {formatSpread(equitySpread)}
          </span>
        </td>
        <td className="py-3.5 pl-2 pr-3 text-right whitespace-nowrap">
          <div className="inline-flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={onOpenArea}
              className="font-medium text-[#1B4332] hover:underline cursor-pointer"
            >
              Drill down
            </button>
            {!isQuarterly && (
              <button
                type="button"
                onClick={onAddLineItem}
                className="text-[#686259] hover:text-[#1C1917] cursor-pointer"
              >
                + Item
              </button>
            )}
          </div>
        </td>
      </tr>
      {children}
    </>
  );
}
