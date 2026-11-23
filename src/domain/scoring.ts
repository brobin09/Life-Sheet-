import type {
  AnalysisFlags,
  AreaBalanceSheetResult,
  AreaCashFlowSummary,
  AreaIncomeResult,
  AreaTrendPoint,
  CashFlowAllocation,
  LedgerState,
  LifeArea,
  LifeRatios,
  LineItemDefinition,
  LineItemEntry,
  MoverFlag,
  NeglectedAreaFlag,
  Period,
  PeriodSummary,
  ScoredLineItem,
  ScoreExplanation,
  TopLiabilityFlag,
} from './types.ts';

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round0(value: number): number {
  return Math.round(value);
}

export function formatItemValue(value: number, def: LineItemDefinition): string {
  if (def.valueType === 'qualitative') {
    return `${round1(value)} / 10`;
  }
  const unit = def.unit?.trim() ?? '';
  if (unit === 'USD' || unit === '$') {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : round1(value).toLocaleString('en-US');
  return unit ? `${formatted} ${unit}` : formatted;
}

export function getQuarterKey(year: number, month: number): string {
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${q}`;
}

export function getQuarterLabel(quarterKey: string): string {
  const [year, q] = quarterKey.split('-');
  return `${q} ${year}`;
}

export function formatShortPeriodLabel(period: Period): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = monthNames[(period.month - 1) % 12] ?? String(period.month);
  return `${m} ${String(period.year).slice(-2)}`;
}

/**
 * Transparent 0-100 health score normalization for any quantitative or qualitative line item.
 * Higher score ALWAYS means healthier relative to target and direction.
 */
export function scoreLineItem(
  definition: LineItemDefinition,
  entry: LineItemEntry
): ScoredLineItem {
  const value = Number.isFinite(entry.value) ? entry.value : 0;
  const target = Number.isFinite(entry.target) ? entry.target : definition.defaultTarget;
  const weight = clamp(entry.weight || definition.defaultWeight || 3, 1, 5);
  const isNegativeSection =
    definition.section === 'liability' || definition.section === 'outflow';

  let rawScore = 0;
  let formulaLabel = '';
  const steps: string[] = [];

  if (definition.valueType === 'qualitative') {
    const clampedVal = clamp(value, 1, 10);
    const clampedTarget = clamp(target, 1, 10);

    if (definition.direction === 'higher_is_better') {
      if (clampedTarget <= 1) {
        rawScore = 100;
        formulaLabel = 'Target is 1/10 (minimum baseline) -> 100';
      } else {
        rawScore = clamp(((clampedVal - 1) / (clampedTarget - 1)) * 100, 0, 100);
        formulaLabel = 'clamp(0, 100, ((value - 1) / (target - 1)) × 100)';
      }
      steps.push(
        `Qualitative rating ${round1(clampedVal)}/10 measured against target ${round1(clampedTarget)}/10 (higher is healthier).`
      );
      steps.push(
        `Normalized scale: ((${round1(clampedVal)} − 1) ÷ (${round1(clampedTarget)} − 1)) × 100 = ${round1(rawScore)} / 100.`
      );
    } else {
      // lower_is_better on 1-10 rubric (e.g., chronic stress, friction)
      if (clampedVal <= clampedTarget) {
        rawScore = 100;
        formulaLabel = 'value <= target -> 100 (within target ceiling)';
        steps.push(
          `Qualitative strain rating ${round1(clampedVal)}/10 is at or below target ${round1(clampedTarget)}/10 (lower is healthier).`
        );
        steps.push(`Within target band -> 100 / 100 health (0 drag).`);
      } else {
        const denom = Math.max(1, 10 - clampedTarget);
        rawScore = clamp(((10 - clampedVal) / denom) * 100, 0, 100);
        formulaLabel = 'clamp(0, 100, ((10 - value) / (10 - target)) × 100)';
        steps.push(
          `Qualitative strain rating ${round1(clampedVal)}/10 exceeds target ${round1(clampedTarget)}/10 (lower is healthier).`
        );
        steps.push(
          `Linearly scaled toward 10/10 ceiling: ((10 − ${round1(clampedVal)}) ÷ (10 − ${round1(clampedTarget)})) × 100 = ${round1(rawScore)} / 100.`
        );
      }
    }
  } else {
    // Quantitative
    if (definition.direction === 'higher_is_better') {
      if (target <= 0) {
        rawScore = value >= target ? 100 : 0;
        formulaLabel = 'value >= target -> 100, else 0';
        steps.push(
          `Value ${formatItemValue(value, definition)} compared against baseline target ${formatItemValue(target, definition)}.`
        );
      } else {
        rawScore = clamp((value / target) * 100, 0, 100);
        formulaLabel = 'clamp(0, 100, (value / target) × 100)';
        steps.push(
          `Actual ${formatItemValue(value, definition)} divided by target ${formatItemValue(target, definition)} (higher is healthier).`
        );
        steps.push(
          `(${round1(value)} ÷ ${round1(target)}) × 100 = ${round1((value / target) * 100)}, capped at 100 -> ${round1(rawScore)} / 100.`
        );
      }
    } else {
      // Quantitative lower_is_better (e.g., debt, deferred maintenance items, admin hours)
      if (value <= target) {
        rawScore = 100;
        formulaLabel = 'value <= target -> 100 (at or below limit)';
        steps.push(
          `Actual ${formatItemValue(value, definition)} is at or below target ceiling ${formatItemValue(target, definition)} (lower is healthier).`
        );
        steps.push(`At or better than target -> 100 / 100 health.`);
      } else if (target <= 0) {
        const ceiling = definition.ceiling && definition.ceiling > 0 ? definition.ceiling : Math.max(value * 2, 10);
        rawScore = clamp((1 - value / ceiling) * 100, 0, 100);
        formulaLabel = 'clamp(0, 100, (1 - value / referenceCeiling) × 100)';
        steps.push(
          `Zero-target item with actual ${formatItemValue(value, definition)} measured against reference ceiling ${formatItemValue(ceiling, definition)}.`
        );
        steps.push(
          `(1 − (${round1(value)} ÷ ${round1(ceiling)})) × 100 = ${round1(rawScore)} / 100.`
        );
      } else {
        rawScore = clamp((target / value) * 100, 0, 100);
        formulaLabel = 'clamp(0, 100, (target / value) × 100)';
        steps.push(
          `Actual ${formatItemValue(value, definition)} exceeds target ceiling ${formatItemValue(target, definition)} (lower is healthier).`
        );
        steps.push(
          `(${round1(target)} ÷ ${round1(value)}) × 100 = ${round1(rawScore)} / 100.`
        );
      }
    }
  }

  const healthScore = round1(rawScore);
  const liabilityLoad = isNegativeSection ? round1(100 - healthScore) : 0;

  let statusLabel: ScoredLineItem['statusLabel'] = 'Steady';
  if (isNegativeSection) {
    if (healthScore >= 80) statusLabel = 'On target';
    else if (healthScore >= 55) statusLabel = 'Steady';
    else if (healthScore >= 35) statusLabel = 'Needs attention';
    else statusLabel = 'Elevated drag';
  } else {
    if (healthScore >= 85) statusLabel = 'On target';
    else if (healthScore >= 65) statusLabel = 'Steady';
    else statusLabel = 'Needs attention';
  }

  const explanation: ScoreExplanation = {
    title: definition.name,
    subtitle: `${definition.section.toUpperCase()} · ${definition.valueType === 'quantitative' ? 'Quantitative' : 'Qualitative Rubric (1–10)'}`,
    formulaLabel,
    steps,
    components: [
      { label: 'Recorded value', value: formatItemValue(value, definition) },
      { label: 'Target value', value: formatItemValue(target, definition) },
      ...(definition.direction === 'lower_is_better' && target === 0 && definition.ceiling
        ? [{ label: 'Reference ceiling', value: formatItemValue(definition.ceiling, definition) }]
        : []),
      { label: 'Importance weight', value: `${weight} / 5` },
      ...(isNegativeSection
        ? [{ label: 'Implied drag load (100 − health)', value: `${liabilityLoad} / 100` }]
        : []),
    ],
    resultLabel: 'Normalized Item Health',
    resultScore: healthScore,
    rubric: definition.rubric,
  };

  return {
    definition,
    entry: { ...entry, weight },
    healthScore,
    liabilityLoad,
    statusLabel,
    explanation,
  };
}

function weightedAverage(items: Array<{ score: number; weight: number }>): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  const weightedSum = items.reduce((sum, item) => sum + item.score * item.weight, 0);
  return round1(weightedSum / totalWeight);
}

export function computeAreaBalanceSheet(
  area: LifeArea,
  definitions: LineItemDefinition[],
  entryByItemId: Map<string, LineItemEntry>
): AreaBalanceSheetResult {
  const areaDefs = definitions.filter(
    (d) => !d.archived && d.areaId === area.id && d.statement === 'balance_sheet'
  );

  const scored: ScoredLineItem[] = [];
  for (const def of areaDefs) {
    const entry = entryByItemId.get(def.id);
    if (entry) {
      scored.push(scoreLineItem(def, entry));
    }
  }

  const assets = scored.filter((s) => s.definition.section === 'asset');
  const liabilities = scored.filter((s) => s.definition.section === 'liability');

  const assetStrength =
    assets.length > 0
      ? weightedAverage(assets.map((a) => ({ score: a.healthScore, weight: a.entry.weight })))
      : 0;

  const liabilityHealth =
    liabilities.length > 0
      ? weightedAverage(liabilities.map((l) => ({ score: l.healthScore, weight: l.entry.weight })))
      : 100;

  const liabilityLoad = liabilities.length > 0 ? round1(100 - liabilityHealth) : 0;

  const totalItemWeight = scored.reduce((sum, item) => sum + item.entry.weight, 0);
  const areaHealthScore =
    scored.length > 0
      ? weightedAverage(scored.map((s) => ({ score: s.healthScore, weight: s.entry.weight })))
      : 0;

  const equitySpread =
    assets.length > 0 || liabilities.length > 0
      ? round1(assetStrength - liabilityLoad)
      : 0;

  const explanation: ScoreExplanation = {
    title: `${area.name} — Balance Sheet Score`,
    subtitle: `Area weight ${area.weight}/5 · ${assets.length} assets, ${liabilities.length} liabilities`,
    formulaLabel: 'Σ(itemHealth × itemWeight) ÷ Σ(itemWeight)',
    steps: [
      `Asset Strength is the weighted health of ${assets.length} asset item(s): ${assetStrength} / 100.`,
      `Liability Load is 100 minus the weighted health of ${liabilities.length} liability item(s) (${liabilityHealth}): ${liabilityLoad} / 100.`,
      `Equity Spread = Asset Strength (${assetStrength}) − Liability Load (${liabilityLoad}) = ${equitySpread >= 0 ? `+${equitySpread}` : equitySpread}.`,
      `Area Health Score rolls up all ${scored.length} Balance Sheet items by weight (total weight ${totalItemWeight}) -> ${areaHealthScore} / 100.`,
    ],
    components: scored.map((item) => ({
      label: `${item.definition.name} (${item.definition.section})`,
      value: `${item.healthScore} / 100`,
      weight: item.entry.weight,
      contribution:
        totalItemWeight > 0
          ? `${round1((item.healthScore * item.entry.weight) / totalItemWeight)} pts`
          : '0 pts',
    })),
    resultLabel: 'Area Health Score',
    resultScore: areaHealthScore,
  };

  return {
    area,
    assets,
    liabilities,
    assetStrength,
    liabilityHealth,
    liabilityLoad,
    areaHealthScore,
    equitySpread,
    totalItemWeight,
    explanation,
  };
}

export function computeAreaIncome(
  area: LifeArea,
  definitions: LineItemDefinition[],
  entryByItemId: Map<string, LineItemEntry>
): AreaIncomeResult {
  const areaDefs = definitions.filter(
    (d) => !d.archived && d.areaId === area.id && d.statement === 'income_statement'
  );

  const scored: ScoredLineItem[] = [];
  for (const def of areaDefs) {
    const entry = entryByItemId.get(def.id);
    if (entry) {
      scored.push(scoreLineItem(def, entry));
    }
  }

  const inflows = scored.filter((s) => s.definition.section === 'inflow');
  const outflows = scored.filter((s) => s.definition.section === 'outflow');

  const inflowScore =
    inflows.length > 0
      ? weightedAverage(inflows.map((i) => ({ score: i.healthScore, weight: i.entry.weight })))
      : 0;

  const outflowHealth =
    outflows.length > 0
      ? weightedAverage(outflows.map((o) => ({ score: o.healthScore, weight: o.entry.weight })))
      : 100;

  const outflowLoad = outflows.length > 0 ? round1(100 - outflowHealth) : 0;
  const totalWeight = scored.reduce((sum, s) => sum + s.entry.weight, 0);
  const netIncomeScore =
    scored.length > 0
      ? weightedAverage(scored.map((s) => ({ score: s.healthScore, weight: s.entry.weight })))
      : 0;
  const netFlowSpread =
    inflows.length > 0 || outflows.length > 0 ? round1(inflowScore - outflowLoad) : 0;

  const explanation: ScoreExplanation = {
    title: `${area.name} — Income Statement Score`,
    subtitle: `${inflows.length} inflows, ${outflows.length} outflows`,
    formulaLabel: 'Σ(flowHealth × weight) ÷ Σ(weight)',
    steps: [
      `Inflow Score (weighted average of period inflows): ${inflowScore} / 100.`,
      `Outflow Load (100 − weighted outflow health ${outflowHealth}): ${outflowLoad} / 100.`,
      `Net Flow Spread = Inflows (${inflowScore}) − Outflow Load (${outflowLoad}) = ${netFlowSpread >= 0 ? `+${netFlowSpread}` : netFlowSpread}.`,
    ],
    components: scored.map((item) => ({
      label: `${item.definition.name} (${item.definition.section})`,
      value: `${item.healthScore} / 100`,
      weight: item.entry.weight,
      contribution:
        totalWeight > 0
          ? `${round1((item.healthScore * item.entry.weight) / totalWeight)} pts`
          : '0 pts',
    })),
    resultLabel: 'Period Flow Health',
    resultScore: netIncomeScore,
  };

  return {
    area,
    inflows,
    outflows,
    inflowScore,
    outflowHealth,
    outflowLoad,
    netIncomeScore,
    netFlowSpread,
    explanation,
  };
}

export function computeCashFlowSummary(
  areas: LifeArea[],
  allocations: CashFlowAllocation[]
): { areaCashFlows: AreaCashFlowSummary[]; ratios: LifeRatios } {
  const byAreaId = new Map<string, CashFlowAllocation>();
  for (const alloc of allocations) {
    byAreaId.set(alloc.areaId, alloc);
  }

  const areaCashFlows: AreaCashFlowSummary[] = areas.map((area) => {
    const allocation: CashFlowAllocation = byAreaId.get(area.id) ?? {
      id: `empty-${area.id}`,
      periodId: '',
      areaId: area.id,
      intendedHours: 0,
      actualHours: 0,
      assetHours: 0,
      liabilityHours: 0,
      recoveryHours: 0,
      strainHours: 0,
      energyNet: 0,
      note: '',
    };

    const varianceHours = round1(allocation.actualHours - allocation.intendedHours);
    let adherencePercent = 100;
    if (allocation.intendedHours > 0) {
      const diffRatio = Math.abs(allocation.actualHours - allocation.intendedHours) / allocation.intendedHours;
      adherencePercent = round1(clamp((1 - diffRatio) * 100, 0, 100));
    } else if (allocation.actualHours > 0) {
      adherencePercent = 0;
    }

    const alTotal = allocation.assetHours + allocation.liabilityHours;
    const liabilitySharePercent = alTotal > 0 ? round1((allocation.liabilityHours / alTotal) * 100) : 0;

    const rsTotal = allocation.recoveryHours + allocation.strainHours;
    const recoverySharePercent = rsTotal > 0 ? round1((allocation.recoveryHours / rsTotal) * 100) : 0;

    return {
      area,
      allocation,
      varianceHours,
      adherencePercent,
      liabilitySharePercent,
      recoverySharePercent,
    };
  });

  const totalIntendedHours = round1(
    areaCashFlows.reduce((sum, a) => sum + a.allocation.intendedHours, 0)
  );
  const totalActualHours = round1(
    areaCashFlows.reduce((sum, a) => sum + a.allocation.actualHours, 0)
  );
  const totalAssetHours = round1(
    areaCashFlows.reduce((sum, a) => sum + a.allocation.assetHours, 0)
  );
  const totalLiabilityHours = round1(
    areaCashFlows.reduce((sum, a) => sum + a.allocation.liabilityHours, 0)
  );
  const totalRecoveryHours = round1(
    areaCashFlows.reduce((sum, a) => sum + a.allocation.recoveryHours, 0)
  );
  const totalStrainHours = round1(
    areaCashFlows.reduce((sum, a) => sum + a.allocation.strainHours, 0)
  );

  const liabilityToAssetTimeRatio =
    totalAssetHours > 0 ? round1(totalLiabilityHours / totalAssetHours) : null;
  const alSum = totalAssetHours + totalLiabilityHours;
  const liabilityTimeSharePercent = alSum > 0 ? round1((totalLiabilityHours / alSum) * 100) : 0;
  const assetTimeSharePercent = alSum > 0 ? round1((totalAssetHours / alSum) * 100) : 0;

  const recoveryToStrainRatio =
    totalStrainHours > 0 ? round1(totalRecoveryHours / totalStrainHours) : null;

  // Weighted adherence by intended hours across areas so small areas don't skew alignment
  const totalAbsVariance = areaCashFlows.reduce(
    (sum, item) => sum + Math.abs(item.allocation.actualHours - item.allocation.intendedHours),
    0
  );
  const intendedVsActualAdherencePercent =
    totalIntendedHours > 0
      ? round1(clamp((1 - totalAbsVariance / totalIntendedHours) * 100, 0, 100))
      : 100;

  const ratios: LifeRatios = {
    liabilityToAssetTimeRatio,
    liabilityTimeSharePercent,
    assetTimeSharePercent,
    recoveryToStrainRatio,
    intendedVsActualAdherencePercent,
    totalIntendedHours,
    totalActualHours,
    totalAssetHours,
    totalLiabilityHours,
    totalRecoveryHours,
    totalStrainHours,
    explanations: {
      liabilityVsAsset: {
        title: 'Liability vs. Asset Time Ratio',
        subtitle: 'Share of tracked hours servicing obligations vs. building capacity',
        formulaLabel: 'totalLiabilityHours ÷ totalAssetHours',
        steps: [
          `Asset-building hours across all areas: ${totalAssetHours} hrs.`,
          `Liability-servicing hours across all areas: ${totalLiabilityHours} hrs.`,
          liabilityToAssetTimeRatio !== null
            ? `Ratio = ${totalLiabilityHours} ÷ ${totalAssetHours} = ${liabilityToAssetTimeRatio}x (${liabilityTimeSharePercent}% liabilities, ${assetTimeSharePercent}% assets).`
            : 'No asset hours logged yet.',
        ],
        components: [
          { label: 'Asset-building hours', value: `${totalAssetHours} hrs` },
          { label: 'Liability-servicing hours', value: `${totalLiabilityHours} hrs` },
        ],
        resultLabel: 'Asset Share of Time',
        resultScore: assetTimeSharePercent,
      },
      recoveryVsStrain: {
        title: 'Recovery vs. Strain Ratio',
        subtitle: 'Restorative energy hours relative to depleting strain hours',
        formulaLabel: 'totalRecoveryHours ÷ totalStrainHours',
        steps: [
          `Recovery hours logged across all areas: ${totalRecoveryHours} hrs.`,
          `Strain hours logged across all areas: ${totalStrainHours} hrs.`,
          recoveryToStrainRatio !== null
            ? `Ratio = ${totalRecoveryHours} ÷ ${totalStrainHours} = ${recoveryToStrainRatio}x recovery per unit of strain.`
            : 'No strain hours logged yet.',
        ],
        components: [
          { label: 'Recovery hours', value: `${totalRecoveryHours} hrs` },
          { label: 'Strain hours', value: `${totalStrainHours} hrs` },
        ],
        resultLabel: 'Recovery Share',
        resultScore:
          totalRecoveryHours + totalStrainHours > 0
            ? round1((totalRecoveryHours / (totalRecoveryHours + totalStrainHours)) * 100)
            : 0,
      },
      intendedVsActual: {
        title: 'Intended vs. Actual Hours Alignment',
        subtitle: 'How closely actual time matched your planned allocation',
        formulaLabel: 'clamp(0, 100, (1 − Σ|actual − intended| ÷ Σintended) × 100)',
        steps: [
          `Total intended hours across areas: ${totalIntendedHours} hrs.`,
          `Total actual hours logged: ${totalActualHours} hrs.`,
          `Sum of absolute area variances: ${round1(totalAbsVariance)} hrs.`,
          `Alignment = (1 − (${round1(totalAbsVariance)} ÷ ${totalIntendedHours || 1})) × 100 = ${intendedVsActualAdherencePercent}%.`,
        ],
        components: [
          { label: 'Total intended', value: `${totalIntendedHours} hrs` },
          { label: 'Total actual', value: `${totalActualHours} hrs` },
          { label: 'Absolute area variance', value: `${round1(totalAbsVariance)} hrs` },
        ],
        resultLabel: 'Time Alignment',
        resultScore: intendedVsActualAdherencePercent,
      },
    },
  };

  return { areaCashFlows, ratios };
}

function buildPeriodSummaryFromEntries(
  periodId: string,
  label: string,
  isQuarterlyRollup: boolean,
  includedPeriodIds: string[],
  areas: LifeArea[],
  lineItems: LineItemDefinition[],
  balanceEntries: LineItemEntry[],
  incomeEntries: LineItemEntry[],
  allocations: CashFlowAllocation[]
): PeriodSummary {
  const activeAreas = areas
    .filter((a) => !a.archived)
    .sort((a, b) => a.order - b.order);

  const balanceEntryMap = new Map<string, LineItemEntry>();
  for (const e of balanceEntries) {
    balanceEntryMap.set(e.lineItemId, e);
  }

  const incomeEntryMap = new Map<string, LineItemEntry>();
  for (const e of incomeEntries) {
    incomeEntryMap.set(e.lineItemId, e);
  }

  const areaBalanceSheets = activeAreas.map((area) =>
    computeAreaBalanceSheet(area, lineItems, balanceEntryMap)
  );
  const areaIncomeStatements = activeAreas.map((area) =>
    computeAreaIncome(area, lineItems, incomeEntryMap)
  );
  const { areaCashFlows, ratios } = computeCashFlowSummary(activeAreas, allocations);

  const populatedBalanceAreas = areaBalanceSheets.filter(
    (a) => a.assets.length + a.liabilities.length > 0
  );
  const totalAreaWeight = populatedBalanceAreas.reduce((sum, a) => sum + a.area.weight, 0);

  const overallLifeEquity = weightedAverage(
    populatedBalanceAreas.map((a) => ({ score: a.areaHealthScore, weight: a.area.weight }))
  );

  const areasWithAssets = areaBalanceSheets.filter((a) => a.assets.length > 0);
  const overallAssetStrength = weightedAverage(
    areasWithAssets.map((a) => ({ score: a.assetStrength, weight: a.area.weight }))
  );

  const areasWithLiabilities = areaBalanceSheets.filter((a) => a.liabilities.length > 0);
  const overallLiabilityHealth =
    areasWithLiabilities.length > 0
      ? weightedAverage(
          areasWithLiabilities.map((a) => ({ score: a.liabilityHealth, weight: a.area.weight }))
        )
      : 100;
  const overallLiabilityLoad =
    areasWithLiabilities.length > 0 ? round1(100 - overallLiabilityHealth) : 0;

  const overallEquitySpread = round1(overallAssetStrength - overallLiabilityLoad);

  const populatedIncomeAreas = areaIncomeStatements.filter(
    (a) => a.inflows.length + a.outflows.length > 0
  );
  const totalIncomeAreaWeight = populatedIncomeAreas.reduce((sum, a) => sum + a.area.weight, 0);
  const overallIncomeNetScore = weightedAverage(
    populatedIncomeAreas.map((a) => ({ score: a.netIncomeScore, weight: a.area.weight }))
  );
  const overallInflowScore = weightedAverage(
    populatedIncomeAreas
      .filter((a) => a.inflows.length > 0)
      .map((a) => ({ score: a.inflowScore, weight: a.area.weight }))
  );
  const overallOutflowLoad = weightedAverage(
    populatedIncomeAreas
      .filter((a) => a.outflows.length > 0)
      .map((a) => ({ score: a.outflowLoad, weight: a.area.weight }))
  );
  const overallIncomeSpread = round1(overallInflowScore - overallOutflowLoad);

  const equityExplanation: ScoreExplanation = {
    title: `Overall Life Equity — ${label}`,
    subtitle: isQuarterlyRollup
      ? `Quarterly rollup using ending balance sheet snapshot (${includedPeriodIds.length} month(s))`
      : `Weighted rollup across ${populatedBalanceAreas.length} active life areas`,
    formulaLabel: 'Σ(areaHealthScore × areaWeight) ÷ Σ(areaWeight)',
    steps: [
      `Each active life area is weighted by your importance setting (total weight ${totalAreaWeight}).`,
      `Overall Asset Strength: ${overallAssetStrength} / 100 · Overall Liability Load: ${overallLiabilityLoad} / 100.`,
      `Net Equity Spread = ${overallAssetStrength} − ${overallLiabilityLoad} = ${overallEquitySpread >= 0 ? `+${overallEquitySpread}` : overallEquitySpread}.`,
      `Overall Life Equity Score = ${overallLifeEquity} / 100.`,
    ],
    components: populatedBalanceAreas.map((a) => ({
      label: a.area.name,
      value: `${a.areaHealthScore} / 100 (spread ${a.equitySpread >= 0 ? `+${a.equitySpread}` : a.equitySpread})`,
      weight: a.area.weight,
      contribution:
        totalAreaWeight > 0
          ? `${round1((a.areaHealthScore * a.area.weight) / totalAreaWeight)} pts`
          : '0 pts',
    })),
    resultLabel: 'Overall Life Equity',
    resultScore: overallLifeEquity,
  };

  const incomeExplanation: ScoreExplanation = {
    title: `Period Income Statement — ${label}`,
    subtitle: isQuarterlyRollup
      ? `Aggregated across ${includedPeriodIds.length} monthly period(s)`
      : `Weighted flow health across ${populatedIncomeAreas.length} areas`,
    formulaLabel: 'Σ(areaIncomeHealth × areaWeight) ÷ Σ(areaWeight)',
    steps: [
      `Overall Inflow Score: ${overallInflowScore} / 100 · Overall Outflow Load: ${overallOutflowLoad} / 100.`,
      `Net Flow Spread: ${overallIncomeSpread >= 0 ? `+${overallIncomeSpread}` : overallIncomeSpread}.`,
      `Weighted Income Health across ${populatedIncomeAreas.length} areas -> ${overallIncomeNetScore} / 100.`,
    ],
    components: populatedIncomeAreas.map((a) => ({
      label: a.area.name,
      value: `${a.netIncomeScore} / 100`,
      weight: a.area.weight,
      contribution:
        totalIncomeAreaWeight > 0
          ? `${round1((a.netIncomeScore * a.area.weight) / totalIncomeAreaWeight)} pts`
          : '0 pts',
    })),
    resultLabel: 'Net Period Flow Health',
    resultScore: overallIncomeNetScore,
  };

  return {
    periodId,
    label,
    isQuarterlyRollup,
    includedPeriodIds,
    overallLifeEquity,
    overallAssetStrength,
    overallLiabilityHealth,
    overallLiabilityLoad,
    overallEquitySpread,
    overallIncomeNetScore,
    overallIncomeSpread,
    areaBalanceSheets,
    areaIncomeStatements,
    areaCashFlows,
    ratios,
    equityExplanation,
    incomeExplanation,
  };
}

export function sortPeriodsChronologically(periods: Period[]): Period[] {
  return [...periods].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

export function computePeriodSummary(state: LedgerState, periodId: string): PeriodSummary {
  const period = state.periods.find((p) => p.id === periodId);
  const label = period ? period.label : periodId;
  const periodEntries = state.entries.filter((e) => e.periodId === periodId);
  const periodCashFlows = state.cashFlows.filter((c) => c.periodId === periodId);

  return buildPeriodSummaryFromEntries(
    periodId,
    label,
    false,
    [periodId],
    state.areas,
    state.lineItems,
    periodEntries,
    periodEntries,
    periodCashFlows
  );
}

/**
 * Quarterly Rollup:
 * - Balance Sheet uses the ending (most recent) period snapshot in the quarter (true accounting standard).
 * - Income Statement aggregates quantitative inflows/outflows (summing values and targets across months in the quarter)
 *   and averages qualitative ratings across the months in the quarter.
 * - Cash Flow sums hours across all months in the quarter and averages energyNet.
 */
export function computeQuarterlyRollup(state: LedgerState, quarterKey: string): PeriodSummary {
  const quarterPeriods = sortPeriodsChronologically(
    state.periods.filter((p) => p.quarter === quarterKey)
  );

  if (quarterPeriods.length === 0) {
    return buildPeriodSummaryFromEntries(
      quarterKey,
      getQuarterLabel(quarterKey),
      true,
      [],
      state.areas,
      state.lineItems,
      [],
      [],
      []
    );
  }

  const endingPeriod = quarterPeriods[quarterPeriods.length - 1];
  const includedIds = quarterPeriods.map((p) => p.id);
  const includedSet = new Set(includedIds);

  // Ending snapshot for balance sheet
  const endingEntries = state.entries.filter((e) => e.periodId === endingPeriod.id);

  // Aggregated entries for income statement
  const defMap = new Map(state.lineItems.map((d) => [d.id, d]));
  const incomeEntriesByItem = new Map<string, LineItemEntry[]>();
  for (const entry of state.entries) {
    if (!includedSet.has(entry.periodId)) continue;
    const def = defMap.get(entry.lineItemId);
    if (!def || def.statement !== 'income_statement') continue;
    const list = incomeEntriesByItem.get(entry.lineItemId) ?? [];
    list.push(entry);
    incomeEntriesByItem.set(entry.lineItemId, list);
  }

  const aggregatedIncomeEntries: LineItemEntry[] = [];
  for (const [lineItemId, list] of incomeEntriesByItem.entries()) {
    const def = defMap.get(lineItemId)!;
    const latest = list[list.length - 1];
    const isAverageUnit =
      def.valueType === 'qualitative' ||
      (def.unit && /\/wk|\/week|\/day|%|ratio/i.test(def.unit));

    const aggValue = isAverageUnit
      ? round1(list.reduce((s, e) => s + e.value, 0) / list.length)
      : round1(list.reduce((s, e) => s + e.value, 0));

    const aggTarget = isAverageUnit
      ? round1(list.reduce((s, e) => s + e.target, 0) / list.length)
      : round1(list.reduce((s, e) => s + e.target, 0));

    aggregatedIncomeEntries.push({
      id: `q-${quarterKey}-${lineItemId}`,
      periodId: quarterKey,
      lineItemId,
      value: aggValue,
      target: aggTarget,
      weight: latest.weight,
      note: `${list.length}-month ${isAverageUnit ? 'average' : 'cumulative total'}`,
      updatedAt: latest.updatedAt,
    });
  }

  // Sum cash flow hours across months in quarter
  const cfByArea = new Map<string, CashFlowAllocation[]>();
  for (const cf of state.cashFlows) {
    if (!includedSet.has(cf.periodId)) continue;
    const list = cfByArea.get(cf.areaId) ?? [];
    list.push(cf);
    cfByArea.set(cf.areaId, list);
  }

  const aggregatedCashFlows: CashFlowAllocation[] = [];
  for (const [areaId, list] of cfByArea.entries()) {
    aggregatedCashFlows.push({
      id: `q-cf-${quarterKey}-${areaId}`,
      periodId: quarterKey,
      areaId,
      intendedHours: round1(list.reduce((s, c) => s + c.intendedHours, 0)),
      actualHours: round1(list.reduce((s, c) => s + c.actualHours, 0)),
      assetHours: round1(list.reduce((s, c) => s + c.assetHours, 0)),
      liabilityHours: round1(list.reduce((s, c) => s + c.liabilityHours, 0)),
      recoveryHours: round1(list.reduce((s, c) => s + c.recoveryHours, 0)),
      strainHours: round1(list.reduce((s, c) => s + c.strainHours, 0)),
      energyNet: round1(list.reduce((s, c) => s + c.energyNet, 0) / list.length),
      note: `Aggregated across ${list.length} month(s)`,
    });
  }

  return buildPeriodSummaryFromEntries(
    quarterKey,
    `${getQuarterLabel(quarterKey)} (${quarterPeriods.length} mo)`,
    true,
    includedIds,
    state.areas,
    state.lineItems,
    endingEntries,
    aggregatedIncomeEntries,
    aggregatedCashFlows
  );
}

export function getAvailableQuarters(periods: Period[]): string[] {
  const ordered = sortPeriodsChronologically(periods);
  const seen = new Set<string>();
  const quarters: string[] = [];
  for (const p of ordered) {
    if (!seen.has(p.quarter)) {
      seen.add(p.quarter);
      quarters.push(p.quarter);
    }
  }
  return quarters;
}

export function computeMonthlyTrends(state: LedgerState): AreaTrendPoint[] {
  const ordered = sortPeriodsChronologically(state.periods);
  return ordered.map((period) => {
    const summary = computePeriodSummary(state, period.id);
    const areaScores: Record<string, number> = {};
    for (const areaBs of summary.areaBalanceSheets) {
      areaScores[areaBs.area.id] = areaBs.areaHealthScore;
    }
    return {
      periodId: period.id,
      label: period.label,
      shortLabel: formatShortPeriodLabel(period),
      lifeEquity: summary.overallLifeEquity,
      equitySpread: summary.overallEquitySpread,
      areaScores,
    };
  });
}

export function computeQuarterlyTrends(state: LedgerState): AreaTrendPoint[] {
  const quarters = getAvailableQuarters(state.periods);
  return quarters.map((q) => {
    const summary = computeQuarterlyRollup(state, q);
    const areaScores: Record<string, number> = {};
    for (const areaBs of summary.areaBalanceSheets) {
      areaScores[areaBs.area.id] = areaBs.areaHealthScore;
    }
    return {
      periodId: q,
      label: summary.label,
      shortLabel: getQuarterLabel(q),
      lifeEquity: summary.overallLifeEquity,
      equitySpread: summary.overallEquitySpread,
      areaScores,
    };
  });
}

export function computeAnalysisFlags(
  state: LedgerState,
  currentSummary: PeriodSummary,
  previousSummary: PeriodSummary | null
): AnalysisFlags {
  // 1. Biggest liabilities (ranked by liabilityLoad * weight)
  const liabilityCandidates: TopLiabilityFlag[] = [];
  for (const areaBs of currentSummary.areaBalanceSheets) {
    for (const item of areaBs.liabilities) {
      if (item.liabilityLoad > 0) {
        liabilityCandidates.push({
          lineItemId: item.definition.id,
          lineItemName: item.definition.name,
          areaId: areaBs.area.id,
          areaName: areaBs.area.name,
          liabilityLoad: item.liabilityLoad,
          healthScore: item.healthScore,
          weight: item.entry.weight,
          impactIndex: round1(item.liabilityLoad * item.entry.weight),
          valueLabel: formatItemValue(item.entry.value, item.definition),
          targetLabel: formatItemValue(item.entry.target, item.definition),
        });
      }
    }
  }
  const biggestLiabilities = liabilityCandidates
    .sort((a, b) => b.impactIndex - a.impactIndex)
    .slice(0, 4);

  // 2. Most neglected high-weight areas (weight >= 4 and either score < 70 or actualHours < 80% of intended)
  const cfByArea = new Map(currentSummary.areaCashFlows.map((c) => [c.area.id, c]));
  const neglectedCandidates: Array<NeglectedAreaFlag & { priority: number }> = [];

  for (const areaBs of currentSummary.areaBalanceSheets) {
    const cf = cfByArea.get(areaBs.area.id);
    const intended = cf?.allocation.intendedHours ?? 0;
    const actual = cf?.allocation.actualHours ?? 0;
    const timeShortfallRatio = intended > 0 ? Math.max(0, (intended - actual) / intended) : 0;

    if (areaBs.area.weight >= 3 && (areaBs.areaHealthScore < 72 || timeShortfallRatio >= 0.2)) {
      const reasons: string[] = [];
      if (areaBs.areaHealthScore < 72) {
        reasons.push(`Health score ${areaBs.areaHealthScore}/100`);
      }
      if (timeShortfallRatio >= 0.2 && intended > 0) {
        reasons.push(`${actual} of ${intended} intended hrs logged`);
      }
      const gap = Math.max(0, 100 - areaBs.areaHealthScore) + timeShortfallRatio * 40;
      neglectedCandidates.push({
        areaId: areaBs.area.id,
        areaName: areaBs.area.name,
        weight: areaBs.area.weight,
        areaHealthScore: areaBs.areaHealthScore,
        intendedHours: intended,
        actualHours: actual,
        reason: reasons.join(' · '),
        priority: gap * areaBs.area.weight,
      });
    }
  }

  const neglectedHighWeightAreas: NeglectedAreaFlag[] = neglectedCandidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ priority: _p, ...rest }) => rest);

  // 3. Biggest movers since previous period
  const biggestPositiveMovers: MoverFlag[] = [];
  const biggestNegativeMovers: MoverFlag[] = [];

  if (previousSummary) {
    const prevScoredMap = new Map<string, ScoredLineItem>();
    for (const a of previousSummary.areaBalanceSheets) {
      for (const item of [...a.assets, ...a.liabilities]) {
        prevScoredMap.set(item.definition.id, item);
      }
    }
    for (const a of previousSummary.areaIncomeStatements) {
      for (const item of [...a.inflows, ...a.outflows]) {
        prevScoredMap.set(item.definition.id, item);
      }
    }

    const areaNameMap = new Map(state.areas.map((a) => [a.id, a.name]));
    const movers: MoverFlag[] = [];

    const allCurrent: ScoredLineItem[] = [
      ...currentSummary.areaBalanceSheets.flatMap((a) => [...a.assets, ...a.liabilities]),
      ...currentSummary.areaIncomeStatements.flatMap((a) => [...a.inflows, ...a.outflows]),
    ];

    for (const curr of allCurrent) {
      const prev = prevScoredMap.get(curr.definition.id);
      if (!prev) continue;
      const delta = round1(curr.healthScore - prev.healthScore);
      if (Math.abs(delta) >= 2) {
        movers.push({
          lineItemId: curr.definition.id,
          lineItemName: curr.definition.name,
          areaId: curr.definition.areaId,
          areaName: areaNameMap.get(curr.definition.areaId) ?? '',
          section: curr.definition.section,
          previousScore: prev.healthScore,
          currentScore: curr.healthScore,
          delta,
          previousValueLabel: formatItemValue(prev.entry.value, prev.definition),
          currentValueLabel: formatItemValue(curr.entry.value, curr.definition),
        });
      }
    }

    biggestPositiveMovers.push(
      ...movers
        .filter((m) => m.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 3)
    );
    biggestNegativeMovers.push(
      ...movers
        .filter((m) => m.delta < 0)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 3)
    );
  }

  return {
    biggestLiabilities,
    neglectedHighWeightAreas,
    biggestPositiveMovers,
    biggestNegativeMovers,
  };
}
