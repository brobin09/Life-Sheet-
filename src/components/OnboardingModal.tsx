import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { DEFAULT_LIFE_AREAS, LINE_ITEM_TEMPLATES } from '../domain/templates.ts';
import type { LifeArea, LineItemDefinition } from '../domain/types.ts';

interface OnboardingModalProps {
  onApplySetup: (payload: {
    areas: LifeArea[];
    lineItems: LineItemDefinition[];
    initialValues: Record<string, number>;
    periodYear: number;
    periodMonth: number;
  }) => void;
  onClose: () => void;
}

export function OnboardingModal({ onApplySetup, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Step 1: Areas & weights
  const [selectedAreaIds, setSelectedAreaIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const a of DEFAULT_LIFE_AREAS) map[a.id] = true;
    return map;
  });
  const [areaDrafts, setAreaDrafts] = useState<LifeArea[]>(() =>
    DEFAULT_LIFE_AREAS.map((a) => ({ ...a }))
  );

  // Step 2: Templates
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const t of LINE_ITEM_TEMPLATES) map[t.templateId] = true;
    return map;
  });

  // Step 3: Targets, Rubric tweaks & initial values
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const t of LINE_ITEM_TEMPLATES) map[t.templateId] = t.defaultTarget;
    return map;
  });
  const [initialValues, setInitialValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const t of LINE_ITEM_TEMPLATES) {
      map[t.templateId] =
        t.valueType === 'qualitative'
          ? t.direction === 'lower_is_better'
            ? 5
            : 6
          : t.direction === 'lower_is_better'
            ? t.defaultTarget
            : Math.round(t.defaultTarget * 0.75 * 10) / 10;
    }
    return map;
  });

  const activeAreas = areaDrafts.filter((a) => selectedAreaIds[a.id]);
  const activeAreaSet = new Set(activeAreas.map((a) => a.id));
  const candidateTemplates = LINE_ITEM_TEMPLATES.filter((t) => activeAreaSet.has(t.areaId));
  const chosenTemplates = candidateTemplates.filter((t) => selectedTemplateIds[t.templateId]);

  const handleFinish = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const lineItems: LineItemDefinition[] = chosenTemplates.map((tpl) => ({
      id: `item-${tpl.templateId}`,
      areaId: tpl.areaId,
      name: tpl.name,
      statement: tpl.statement,
      section: tpl.section,
      valueType: tpl.valueType,
      direction: tpl.direction,
      unit: tpl.unit,
      ceiling: tpl.ceiling,
      rubric: tpl.rubric,
      defaultTarget: targets[tpl.templateId] ?? tpl.defaultTarget,
      defaultWeight: tpl.defaultWeight,
      tags: tpl.tags,
      archived: false,
    }));

    const initByItemId: Record<string, number> = {};
    for (const tpl of chosenTemplates) {
      initByItemId[`item-${tpl.templateId}`] =
        initialValues[tpl.templateId] ?? tpl.defaultTarget;
    }

    onApplySetup({
      areas: activeAreas.map((a, idx) => ({ ...a, order: idx + 1, archived: false })),
      lineItems,
      initialValues: initByItemId,
      periodYear: year,
      periodMonth: month,
    });
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#E2DCD0] bg-[#FBF9F5]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DCD0] px-6 py-4">
          <div>
            <p className="text-xs text-[#686259]">
              Ledger Onboarding · Step {step + 1} of 3 · Replaces sample data locally on your device
            </p>
            <h2 id="onboarding-title" className="mt-0.5 font-serif text-2xl font-medium text-[#1C1917]">
              {step === 0
                ? 'Choose & Weight Your Life Areas'
                : step === 1
                  ? 'Select Starting Line Items'
                  : 'Set Targets & Baseline Values'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close onboarding"
            className="rounded-md p-1.5 text-[#686259] hover:bg-[#F4F0E8] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[#44403C]">
                Select the life areas you want in your personal ledger, rename any area if desired,
                and assign an importance weight from 1 to 5.
              </p>
              <div className="divide-y divide-[#E2DCD0] border-t border-b border-[#E2DCD0]">
                {areaDrafts.map((area) => {
                  const checked = Boolean(selectedAreaIds[area.id]);
                  return (
                    <div
                      key={area.id}
                      className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-12 sm:items-center"
                    >
                      <div className="sm:col-span-5 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedAreaIds((prev) => ({
                              ...prev,
                              [area.id]: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-[#1B4332] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={area.name}
                          disabled={!checked}
                          onChange={(e) =>
                            setAreaDrafts((prev) =>
                              prev.map((a) =>
                                a.id === area.id ? { ...a, name: e.target.value } : a
                              )
                            )
                          }
                          className="w-full rounded border border-[#E2DCD0] bg-[#FBF9F5] px-2.5 py-1 text-sm font-medium text-[#1C1917] disabled:opacity-50"
                        />
                      </div>
                      <p className="sm:col-span-5 text-xs text-[#686259]">{area.description}</p>
                      <div className="sm:col-span-2 flex justify-end">
                        <select
                          value={area.weight}
                          disabled={!checked}
                          onChange={(e) =>
                            setAreaDrafts((prev) =>
                              prev.map((a) =>
                                a.id === area.id ? { ...a, weight: Number(e.target.value) } : a
                              )
                            )
                          }
                          className="rounded border border-[#E2DCD0] bg-[#FBF9F5] px-2 py-1 font-mono text-xs text-[#1C1917] disabled:opacity-50"
                        >
                          {[1, 2, 3, 4, 5].map((w) => (
                            <option key={w} value={w}>
                              Wt {w}/5
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-[#44403C]">
                Pick the assets, liabilities, inflows, and outflows you want to start with. You can
                add or archive line items anytime after setup.
              </p>
              {activeAreas.map((area) => {
                const templates = candidateTemplates.filter((t) => t.areaId === area.id);
                return (
                  <div key={area.id} className="space-y-2 border-t border-[#E2DCD0] pt-4">
                    <h3 className="font-serif text-base font-medium text-[#1C1917]">{area.name}</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {templates.map((tpl) => (
                        <label
                          key={tpl.templateId}
                          className="flex items-start gap-2.5 border border-[#E2DCD0] bg-[#FBF9F5] p-3 text-xs cursor-pointer hover:bg-[#F4F0E8]/50"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(selectedTemplateIds[tpl.templateId])}
                            onChange={(e) =>
                              setSelectedTemplateIds((prev) => ({
                                ...prev,
                                [tpl.templateId]: e.target.checked,
                              }))
                            }
                            className="mt-0.5 h-4 w-4 accent-[#1B4332]"
                          />
                          <div>
                            <span className="font-medium text-[#1C1917]">{tpl.name}</span>
                            <p className="mt-0.5 text-[#686259] capitalize">
                              {tpl.section} · {tpl.valueType}
                              {tpl.unit ? ` (${tpl.unit})` : ' (1–10 rubric)'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-[#44403C]">
                Review your starting values and targets for the {chosenTemplates.length} selected line
                items. Qualitative items include 2 / 5 / 8 rubric anchors so future check-ins stay
                consistent.
              </p>
              <div className="divide-y divide-[#E2DCD0] border-t border-b border-[#E2DCD0]">
                {chosenTemplates.map((tpl) => (
                  <div
                    key={tpl.templateId}
                    className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-12 sm:items-center"
                  >
                    <div className="sm:col-span-6">
                      <p className="text-sm font-medium text-[#1C1917]">{tpl.name}</p>
                      <p className="text-xs text-[#686259] capitalize">
                        {tpl.section} ·{' '}
                        {tpl.valueType === 'qualitative' ? '1–10 scale' : tpl.unit ?? 'number'}
                      </p>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#686259]">Starting Value</label>
                      <input
                        type="number"
                        step="any"
                        value={initialValues[tpl.templateId] ?? 0}
                        onChange={(e) =>
                          setInitialValues((prev) => ({
                            ...prev,
                            [tpl.templateId]: Number(e.target.value),
                          }))
                        }
                        className="mt-0.5 w-full rounded border border-[#E2DCD0] bg-[#FBF9F5] px-2 py-1 font-mono text-xs tabular-nums text-[#1C1917]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#686259]">Target</label>
                      <input
                        type="number"
                        step="any"
                        value={targets[tpl.templateId] ?? tpl.defaultTarget}
                        onChange={(e) =>
                          setTargets((prev) => ({
                            ...prev,
                            [tpl.templateId]: Number(e.target.value),
                          }))
                        }
                        className="mt-0.5 w-full rounded border border-[#E2DCD0] bg-[#FBF9F5] px-2 py-1 font-mono text-xs tabular-nums text-[#1C1917]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E2DCD0] bg-[#F4F0E8]/60 px-6 py-4">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : 0))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3.5 py-2 text-xs font-medium text-[#44403C] disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back
          </button>

          {step < 2 ? (
            <button
              type="button"
              disabled={step === 0 ? activeAreas.length === 0 : chosenTemplates.length === 0}
              onClick={() => setStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : 2))}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#FBF9F5] disabled:opacity-40 hover:bg-[#143326] cursor-pointer"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#143326] cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Create My Personal Ledger
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
