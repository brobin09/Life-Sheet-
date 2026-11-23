export type StatementType = 'balance_sheet' | 'income_statement';

export type StatementSection = 'asset' | 'liability' | 'inflow' | 'outflow';

export type ValueType = 'quantitative' | 'qualitative';

export type ScoringDirection = 'higher_is_better' | 'lower_is_better';

export interface QualitativeRubric {
  anchor2: string;
  anchor5: string;
  anchor8: string;
}

export interface LifeArea {
  id: string;
  name: string;
  description: string;
  weight: number; // 1 to 5 importance weight
  order: number;
  archived: boolean;
}

export interface LineItemDefinition {
  id: string;
  areaId: string;
  name: string;
  statement: StatementType;
  section: StatementSection;
  valueType: ValueType;
  direction: ScoringDirection;
  unit?: string; // for quantitative items (e.g., USD, hrs/wk, months, days/wk)
  ceiling?: number; // reference ceiling for lower_is_better items when target is 0
  rubric?: QualitativeRubric; // required for qualitative items
  defaultTarget: number;
  defaultWeight: number; // 1 to 5 importance weight
  tags: string[]; // used by local offline suggestion engine
  archived: boolean;
}

export interface Period {
  id: string; // e.g., '2026-11'
  label: string; // e.g., 'November 2026'
  year: number;
  month: number; // 1-12
  quarter: string; // e.g., '2026-Q4'
  status: 'draft' | 'completed';
  summaryNote: string;
  createdAt: string;
  completedAt?: string;
}

export interface LineItemEntry {
  id: string;
  periodId: string;
  lineItemId: string;
  value: number;
  target: number;
  weight: number; // 1 to 5
  note: string;
  updatedAt: string;
}

export interface CashFlowAllocation {
  id: string;
  periodId: string;
  areaId: string;
  intendedHours: number; // planned hours per month (or period)
  actualHours: number; // actual hours spent in period
  assetHours: number; // hours spent building assets/capacity
  liabilityHours: number; // hours spent servicing liabilities/drains
  recoveryHours: number; // hours restoring energy
  strainHours: number; // hours causing strain/depletion
  energyNet: number; // -5 to +5 subjective net energy yield
  note: string;
}

export type GoalStatus = 'active' | 'completed' | 'paused';

