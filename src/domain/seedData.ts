import { DEFAULT_LIFE_AREAS, LINE_ITEM_TEMPLATES } from './templates.ts';
import type {
  CashFlowAllocation,
  Goal,
  LedgerState,
  LineItemDefinition,
  LineItemEntry,
  Period,
} from './types.ts';

const SAMPLE_PERIODS: Period[] = [
  {
    id: '2026-08',
    label: 'August 2026',
    year: 2026,
    month: 8,
    quarter: '2026-Q3',
    status: 'completed',
    summaryNote: 'Busy product launch month; savings held steady, sleep and home maintenance slipped.',
    createdAt: '2026-08-30T18:00:00.000Z',
    completedAt: '2026-08-30T18:14:00.000Z',
  },
  {
    id: '2026-09',
    label: 'September 2026',
    year: 2026,
    month: 9,
    quarter: '2026-Q3',
    status: 'completed',
    summaryNote: 'Quarter close: trimmed two recurring meetings and paid down a chunk of card debt.',
    createdAt: '2026-09-29T19:10:00.000Z',
    completedAt: '2026-09-29T19:22:00.000Z',
  },
  {
    id: '2026-10',
    label: 'October 2026',
    year: 2026,
    month: 10,
    quarter: '2026-Q4',
    status: 'completed',
    summaryNote: 'Stronger sleep routine and family dinners, though work overcommitments crept back up.',
    createdAt: '2026-10-31T16:30:00.000Z',
    completedAt: '2026-10-31T16:41:00.000Z',
  },
  {
    id: '2026-11',
    label: 'November 2026',
    year: 2026,
    month: 11,
    quarter: '2026-Q4',
    status: 'completed',
    summaryNote: 'Financial cushion improved; deferred home tasks and chronic stress still warrant steady attention.',
    createdAt: '2026-11-22T14:00:00.000Z',
    completedAt: '2026-11-22T14:11:00.000Z',
  },
];

// Map templateId -> deterministic lineItem id and 4-month realistic values [Aug, Sep, Oct, Nov]
const SAMPLE_TRAJECTORIES: Record<
  string,
  { id: string; values: [number, number, number, number]; notes: [string, string, string, string] }
