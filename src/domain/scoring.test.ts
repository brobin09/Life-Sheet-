import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeAnalysisFlags,
  computeAreaBalanceSheet,
  computeCashFlowSummary,
  computePeriodSummary,
  computeQuarterlyRollup,
  scoreLineItem,
} from './scoring.ts';
import { createSampleLedgerState } from './seedData.ts';
import { generateOfflineSuggestions } from './suggestions.ts';
import { buildPeriodCsv } from './export.ts';
import type { LineItemDefinition, LineItemEntry } from './types.ts';

test('scoreLineItem: quantitative higher_is_better caps at 100 and scales linearly below target', () => {
  const def: LineItemDefinition = {
    id: 'a1',
    areaId: 'area-finances',
    name: 'Emergency Reserve',
    statement: 'balance_sheet',
    section: 'asset',
    valueType: 'quantitative',
    direction: 'higher_is_better',
    unit: 'months',
    defaultTarget: 6,
    defaultWeight: 5,
    tags: ['savings'],
    archived: false,
  };

  const halfEntry: LineItemEntry = {
    id: 'e1',
    periodId: '2026-11',
    lineItemId: 'a1',
    value: 3,
    target: 6,
    weight: 5,
    note: '',
    updatedAt: '2026-11-22T00:00:00Z',
  };
  const resHalf = scoreLineItem(def, halfEntry);
  assert.equal(resHalf.healthScore, 50);
  assert.equal(resHalf.liabilityLoad, 0);
  assert.ok(resHalf.explanation.formulaLabel.includes('value / target'));

  const aboveEntry: LineItemEntry = { ...halfEntry, value: 9 };
  const resAbove = scoreLineItem(def, aboveEntry);
  assert.equal(resAbove.healthScore, 100);
});

test('scoreLineItem: quantitative lower_is_better with zero target uses ceiling transparently', () => {
  const debtDef: LineItemDefinition = {
    id: 'l1',
    areaId: 'area-finances',
    name: 'Consumer Debt',
    statement: 'balance_sheet',
    section: 'liability',
    valueType: 'quantitative',
    direction: 'lower_is_better',
    unit: 'USD',
    ceiling: 10000,
    defaultTarget: 0,
    defaultWeight: 5,
    tags: ['debt'],
    archived: false,
  };

  const zeroDebt = scoreLineItem(debtDef, {
    id: 'e1',
    periodId: '2026-11',
    lineItemId: 'l1',
    value: 0,
    target: 0,
    weight: 5,
    note: '',
    updatedAt: '2026-11-22T00:00:00Z',
  });
  assert.equal(zeroDebt.healthScore, 100);
  assert.equal(zeroDebt.liabilityLoad, 0);

  const midDebt = scoreLineItem(debtDef, {
    id: 'e2',
    periodId: '2026-11',
    lineItemId: 'l1',
    value: 4000,
    target: 0,
    weight: 5,
    note: '',
    updatedAt: '2026-11-22T00:00:00Z',
  });
  assert.equal(midDebt.healthScore, 60);
  assert.equal(midDebt.liabilityLoad, 40);
});

test('scoreLineItem: qualitative rubric normalizes both higher_is_better and lower_is_better', () => {
  const sleepDef: LineItemDefinition = {
    id: 'q1',
    areaId: 'area-health',
    name: 'Sleep Quality',
    statement: 'balance_sheet',
    section: 'asset',
    valueType: 'qualitative',
    direction: 'higher_is_better',
    rubric: { anchor2: 'Poor', anchor5: 'Okay', anchor8: 'Restorative' },
    defaultTarget: 8,
    defaultWeight: 5,
    tags: ['sleep'],
    archived: false,
  };

  const sleepRes = scoreLineItem(sleepDef, {
    id: 'e1',
    periodId: '2026-11',
    lineItemId: 'q1',
    value: 4.5,
    target: 8,
    weight: 5,
    note: '',
    updatedAt: '2026-11-22T00:00:00Z',
  });
  // (4.5 - 1) / (8 - 1) = 3.5 / 7 = 50%
  assert.equal(sleepRes.healthScore, 50);
  assert.equal(sleepRes.explanation.rubric?.anchor8, 'Restorative');

  const stressDef: LineItemDefinition = {
    id: 'q2',
    areaId: 'area-health',
    name: 'Chronic Stress',
    statement: 'balance_sheet',
    section: 'liability',
    valueType: 'qualitative',
    direction: 'lower_is_better',
    rubric: { anchor2: 'Calm', anchor5: 'Moderate', anchor8: 'High' },
    defaultTarget: 2,
    defaultWeight: 5,
    tags: ['stress'],
    archived: false,
  };

  const stressRes = scoreLineItem(stressDef, {
    id: 'e2',
    periodId: '2026-11',
    lineItemId: 'q2',
    value: 6,
    target: 2,
    weight: 5,
    note: '',
    updatedAt: '2026-11-22T00:00:00Z',
  });
  // (10 - 6) / (10 - 2) = 4 / 8 = 50% health -> 50% liability load
  assert.equal(stressRes.healthScore, 50);
  assert.equal(stressRes.liabilityLoad, 50);
});

