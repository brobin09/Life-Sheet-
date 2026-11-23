import { formatItemValue } from './scoring.ts';
import type { Goal, PeriodSummary, ScoredLineItem, SuggestedAction } from './types.ts';

interface ActionBlueprint {
  matchTags: string[];
  title: string;
  actionStep: string;
  effortEstimate: string;
}

const ACTION_PLAYBOOK: ActionBlueprint[] = [
  // Finances
  {
    matchTags: ['debt', 'obligation'],
    title: 'Automate one extra principal transfer',
    actionStep: 'Schedule a modest fixed auto-transfer above the minimum payment on payday so principal shrinks without monthly willpower.',
    effortEstimate: '15 min setup',
  },
  {
    matchTags: ['debt', 'finances'],
    title: 'Audit recurring subscriptions once',
    actionStep: 'Review the last 30 days of card charges and cancel or downgrade two unused subscriptions, routing the difference straight to debt or reserves.',
    effortEstimate: '25 min once',
  },
  {
    matchTags: ['savings', 'buffer', 'investments'],
    title: 'Raise automatic reserve transfer by 2%',
    actionStep: 'Increase your monthly recurring transfer to your emergency reserve or index fund by a small, painless increment.',
    effortEstimate: '10 min setup',
  },
  {
    matchTags: ['spending', 'outflow'],
    title: 'Add a 48-hour pause list for non-essentials',
    actionStep: 'Keep a plain note for unplanned purchases over $50 and revisit them after 48 hours before buying.',
    effortEstimate: '5 min habit',
  },

  // Health
  {
    matchTags: ['sleep', 'recovery'],
    title: 'Set a fixed device-down cue 45 minutes before bed',
    actionStep: 'Place your phone charger outside the bedroom or across the room four nights a week and read a paper book instead.',
    effortEstimate: '10 min nightly',
  },
  {
    matchTags: ['stress', 'strain'],
    title: 'Insert a 15-minute afternoon decompression walk',
    actionStep: 'Step outside without podcasts or calls between work blocks three afternoons a week to let nervous-system tension settle.',
    effortEstimate: '15 min × 3/wk',
  },
  {
    matchTags: ['exercise', 'movement'],
    title: 'Protect two non-negotiable 30-minute movement slots',
    actionStep: 'Block two recurring morning or lunch calendar windows for brisk walking, lifting, or cycling before the week fills up.',
    effortEstimate: '30 min × 2/wk',
  },
  {
    matchTags: ['nutrition'],
    title: 'Prep two base ingredients on Sunday',
    actionStep: 'Batch-cook one grain and one protein or roasted vegetable tray so weeknight home meals take under 15 minutes.',
    effortEstimate: '40 min weekly',
  },

  // Relationships
  {
    matchTags: ['connection', 'friends', 'social'],
    title: 'Put one unhurried meal on the calendar this week',
    actionStep: 'Message one close friend or family member with two concrete dates for coffee, a walk, or dinner.',
    effortEstimate: '5 min invite',
  },
  {
    matchTags: ['conflict', 'communication'],
    title: 'Write a calm 3-sentence clearing note',
    actionStep: 'Draft what you appreciate, what feels unresolved, and one simple next step before scheduling a brief check-in conversation.',
    effortEstimate: '20 min once',
  },
  {
    matchTags: ['boundaries', 'overcommitment'],
    title: 'Decline one low-fit obligation kindly',
    actionStep: 'Identify one upcoming event or request that feels purely obligatory and send a clear, gracious decline to protect your margin.',
    effortEstimate: '5 min once',
  },

  // Career
  {
    matchTags: ['overcommitment', 'career'],
    title: 'Renegotiate or defer one active commitment',
    actionStep: 'Pick the lowest-leverage open obligation on your plate and propose a realistic later date or narrower scope.',
    effortEstimate: '15 min conversation',
  },
  {
    matchTags: ['deep_work', 'focus'],
    title: 'Guard two 90-minute morning focus blocks',
    actionStep: 'Hold two morning blocks on your calendar with notifications silenced to advance your highest-value craft work first.',
    effortEstimate: '90 min × 2/wk',
  },
  {
    matchTags: ['meetings', 'admin'],
    title: 'Convert one recurring meeting to an async note',
    actionStep: 'Review your recurring calendar invites and replace one status-only meeting with a concise written update.',
    effortEstimate: '15 min once',
  },
  {
    matchTags: ['craft', 'reputation'],
    title: 'Share one concise artifact of finished work',
    actionStep: 'Publish a short memo, design note, or walkthrough summarizing a solved problem to compound clarity and trust.',
    effortEstimate: '30 min monthly',
  },

  // Learning
  {
    matchTags: ['reading', 'study', 'skills'],
    title: 'Keep one focused book open for 20 minutes a day',
    actionStep: 'Choose a single topic for the month and read 10 pages with brief margin notes rather than juggling five half-read tabs.',
    effortEstimate: '20 min daily',
  },
  {
    matchTags: ['clutter', 'attention', 'distraction'],
    title: 'Archive 80% of your unread reading backlog',
    actionStep: 'Close stale browser tabs and move old bookmarks to an archive folder, keeping only two active learning threads.',
    effortEstimate: '15 min once',
  },

  // Home
  {
    matchTags: ['maintenance', 'deferred'],
    title: 'Clear the two smallest deferred home repairs',
    actionStep: 'Pick two nagging repairs that take under 30 minutes each (or book one technician visit) during a single Saturday morning hour.',
    effortEstimate: '60 min once',
  },
  {
    matchTags: ['order', 'environment', 'chores'],
    title: 'Run a 10-minute evening surface reset',
    actionStep: 'Clear the kitchen counter and work desk before bed so you wake into visual calm without marathon weekend cleaning.',
    effortEstimate: '10 min nightly',
  },

  // Meaning / Spirituality
  {
    matchTags: ['reflection', 'stillness', 'purpose', 'hurry'],
    title: 'Hold 15 minutes of unhurried morning quiet',
    actionStep: 'Spend 15 minutes before checking messages sitting with tea, journaling three lines, or taking a quiet neighborhood walk.',
    effortEstimate: '15 min × 4/wk',
  },
  {
    matchTags: ['meaning', 'hurry'],
    title: 'Leave one half-day completely unscheduled',
    actionStep: 'Protect one weekend morning with zero errands or calendar blocks so pace can slow back to human speed.',
    effortEstimate: 'Half-day monthly',
  },

  // Recreation
  {
    matchTags: ['play', 'hobbies', 'outdoors'],
    title: 'Schedule one 2-hour unstructured hobby block',
    actionStep: 'Set aside a dedicated window for a creative or outdoor activity with no productivity goal attached.',
    effortEstimate: '2 hrs weekly',
  },
  {
    matchTags: ['passive', 'recreation'],
    title: 'Replace one evening scroll with a tactile hobby',
    actionStep: 'Keep a sketchbook, instrument, puzzle, or trail shoes visible in the living room so low-friction play beats passive feeds.',
    effortEstimate: '30 min × 2/wk',
  },
];