> = {
  // Finances
  'tpl-fin-emergency': {
    id: 'item-fin-emergency',
    values: [4.2, 4.6, 5.0, 5.4],
    notes: [
      'Held steady through travel costs.',
      'Added bonus remainder to high-yield reserve.',
      'Crossed 5 months of baseline living expenses.',
      'Close to 6-month target.',
    ],
  },
  'tpl-fin-investments': {
    id: 'item-fin-investments',
    values: [78000, 81500, 84200, 87600],
    notes: [
      'Automated monthly index contributions.',
      'Steady market + regular contribution.',
      'Rebalanced quarterly allocations.',
      'On pace toward 100k milestone.',
    ],
  },
  'tpl-fin-debt': {
    id: 'item-fin-debt',
    values: [6800, 5400, 4600, 3900],
    notes: [
      'Remaining balance from earlier car repair and travel.',
      'Paid down $1,400 from surplus.',
      'Steady automated principal paydown.',
      'Down $2,900 since August; still a meaningful drag.',
    ],
  },
  'tpl-fin-savings-inflow': {
    id: 'item-fin-savings-inflow',
    values: [1450, 1750, 1620, 1850],
    notes: ['Slightly below target due to dental bill.', 'Near target.', 'Gift travel dip.', 'Exceeded monthly target.'],
  },
  'tpl-fin-impulse-outflow': {
    id: 'item-fin-impulse-outflow',
    values: [520, 410, 390, 320],
    notes: ['Takeout spikes during crunch week.', 'Improved after meal prep.', 'Mostly books and gadgets.', 'Under target using 48-hour list.'],
  },

  // Health
  'tpl-health-sleep': {
    id: 'item-health-sleep',
    values: [5.5, 6.0, 6.8, 6.2],
    notes: [
      'Late screens most weeknights.',
      'Earlier wind-down helped twice a week.',
      'Consistent 7.5 hrs for three straight weeks.',
      'Slipped slightly during late November deadline.',
    ],
  },
  'tpl-health-movement': {
    id: 'item-health-movement',
    values: [2.5, 3.0, 3.5, 3.0],
    notes: ['Skipped two strength sessions.', 'Two lifts + one long run.', 'Good rhythm all month.', 'Consistent walks, missed one lift.'],
  },
  'tpl-health-stress': {
    id: 'item-health-stress',
    values: [7.2, 6.5, 6.0, 6.8],
    notes: [
      'High shoulder tension and shallow breathing.',
      'Slightly calmer after launch wrapped.',
      'Noticeable relief with midday walks.',
      'Crept back up with Q4 planning load.',
    ],
  },
  'tpl-health-inflow': {
    id: 'item-health-inflow',
    values: [8, 10, 11, 10],
    notes: ['Too many rushed lunches.', 'Sunday batch cooking helped.', 'Almost hit target.', 'Solid weekday dinners.'],
  },
  'tpl-health-outflow': {
    id: 'item-health-outflow',
    values: [11, 8, 6, 8],
    notes: ['Working on laptop past 10:30pm.', 'Cut down by three nights.', 'Best month this half.', 'Two rough deadline weeks.'],
  },

  // Relationships
  'tpl-rel-inner-circle': {
    id: 'item-rel-inner-circle',
    values: [6.0, 6.5, 7.5, 7.2],
    notes: ['Mostly quick texts.', 'Caught up with sister and old colleague.', 'Hosted two unhurried Sunday dinners.', 'Warm calls, slightly fewer in-person meals.'],
  },
  'tpl-rel-conflicts': {
    id: 'item-rel-conflicts',
    values: [5.0, 4.0, 3.0, 2.5],
    notes: ['Unspoken scheduling tension at home.', 'Had an honest talk about weekend logistics.', 'Much clearer expectations now.', 'Air feels calm and open.'],
  },
  'tpl-rel-inflow': {
    id: 'item-rel-inflow',
    values: [3, 4, 6, 5],
    notes: ['Busy month.', 'Two coffees + two dinners.', 'Hit full target.', 'Good holiday planning dinner.'],
  },
  'tpl-rel-outflow': {
    id: 'item-rel-outflow',
    values: [3, 2, 1, 2],
    notes: ['Said yes to two draining networking mixers.', 'More selective.', 'Protected weekends well.', 'One extra work dinner.'],
  },

  // Career / Vocation
  'tpl-car-craft': {
    id: 'item-car-craft',
    values: [7.0, 7.2, 7.5, 7.8],
    notes: ['Strong launch delivery.', 'Good feedback on architecture memo.', 'Trusted with key roadmap choices.', 'High craft confidence and clarity.'],
  },
  'tpl-car-overcommit': {
    id: 'item-car-overcommit',
    values: [7.5, 6.5, 6.8, 7.2],
    notes: ['Too many parallel commitments.', 'Dropped one side committee.', 'Two extra stakeholder requests added.', 'Backlog feels heavy again; needs pruning.'],
  },
  'tpl-car-inflow': {
    id: 'item-car-inflow',
    values: [9, 11, 12, 10],
    notes: ['Fragmented calendar.', 'Blocked Tue/Thu mornings.', 'Solid progress on deep project.', 'Interrupted by ad-hoc planning calls.'],
  },
  'tpl-car-outflow': {
    id: 'item-car-outflow',
    values: [11, 9, 8.5, 9.5],
    notes: ['Heavy status meetings.', 'Moved two updates to written docs.', 'Better meeting discipline.', 'Annual planning added recurring syncs.'],
  },

  // Learning
  'tpl-learn-skill': {
    id: 'item-learn-skill',
    values: [5.5, 6.0, 6.2, 6.8],
    notes: ['Mostly skimming articles.', 'Started reading one focused non-fiction book.', 'Consistent notes twice a week.', 'Applying new concepts directly at work.'],
  },
  'tpl-learn-backlog': {
    id: 'item-learn-backlog',
    values: [8, 7, 5, 4],
    notes: ['Many open tabs and stalled courses.', 'Archived a few old bookmarks.', 'Trimmed active list to 5.', 'Getting cleaner each month.'],
  },
  'tpl-learn-inflow': {
    id: 'item-learn-inflow',
    values: [8, 10, 12, 14],
    notes: ['Squeezed out by launch.', 'Evening reading sessions returned.', 'Steady weekend study mornings.', 'Nearly at 16-hour target.'],
  },
  'tpl-learn-outflow': {
    id: 'item-learn-outflow',
    values: [6.5, 5.5, 4.5, 4.0],
    notes: ['Late-night news feeds.', 'Removed news app from home screen.', 'Noticeably calmer mornings.', 'Still room to trim slightly.'],
  },

  // Home / Environment
  'tpl-home-calm': {
    id: 'item-home-calm',
    values: [5.5, 5.8, 6.0, 5.6],
    notes: ['Desk piles and cluttered entry.', 'Cleared living room shelving.', 'Kitchen stayed tidy.', 'Paperwork and closet backlog crept back.'],
  },
  'tpl-home-maintenance': {
    id: 'item-home-maintenance',
    values: [9, 8, 7, 8],
    notes: ['Leaky bathroom faucet, loose cabinet, garage shelves, gutter check, etc.', 'Fixed cabinet hinge.', 'Completed gutter cleaning.', 'Two new small repairs joined the list.'],
  },
  'tpl-home-inflow': {
    id: 'item-home-inflow',
    values: [1, 2, 2, 1],
    notes: ['Only basic upkeep.', 'Small fixes completed.', 'Organized pantry.', 'Paused during busy travel week.'],
  },
  'tpl-home-outflow': {
    id: 'item-home-outflow',
    values: [6.0, 5.5, 5.0, 5.5],
    notes: ['Weekend catch-up marathons.', 'Slightly smoother.', 'Evening resets helped.', 'Back to uneven bursts.'],
  },

  // Spirituality / Meaning
  'tpl-mean-alignment': {
    id: 'item-mean-alignment',
    values: [6.0, 6.4, 6.8, 6.6],
    notes: ['Felt mostly tactical.', 'Long Sunday walk restored perspective.', 'Clearer sense of what matters this season.', 'Grounded, though busyness nibbled at quiet time.'],
  },
  'tpl-mean-drift': {
    id: 'item-mean-drift',
    values: [6.5, 5.8, 5.2, 5.6],
    notes: ['Rushing from task to task.', 'Two unhurried mornings helped.', 'Better pace overall.', 'Slightly hurried mid-month.'],
  },
  'tpl-mean-inflow': {
    id: 'item-mean-inflow',
    values: [2.5, 3.0, 4.0, 3.5],
    notes: ['Rare morning quiet.', 'Started 10-min journaling.', 'Four quiet mornings a week.', 'Steady 3–4 days.'],
  },

  // Recreation
  'tpl-rec-play': {
    id: 'item-rec-play',
    values: [4.5, 5.0, 5.5, 4.8],
    notes: ['Almost no unstructured play.', 'One great Saturday hike.', 'Picked up sketching again twice.', 'Let errands swallow Saturday mornings.'],
  },
  'tpl-rec-passive': {
    id: 'item-rec-passive',
    values: [7.0, 6.2, 5.8, 6.4],
    notes: ['Exhausted evening streaming.', 'Swapped two nights for a novel.', 'More deliberate viewing.', 'Drifted back to passive feeds when tired.'],
  },
  'tpl-rec-inflow': {
    id: 'item-rec-inflow',
    values: [2.0, 2.5, 3.5, 2.5],
    notes: ['Short walks only.', 'Half-day trail hike.', 'Best month for hobbies.', 'Dropped below intended leisure time.'],
  },
};

