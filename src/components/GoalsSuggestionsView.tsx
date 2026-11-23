import { useState } from 'react';
import { Check, Pause, Plus, Trash2 } from 'lucide-react';
import type {
  Goal,
  GoalStatus,
  LifeArea,
  LineItemDefinition,
  SuggestedAction,
} from '../domain/types.ts';

interface SuggestionGroup {
  areaId: string;
  areaName: string;
  areaHealthScore: number;
  equitySpread: number;
  weight: number;
  suggestions: SuggestedAction[];
}

interface GoalsSuggestionsViewProps {
  periodLabel: string;
  currentPeriodId: string;
  areas: LifeArea[];
  lineItems: LineItemDefinition[];
  suggestionGroups: SuggestionGroup[];
  goals: Goal[];
  onAcceptSuggestion: (suggestion: SuggestedAction) => void;
  onAddCustomGoal: (input: {
    areaId: string;
    lineItemId: string;
    title: string;
    actionStep: string;
    note?: string;
  }) => void;
  onUpdateGoalStatus: (goalId: string, status: GoalStatus) => void;
  onDeleteGoal: (goalId: string) => void;
  onSelectArea: (areaId: string) => void;
}

export function GoalsSuggestionsView({
  periodLabel,
  areas,
  lineItems,
  suggestionGroups,
  goals,
  onAcceptSuggestion,
  onAddCustomGoal,
  onUpdateGoalStatus,
  onDeleteGoal,
  onSelectArea,
}: GoalsSuggestionsViewProps) {
  const activeAreas = areas.filter((a) => !a.archived);
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [areaId, setAreaId] = useState(activeAreas[0]?.id ?? '');
  const areaLineItems = lineItems.filter((i) => !i.archived && i.areaId === areaId);
  const [lineItemId, setLineItemId] = useState(areaLineItems[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [actionStep, setActionStep] = useState('');

  const lineItemNameMap = new Map(lineItems.map((l) => [l.id, l.name]));
  const areaNameMap = new Map(areas.map((a) => [a.id, a.name]));

  const filteredGoals = goals.filter((g) =>
    statusFilter === 'all' ? true : g.status === statusFilter
  );

  const handleAreaChange = (nextAreaId: string) => {
    setAreaId(nextAreaId);
    const firstItem = lineItems.find((i) => !i.archived && i.areaId === nextAreaId);
    setLineItemId(firstItem?.id ?? '');
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !actionStep.trim()) return;
    const resolvedItem =
      lineItemId || lineItems.find((i) => !i.archived && i.areaId === areaId)?.id || '';
    onAddCustomGoal({
      areaId,
      lineItemId: resolvedItem,
      title,
      actionStep,
    });
    setTitle('');
    setActionStep('');
    setShowCustomForm(false);
  };

  return (
    <div className="space-y-10">
      <section className="border-b border-[#E2DCD0] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs text-[#686259]">
              Offline Action Playbook &amp; Commitments · {periodLabel}
            </p>
            <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-[#1C1917] sm:text-4xl">
              Improvement Suggestions &amp; Goals
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#44403C]">
              Three concrete, small improvement actions generated locally for each area currently
              carrying drag or lagging behind target. Accept only the few that genuinely fit your
              upcoming month.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#1B4332] bg-[#FBF9F5] px-3.5 py-2 text-xs font-medium text-[#1B4332] hover:bg-[#ECF2EE] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Custom Goal
          </button>
        </div>

        {showCustomForm && (
          <form
            onSubmit={handleCreateGoal}
            className="mt-5 grid grid-cols-1 gap-3 border-t border-[#E2DCD0] pt-5 sm:grid-cols-12"
          >
            <div className="sm:col-span-3">
              <label className="block text-xs text-[#686259]">Life Area</label>
              <select
                value={areaId}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-2.5 py-2 text-sm text-[#1C1917]"
              >
                {activeAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-[#686259]">Linked Line Item</label>
              <select
                value={lineItemId}
                onChange={(e) => setLineItemId(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-2.5 py-2 text-sm text-[#1C1917]"
              >
                {areaLineItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-6">
              <label className="block text-xs text-[#686259]">Small Action Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Protect Sunday 9–11am for home maintenance"
                className="mt-1 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917]"
                required
              />
            </div>
            <div className="sm:col-span-9">
              <label className="block text-xs text-[#686259]">Concrete Next Step</label>
              <input
                type="text"
                value={actionStep}
                onChange={(e) => setActionStep(e.target.value)}
                placeholder="Describe the specific, repeatable step you want to test this month…"
                className="mt-1 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917]"
                required
              />
            </div>
            <div className="sm:col-span-3 flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="px-3 py-2 text-xs text-[#686259] hover:text-[#1C1917] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#143326] cursor-pointer"
              >
                Save Goal
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Active & Tracked Goals Section */}
      <section className="space-y-4 border-b border-[#E2DCD0] pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#1C1917]">
              Tracked Goals Tied to Line Items
            </h2>
            <p className="text-xs text-[#686259]">
              {goals.filter((g) => g.status === 'active').length} active ·{' '}
              {goals.filter((g) => g.status === 'completed').length} completed
            </p>
          </div>
          <div
            role="group"
            aria-label="Filter goals by status"
            className="inline-flex items-center rounded-md border border-[#E2DCD0] bg-[#F4F0E8]/70 p-0.5"
          >
            {(['all', 'active', 'completed', 'paused'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#FBF9F5] text-[#1C1917]'
                    : 'text-[#686259] hover:text-[#1C1917]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredGoals.length === 0 ? (
          <p className="py-6 text-sm text-[#686259]">
            No goals in this view yet. Accept any concrete suggestion below or add your own.
          </p>
        ) : (
          <div className="divide-y divide-[#E2DCD0] border-t border-b border-[#E2DCD0]">
            {filteredGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-start"
              >
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#686259]">
                    <button
                      type="button"
                      onClick={() => onSelectArea(goal.areaId)}
                      className="font-medium text-[#44403C] hover:text-[#1B4332] hover:underline cursor-pointer"
                    >
                      {areaNameMap.get(goal.areaId) ?? 'Area'}
                    </button>
                    <span aria-hidden="true">·</span>
                    <span>{lineItemNameMap.get(goal.lineItemId) ?? 'Line Item'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">
                      {goal.status === 'completed'
                        ? 'Completed'
                        : goal.status === 'paused'
                          ? 'Paused'
                          : 'Active'}
                    </span>
                  </div>
                  <h3
                    className={`mt-1 font-serif text-lg font-medium ${
                      goal.status === 'completed'
                        ? 'text-[#686259] line-through'
                        : 'text-[#1C1917]'
                    }`}
                  >
                    {goal.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#44403C]">{goal.actionStep}</p>
                  {goal.note && (
                    <p className="mt-1 text-xs text-[#686259]">{goal.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateGoalStatus(
                        goal.id,
                        goal.status === 'completed' ? 'active' : 'completed'
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                      goal.status === 'completed'
                        ? 'border-[#1B4332] bg-[#ECF2EE] text-[#1B4332]'
                        : 'border-[#E2DCD0] text-[#44403C] hover:border-[#1B4332] hover:text-[#1B4332]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {goal.status === 'completed' ? 'Reopen' : 'Complete'}
                  </button>
                  {goal.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateGoalStatus(
                          goal.id,
                          goal.status === 'paused' ? 'active' : 'paused'
                        )
                      }
                      aria-label={goal.status === 'paused' ? 'Resume goal' : 'Pause goal'}
                      className="rounded-md border border-[#E2DCD0] p-1.5 text-[#686259] hover:bg-[#F4F0E8] hover:text-[#1C1917] cursor-pointer"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteGoal(goal.id)}
                    aria-label={`Remove ${goal.title}`}
                    className="rounded-md border border-[#E2DCD0] p-1.5 text-[#686259] hover:border-[#9A3412]/40 hover:text-[#9A3412] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Offline Suggestions by Weak Area */}
      <section className="space-y-8">
        <div>
          <h2 className="font-serif text-2xl font-medium text-[#1C1917]">
            Suggested Small Actions by Area
          </h2>
          <p className="text-xs text-[#686259]">
            Generated deterministically on your device from your lowest-scoring weighted line items
          </p>
        </div>

        {suggestionGroups.map((group) => (
          <div key={group.areaId} className="border-t border-[#E2DCD0] pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <button
                  type="button"
                  onClick={() => onSelectArea(group.areaId)}
                  className="font-serif text-xl font-medium text-[#1C1917] hover:text-[#1B4332] hover:underline cursor-pointer"
                >
                  {group.areaName}
                </button>
                <span className="ml-3 font-mono text-xs text-[#686259] tabular-nums">
                  Area score {group.areaHealthScore}/100 · Spread{' '}
                  {group.equitySpread > 0 ? `+${group.equitySpread}` : group.equitySpread} · Weight{' '}
                  {group.weight}/5
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
              {group.suggestions.map((sug, idx) => (
                <div
                  key={sug.id}
                  className="flex flex-col justify-between border border-[#E2DCD0] bg-[#FBF9F5] p-4"
                >
                  <div>
                    <p className="text-xs text-[#686259]">
                      0{idx + 1}. {sug.lineItemName} · {sug.effortEstimate}
                    </p>
                    <h3 className="mt-1.5 font-serif text-base font-medium text-[#1C1917]">
                      {sug.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#44403C]">
                      {sug.actionStep}
                    </p>
                    <p className="mt-3 border-t border-[#E2DCD0]/70 pt-2.5 text-[11px] text-[#686259]">
                      Why suggested: {sug.rationale}
                    </p>
                  </div>

                  <div className="mt-4 pt-2">
                    <button
                      type="button"
                      onClick={() => onAcceptSuggestion(sug)}
                      className="w-full rounded-md border border-[#1B4332] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1B4332] hover:bg-[#1B4332] hover:text-[#FBF9F5] transition-colors cursor-pointer"
                    >
                      Accept as Goal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
