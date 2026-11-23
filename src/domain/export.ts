import { formatItemValue } from './scoring.ts';
import type { LedgerState, PeriodSummary } from './types.ts';

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildPeriodCsv(summary: PeriodSummary): string {
  const rows: string[][] = [
    [
      'Period',
      'Statement',
      'Life Area',
      'Section',
      'Line Item',
      'Value Type',
      'Recorded Value',
      'Target',
      'Weight (1-5)',
      'Normalized Health (0-100)',
      'Drag Load (0-100)',
      'Status',
      'Note',
    ],
  ];

  // Overall Summary Rows
  rows.push([
    summary.label,
    'Summary',
    'Overall Life Equity',
    'equity',
    'Overall Weighted Life Equity Score',
    'normalized',
    String(summary.overallLifeEquity),
    '100',
    '-',
    String(summary.overallLifeEquity),
    String(summary.overallLiabilityLoad),
    `Spread ${summary.overallEquitySpread >= 0 ? `+${summary.overallEquitySpread}` : summary.overallEquitySpread}`,
    `Asset Strength ${summary.overallAssetStrength} · Liability Load ${summary.overallLiabilityLoad}`,
  ]);

  // Balance Sheet rows
  for (const areaBs of summary.areaBalanceSheets) {
    for (const item of [...areaBs.assets, ...areaBs.liabilities]) {
      rows.push([
        summary.label,
        'Balance Sheet',
        areaBs.area.name,
        item.definition.section,
        item.definition.name,
        item.definition.valueType,
        formatItemValue(item.entry.value, item.definition),
        formatItemValue(item.entry.target, item.definition),
        String(item.entry.weight),
        String(item.healthScore),
        String(item.liabilityLoad),
        item.statusLabel,
        item.entry.note,
      ]);
    }
  }

  // Income Statement rows
  for (const areaInc of summary.areaIncomeStatements) {
    for (const item of [...areaInc.inflows, ...areaInc.outflows]) {
      rows.push([
        summary.label,
        'Income Statement',
        areaInc.area.name,
        item.definition.section,
        item.definition.name,
        item.definition.valueType,
        formatItemValue(item.entry.value, item.definition),
        formatItemValue(item.entry.target, item.definition),
        String(item.entry.weight),
        String(item.healthScore),
        String(item.liabilityLoad),
        item.statusLabel,
        item.entry.note,
      ]);
    }
  }

  // Cash Flow rows
  rows.push([]);
  rows.push([
    'Period',
    'Statement',
    'Life Area',
    'Intended Hours',
    'Actual Hours',
    'Variance Hours',
    'Asset Hours',
    'Liability Hours',
    'Recovery Hours',
    'Strain Hours',
    'Adherence %',
    'Energy Net (-5..+5)',
    'Note',
  ]);
  for (const cf of summary.areaCashFlows) {
    rows.push([
      summary.label,
      'Cash Flow (Time & Energy)',
      cf.area.name,
      String(cf.allocation.intendedHours),
      String(cf.allocation.actualHours),
      String(cf.varianceHours),
      String(cf.allocation.assetHours),
      String(cf.allocation.liabilityHours),
      String(cf.allocation.recoveryHours),
      String(cf.allocation.strainHours),
      `${cf.adherencePercent}%`,
      String(cf.allocation.energyNet),
      cf.allocation.note,
    ]);
  }

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPeriodCsv(summary: PeriodSummary): void {
  const csv = buildPeriodCsv(summary);
  const safeId = summary.periodId.replace(/[^a-zA-Z0-9-_]/g, '_');
  triggerFileDownload(csv, `life-statements-${safeId}.csv`, 'text/csv;charset=utf-8;');
}

export function downloadLedgerJsonBackup(state: LedgerState): void {
  const json = JSON.stringify(state, null, 2);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(json, `life-statements-backup-${dateStamp}.json`, 'application/json;charset=utf-8;');
}

export function parseAndValidateLedgerBackup(rawJson: string): LedgerState {
  const parsed = JSON.parse(rawJson) as Partial<LedgerState>;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.areas) ||
    !Array.isArray(parsed.lineItems) ||
    !Array.isArray(parsed.periods) ||
    !Array.isArray(parsed.entries) ||
    !Array.isArray(parsed.cashFlows) ||
    !Array.isArray(parsed.goals)
  ) {
    throw new Error('Invalid Life Statements backup file structure.');
  }
  return {
    version: typeof parsed.version === 'number' ? parsed.version : 1,
    isSampleData: Boolean(parsed.isSampleData),
    hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
    areas: parsed.areas,
    lineItems: parsed.lineItems,
    periods: parsed.periods,
    entries: parsed.entries,
    cashFlows: parsed.cashFlows,
    goals: parsed.goals,
  };
}