test('computeAreaBalanceSheet: weighted rollup and equity spread math', () => {
  const state = createSampleLedgerState();
  const financeArea = state.areas.find((a) => a.id === 'area-finances')!;
  const novEntries = new Map(
    state.entries.filter((e) => e.periodId === '2026-11').map((e) => [e.lineItemId, e])
  );
  const res = computeAreaBalanceSheet(financeArea, state.lineItems, novEntries);

  assert.equal(res.assets.length, 2);
  assert.equal(res.liabilities.length, 1);
  assert.ok(res.assetStrength > 80 && res.assetStrength <= 100);
  assert.ok(res.liabilityLoad > 20 && res.liabilityLoad < 35);
  assert.equal(res.equitySpread, Math.round((res.assetStrength - res.liabilityLoad) * 10) / 10);
  assert.ok(res.explanation.components.length === 3);
});

test('computeQuarterlyRollup: uses ending balance sheet snapshot and aggregates monthly cash flows', () => {
  const state = createSampleLedgerState();
  const novSummary = computePeriodSummary(state, '2026-11');
  const octSummary = computePeriodSummary(state, '2026-10');
  const q4Summary = computeQuarterlyRollup(state, '2026-Q4');

  assert.equal(q4Summary.isQuarterlyRollup, true);
  assert.deepEqual(q4Summary.includedPeriodIds, ['2026-10', '2026-11']);
  // Ending balance sheet snapshot matches November exactly
  assert.equal(q4Summary.overallLifeEquity, novSummary.overallLifeEquity);
  // Cash flow hours sum October + November
  assert.equal(
    q4Summary.ratios.totalActualHours,
    Math.round((octSummary.ratios.totalActualHours + novSummary.ratios.totalActualHours) * 10) / 10
  );
});

test('computeCashFlowSummary, flags, offline suggestions, and CSV export', () => {
  const state = createSampleLedgerState();
  const oct = computePeriodSummary(state, '2026-10');
  const nov = computePeriodSummary(state, '2026-11');

  const { ratios } = computeCashFlowSummary(
    state.areas,
    state.cashFlows.filter((c) => c.periodId === '2026-11')
  );
  assert.ok(ratios.liabilityToAssetTimeRatio !== null && ratios.liabilityToAssetTimeRatio > 0);
  assert.ok(ratios.recoveryToStrainRatio !== null && ratios.recoveryToStrainRatio > 0);
  assert.ok(ratios.intendedVsActualAdherencePercent > 0 && ratios.intendedVsActualAdherencePercent <= 100);

  const flags = computeAnalysisFlags(state, nov, oct);
  assert.ok(flags.biggestLiabilities.length > 0);
  assert.ok(flags.neglectedHighWeightAreas.length > 0);
  assert.ok(flags.biggestPositiveMovers.length > 0 || flags.biggestNegativeMovers.length > 0);

  const suggestionGroups = generateOfflineSuggestions(nov, state.goals);
  assert.ok(suggestionGroups.length > 0);
  for (const group of suggestionGroups) {
    assert.equal(group.suggestions.length, 3, `Expected 3 suggestions for ${group.areaName}`);
  }

  const csv = buildPeriodCsv(nov);
  assert.ok(csv.includes('Balance Sheet'));
  assert.ok(csv.includes('Income Statement'));
  assert.ok(csv.includes('Cash Flow (Time & Energy)'));
});