// Monthly Cash Flow allocations per area [Aug, Sep, Oct, Nov]
type MonthlyCfTuple = [
  intended: number,
  actual: number,
  asset: number,
  liability: number,
  recovery: number,
  strain: number,
  energyNet: number,
];

const SAMPLE_CASH_FLOWS: Record<string, [MonthlyCfTuple, MonthlyCfTuple, MonthlyCfTuple, MonthlyCfTuple]> = {
  'area-finances': [
    [6, 8, 3, 5, 2, 4, -1],
    [6, 7, 4, 3, 2, 2, 1],
    [6, 6, 4, 2, 3, 1, 2],
    [6, 6, 4.5, 1.5, 3, 1, 2],
  ],
  'area-health': [
    [28, 20, 14, 6, 15, 5, 1],
    [28, 24, 18, 6, 19, 5, 2],
    [28, 27, 22, 5, 22, 5, 3],
    [28, 23, 18, 5, 18, 5, 2],
  ],
  'area-relationships': [
    [24, 16, 12, 4, 13, 3, 2],
    [24, 20, 16, 4, 17, 3, 3],
    [24, 24, 21, 3, 21, 3, 4],
    [24, 21, 18, 3, 18, 3, 3],
  ],
  'area-career': [
    [168, 196, 98, 98, 18, 140, -3],
    [168, 184, 108, 76, 22, 122, -2],
    [168, 178, 112, 66, 24, 114, -1],
    [168, 186, 110, 76, 20, 128, -2],
  ],
  'area-learning': [
    [16, 9, 8, 1, 7, 2, 2],
    [16, 11, 10, 1, 9, 2, 2],
    [16, 13, 12, 1, 11, 2, 3],
    [16, 14, 13, 1, 12, 2, 3],
  ],
  'area-home': [
    [18, 22, 6, 16, 4, 14, -2],
    [18, 20, 7, 13, 6, 11, -1],
    [18, 18, 8, 10, 7, 9, 0],
    [18, 21, 7, 14, 5, 13, -1],
  ],
  'area-meaning': [
    [14, 8, 7, 1, 8, 0, 3],
    [14, 10, 9, 1, 10, 0, 3],
    [14, 13, 12, 1, 13, 0, 4],
    [14, 11, 10, 1, 11, 0, 3],
  ],
  'area-recreation': [
    [22, 11, 7, 4, 9, 2, 1],
    [22, 14, 10, 4, 12, 2, 2],
    [22, 18, 15, 3, 16, 2, 3],
    [22, 13, 9, 4, 11, 2, 2],
  ],
};