export interface Goal {
  id: string;
  areaId: string;
  lineItemId: string;
  title: string;
  actionStep: string;
  source: 'suggestion' | 'custom';
  status: GoalStatus;
  createdPeriodId: string;
  targetPeriodId?: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerState {
  version: number;
  isSampleData: boolean;
  hasCompletedOnboarding: boolean;
  areas: LifeArea[];
  lineItems: LineItemDefinition[];
  periods: Period[];
  entries: LineItemEntry[];
  cashFlows: CashFlowAllocation[];
  goals: Goal[];
}

export interface ScoreFormulaComponent {
  label: string;
  value: string;
  weight?: number;
  contribution?: string;
}

export interface ScoreExplanation {
  title: string;
  subtitle: string;
  formulaLabel: string;
  steps: string[];
  components: ScoreFormulaComponent[];
  resultLabel: string;
  resultScore: number;
  rubric?: QualitativeRubric;
}

export interface ScoredLineItem {
  definition: LineItemDefinition;
  entry: LineItemEntry;
  healthScore: number; // 0-100 (higher always means healthier)
  liabilityLoad: number; // For liabilities/outflows: 100 - healthScore; 0 for assets/inflows
  statusLabel: 'On target' | 'Steady' | 'Needs attention' | 'Elevated drag';
  explanation: ScoreExplanation;
}

export interface AreaBalanceSheetResult {
  area: LifeArea;
  assets: ScoredLineItem[];
  liabilities: ScoredLineItem[];
  assetStrength: number; // 0-100 weighted avg health of assets
  liabilityHealth: number; // 0-100 weighted avg health of liabilities
  liabilityLoad: number; // 0-100 weighted drag = 100 - liabilityHealth
  areaHealthScore: number; // 0-100 weighted avg of all balance sheet items in area
  equitySpread: number; // -100 to +100 = assetStrength - liabilityLoad
  totalItemWeight: number;
  explanation: ScoreExplanation;
}

export interface AreaIncomeResult {
  area: LifeArea;
  inflows: ScoredLineItem[];
  outflows: ScoredLineItem[];
  inflowScore: number; // 0-100
  outflowHealth: number; // 0-100
  outflowLoad: number; // 0-100
  netIncomeScore: number; // 0-100 weighted health of period flows
  netFlowSpread: number; // -100 to +100 = inflowScore - outflowLoad
  explanation: ScoreExplanation;
}

export interface AreaCashFlowSummary {
  area: LifeArea;
  allocation: CashFlowAllocation;
  varianceHours: number; // actual - intended
  adherencePercent: number; // 0-100 alignment of actual vs intended
  liabilitySharePercent: number;
  recoverySharePercent: number;
}

export interface LifeRatios {
  liabilityToAssetTimeRatio: number | null; // liabilityHours / assetHours
  liabilityTimeSharePercent: number;
  assetTimeSharePercent: number;
  recoveryToStrainRatio: number | null; // recoveryHours / strainHours
  intendedVsActualAdherencePercent: number; // 0-100 across areas
  totalIntendedHours: number;
  totalActualHours: number;
  totalAssetHours: number;
  totalLiabilityHours: number;
  totalRecoveryHours: number;
  totalStrainHours: number;
  explanations: {
    liabilityVsAsset: ScoreExplanation;
    recoveryVsStrain: ScoreExplanation;
    intendedVsActual: ScoreExplanation;
  };
}

export interface PeriodSummary {
  periodId: string;
  label: string;
  isQuarterlyRollup: boolean;
  includedPeriodIds: string[];
  overallLifeEquity: number; // 0-100 weighted across active areas
  overallAssetStrength: number; // 0-100
  overallLiabilityHealth: number; // 0-100
  overallLiabilityLoad: number; // 0-100
  overallEquitySpread: number; // -100 to +100
  overallIncomeNetScore: number; // 0-100
  overallIncomeSpread: number; // -100 to +100
  areaBalanceSheets: AreaBalanceSheetResult[];
  areaIncomeStatements: AreaIncomeResult[];
  areaCashFlows: AreaCashFlowSummary[];
  ratios: LifeRatios;
  equityExplanation: ScoreExplanation;
  incomeExplanation: ScoreExplanation;
}

export interface MoverFlag {
  lineItemId: string;
  lineItemName: string;
  areaId: string;
  areaName: string;
  section: StatementSection;
  previousScore: number;
  currentScore: number;
  delta: number;
  previousValueLabel: string;
  currentValueLabel: string;
}

export interface NeglectedAreaFlag {
  areaId: string;
  areaName: string;
  weight: number;
  areaHealthScore: number;
  intendedHours: number;
  actualHours: number;
  reason: string;
}

export interface TopLiabilityFlag {
  lineItemId: string;
  lineItemName: string;
  areaId: string;
  areaName: string;
  liabilityLoad: number;
  healthScore: number;
  weight: number;
  impactIndex: number; // liabilityLoad * weight
  valueLabel: string;
  targetLabel: string;
}

export interface AnalysisFlags {
  biggestLiabilities: TopLiabilityFlag[];
  neglectedHighWeightAreas: NeglectedAreaFlag[];
  biggestPositiveMovers: MoverFlag[];
  biggestNegativeMovers: MoverFlag[];
}

export interface SuggestedAction {
  id: string;
  areaId: string;
  areaName: string;
  lineItemId: string;
  lineItemName: string;
  title: string;
  actionStep: string;
  rationale: string;
  effortEstimate: string;
}

export interface AreaTrendPoint {
  periodId: string;
  label: string;
  shortLabel: string;
  lifeEquity: number;
  equitySpread: number;
  areaScores: Record<string, number>;
}