function buildFallbackActions(areaName: string, item: ScoredLineItem): ActionBlueprint[] {
  const isNegative =
    item.definition.section === 'liability' || item.definition.section === 'outflow';
  if (isNegative) {
    return [
      {
        matchTags: [],
        title: `Trim one recurring source of ${item.definition.name.toLowerCase()}`,
        actionStep: `List the top three drivers behind ${item.definition.name} and remove or simplify the easiest one this week.`,
        effortEstimate: '20 min once',
      },
      {
        matchTags: [],
        title: `Set a weekly cap for ${item.definition.name.toLowerCase()}`,
        actionStep: `Define a calm weekly boundary and review it every Friday so drift is noticed early.`,
        effortEstimate: '10 min weekly',
      },
      {
        matchTags: [],
        title: `Schedule one focused cleanup block in ${areaName}`,
        actionStep: `Reserve 45 uninterrupted minutes this month specifically to reduce drag on ${item.definition.name}.`,
        effortEstimate: '45 min monthly',
      },
    ];
  }
  return [
    {
      matchTags: [],
      title: `Protect one recurring slot for ${item.definition.name.toLowerCase()}`,
      actionStep: `Put a small, realistic recurring window on your calendar dedicated to moving ${item.definition.name} closer to target.`,
      effortEstimate: '30 min weekly',
    },
    {
      matchTags: [],
      title: `Lower friction for ${item.definition.name.toLowerCase()}`,
      actionStep: `Prepare tools, environment, or calendar reminders ahead of time so starting takes under two minutes.`,
      effortEstimate: '15 min setup',
    },
    {
      matchTags: [],
      title: `Do a brief mid-month pulse check on ${areaName}`,
      actionStep: `Halfway through the month, glance at your rubric or target for ${item.definition.name} and make one gentle adjustment.`,
      effortEstimate: '10 min mid-month',
    },
  ];
}

/**
 * 100% offline deterministic suggestion rule engine.
 * Identifies weak areas (score < 72, or bottom 3 areas if all are above 72) and generates
 * exactly 3 concrete, small improvement actions per weak area tied to specific lagging line items.
 */