export function createSampleLedgerState(): LedgerState {
  const lineItems: LineItemDefinition[] = LINE_ITEM_TEMPLATES.map((tpl) => {
    const mapped = SAMPLE_TRAJECTORIES[tpl.templateId];
    return {
      id: mapped ? mapped.id : `item-${tpl.templateId}`,
      areaId: tpl.areaId,
      name: tpl.name,
      statement: tpl.statement,
      section: tpl.section,
      valueType: tpl.valueType,
      direction: tpl.direction,
      unit: tpl.unit,
      ceiling: tpl.ceiling,
      rubric: tpl.rubric,
      defaultTarget: tpl.defaultTarget,
      defaultWeight: tpl.defaultWeight,
      tags: tpl.tags,
      archived: false,
    };
  });

  const entries: LineItemEntry[] = [];
  for (let pIdx = 0; pIdx < SAMPLE_PERIODS.length; pIdx++) {
    const period = SAMPLE_PERIODS[pIdx];
    for (const tpl of LINE_ITEM_TEMPLATES) {
      const traj = SAMPLE_TRAJECTORIES[tpl.templateId];
      if (!traj) continue;
      entries.push({
        id: `entry-${period.id}-${traj.id}`,
        periodId: period.id,
        lineItemId: traj.id,
        value: traj.values[pIdx],
        target: tpl.defaultTarget,
        weight: tpl.defaultWeight,
        note: traj.notes[pIdx],
        updatedAt: period.completedAt ?? period.createdAt,
      });
    }
  }

  const cashFlows: CashFlowAllocation[] = [];
  for (let pIdx = 0; pIdx < SAMPLE_PERIODS.length; pIdx++) {
    const period = SAMPLE_PERIODS[pIdx];
    for (const area of DEFAULT_LIFE_AREAS) {
      const cfTuple = SAMPLE_CASH_FLOWS[area.id]?.[pIdx];
      if (!cfTuple) continue;
      const [intended, actual, asset, liability, recovery, strain, energyNet] = cfTuple;
      cashFlows.push({
        id: `cf-${period.id}-${area.id}`,
        periodId: period.id,
        areaId: area.id,
        intendedHours: intended,
        actualHours: actual,
        assetHours: asset,
        liabilityHours: liability,
        recoveryHours: recovery,
        strainHours: strain,
        energyNet,
        note: '',
      });
    }
  }

  const goals: Goal[] = [
    {
      id: 'goal-1',
      areaId: 'area-finances',
      lineItemId: 'item-fin-debt',
      title: 'Automate one extra principal transfer',
      actionStep: 'Auto-transfer an extra $450/month toward high-interest balance on the 1st of each month.',
      source: 'suggestion',
      status: 'active',
      createdPeriodId: '2026-09',
      targetPeriodId: '2027-03',
      note: 'Balance dropped from $6,800 to $3,900 so far.',
      createdAt: '2026-09-29T19:25:00.000Z',
      updatedAt: '2026-11-22T14:15:00.000Z',
    },
    {
      id: 'goal-2',
      areaId: 'area-home',
      lineItemId: 'item-home-maintenance',
      title: 'Clear the two smallest deferred home repairs',
      actionStep: 'Reserve one Saturday morning hour to fix the bathroom faucet washer and tighten the pantry shelf.',
      source: 'suggestion',
      status: 'active',
      createdPeriodId: '2026-11',
      targetPeriodId: '2026-12',
      note: 'Parts already picked up from hardware store.',
      createdAt: '2026-11-22T14:20:00.000Z',
      updatedAt: '2026-11-22T14:20:00.000Z',
    },
    {
      id: 'goal-3',
      areaId: 'area-relationships',
      lineItemId: 'item-rel-conflicts',
      title: 'Write a calm 3-sentence clearing note',
      actionStep: 'Schedule a quiet Sunday coffee to align on monthly family calendar expectations.',
      source: 'suggestion',
      status: 'completed',
      createdPeriodId: '2026-09',
      targetPeriodId: '2026-10',
      note: 'Great conversation; friction dropped from 5/10 to 2.5/10.',
      createdAt: '2026-09-30T10:00:00.000Z',
      updatedAt: '2026-10-31T16:40:00.000Z',
    },
  ];

  return {
    version: 1,
    isSampleData: true,
    hasCompletedOnboarding: false,
    areas: DEFAULT_LIFE_AREAS.map((a) => ({ ...a })),
    lineItems,
    periods: SAMPLE_PERIODS.map((p) => ({ ...p })),
    entries,
    cashFlows,
    goals,
  };
}