export function generateOfflineSuggestions(
  summary: PeriodSummary,
  existingGoals: Goal[]
): Array<{
  areaId: string;
  areaName: string;
  areaHealthScore: number;
  equitySpread: number;
  weight: number;
  suggestions: SuggestedAction[];
}> {
  const activeGoalTitles = new Set(
    existingGoals
      .filter((g) => g.status !== 'completed')
      .map((g) => `${g.lineItemId}::${g.title.toLowerCase()}`)
  );

  // Rank areas by weakness weighted slightly by importance
  const populatedAreas = summary.areaBalanceSheets.filter(
    (a) => a.assets.length + a.liabilities.length > 0
  );

  const incomeByArea = new Map(summary.areaIncomeStatements.map((a) => [a.area.id, a]));

  const weakAreas = populatedAreas
    .filter((a) => a.areaHealthScore < 72 || a.liabilityLoad >= 40)
    .sort((a, b) => {
      const aNeed = (100 - a.areaHealthScore) * (0.7 + a.area.weight * 0.15);
      const bNeed = (100 - b.areaHealthScore) * (0.7 + b.area.weight * 0.15);
      return bNeed - aNeed;
    });

  // Always offer at least the 2–3 lowest-scoring areas if everything is fairly healthy
  const targetAreas =
    weakAreas.length > 0
      ? weakAreas.slice(0, 4)
      : [...populatedAreas].sort((a, b) => a.areaHealthScore - b.areaHealthScore).slice(0, 2);

  return targetAreas.map((areaBs) => {
    const areaIncome = incomeByArea.get(areaBs.area.id);
    const allItems: ScoredLineItem[] = [
      ...areaBs.liabilities,
      ...areaBs.assets,
      ...(areaIncome?.outflows ?? []),
      ...(areaIncome?.inflows ?? []),
    ];

    // Sort items by biggest weighted gap from 100
    const laggingItems = [...allItems].sort((a, b) => {
      const aGap = (100 - a.healthScore) * a.entry.weight;
      const bGap = (100 - b.healthScore) * b.entry.weight;
      return bGap - aGap;
    });

    const chosen: SuggestedAction[] = [];
    const usedTitles = new Set<string>();

    for (const item of laggingItems) {
      if (chosen.length >= 3) break;
      const itemTags = new Set(item.definition.tags.map((t) => t.toLowerCase()));

      const matchingBlueprints = ACTION_PLAYBOOK.filter(
        (bp) =>
          bp.matchTags.some((t) => itemTags.has(t.toLowerCase())) &&
          !usedTitles.has(bp.title.toLowerCase()) &&
          !activeGoalTitles.has(`${item.definition.id}::${bp.title.toLowerCase()}`)
      );

      for (const bp of matchingBlueprints) {
        if (chosen.length >= 3) break;
        usedTitles.add(bp.title.toLowerCase());
        const currentStr = formatItemValue(item.entry.value, item.definition);
        const targetStr = formatItemValue(item.entry.target, item.definition);
        chosen.push({
          id: `sug-${areaBs.area.id}-${item.definition.id}-${chosen.length + 1}`,
          areaId: areaBs.area.id,
          areaName: areaBs.area.name,
          lineItemId: item.definition.id,
          lineItemName: item.definition.name,
          title: bp.title,
          actionStep: bp.actionStep,
          effortEstimate: bp.effortEstimate,
          rationale: `${item.definition.name} scored ${item.healthScore}/100 (${currentStr} vs. target ${targetStr}, weight ${item.entry.weight}/5).`,
        });
        // Spread suggestions across multiple lagging items when possible
        if (laggingItems.length >= 2) break;
      }
    }

    // Fill to exactly 3 concrete actions using item-specific fallbacks if needed
    if (chosen.length < 3 && laggingItems.length > 0) {
      const primaryLagging = laggingItems[0];
      const fallbacks = buildFallbackActions(areaBs.area.name, primaryLagging);
      for (const fb of fallbacks) {
        if (chosen.length >= 3) break;
        if (usedTitles.has(fb.title.toLowerCase())) continue;
        usedTitles.add(fb.title.toLowerCase());
        const currentStr = formatItemValue(primaryLagging.entry.value, primaryLagging.definition);
        const targetStr = formatItemValue(primaryLagging.entry.target, primaryLagging.definition);
        chosen.push({
          id: `sug-fb-${areaBs.area.id}-${primaryLagging.definition.id}-${chosen.length + 1}`,
          areaId: areaBs.area.id,
          areaName: areaBs.area.name,
          lineItemId: primaryLagging.definition.id,
          lineItemName: primaryLagging.definition.name,
          title: fb.title,
          actionStep: fb.actionStep,
          effortEstimate: fb.effortEstimate,
          rationale: `${primaryLagging.definition.name} is currently ${primaryLagging.healthScore}/100 (${currentStr} vs. target ${targetStr}).`,
        });
      }
    }

    return {
      areaId: areaBs.area.id,
      areaName: areaBs.area.name,
      areaHealthScore: areaBs.areaHealthScore,
      equitySpread: areaBs.equitySpread,
      weight: areaBs.area.weight,
      suggestions: chosen,
    };
  });
}
