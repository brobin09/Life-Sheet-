import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { scoreLineItem } from '../domain/scoring.ts';
import { LINE_ITEM_TEMPLATES } from '../domain/templates.ts';
import type {
  LifeArea,
  LineItemDefinition,
  LineItemEntry,
  ScoringDirection,
  StatementSection,
  StatementType,
  ValueType,
} from '../domain/types.ts';

interface LineItemModalProps {
  areas: LifeArea[];
  periodId: string;
  defaultAreaId?: string;
  defaultSection?: StatementSection;
  editingItem?: { definition: LineItemDefinition; entry?: LineItemEntry } | null;
  onSave: (
    definition: Omit<LineItemDefinition, 'id' | 'archived'> & { id?: string },
    entry: { value: number; target: number; weight: number; note: string }
  ) => void;
  onArchive?: (lineItemId: string) => void;
  onClose: () => void;
}

function sectionToStatement(section: StatementSection): StatementType {
  return section === 'asset' || section === 'liability' ? 'balance_sheet' : 'income_statement';
}

function defaultDirectionForSection(section: StatementSection): ScoringDirection {
  return section === 'asset' || section === 'inflow' ? 'higher_is_better' : 'lower_is_better';
}

export function LineItemModal({
  areas,
  periodId,
  defaultAreaId,
  defaultSection = 'asset',
  editingItem,
  onSave,
  onArchive,
  onClose,
}: LineItemModalProps) {
  const activeAreas = areas.filter((a) => !a.archived);
  const existingDef = editingItem?.definition;
  const existingEntry = editingItem?.entry;

  const [areaId, setAreaId] = useState(
    existingDef?.areaId ?? defaultAreaId ?? activeAreas[0]?.id ?? ''
  );
  const [section, setSection] = useState<StatementSection>(
    existingDef?.section ?? defaultSection
  );
  const [name, setName] = useState(existingDef?.name ?? '');
  const [valueType, setValueType] = useState<ValueType>(
    existingDef?.valueType ?? 'qualitative'
  );
  const [direction, setDirection] = useState<ScoringDirection>(
    existingDef?.direction ?? defaultDirectionForSection(existingDef?.section ?? defaultSection)
  );
  const [unit, setUnit] = useState(existingDef?.unit ?? 'hrs/wk');
  const [ceiling, setCeiling] = useState(
    existingDef?.ceiling !== undefined ? String(existingDef.ceiling) : ''
  );
  const [target, setTarget] = useState(
    String(existingEntry?.target ?? existingDef?.defaultTarget ?? (valueType === 'qualitative' ? 8 : 5))
  );
  const [value, setValue] = useState(
    String(existingEntry?.value ?? (valueType === 'qualitative' ? 6 : 3))
  );
  const [weight, setWeight] = useState(
    existingEntry?.weight ?? existingDef?.defaultWeight ?? 3
  );
  const [note, setNote] = useState(existingEntry?.note ?? '');
  const [anchor2, setAnchor2] = useState(
    existingDef?.rubric?.anchor2 ?? 'Noticeably strained or neglected with frequent friction.'
  );
  const [anchor5, setAnchor5] = useState(
    existingDef?.rubric?.anchor5 ?? 'Functional and steady, with clear room to strengthen.'
  );
  const [anchor8, setAnchor8] = useState(
    existingDef?.rubric?.anchor8 ?? 'Consistently resilient, calm, and aligned with long-term goals.'
  );
  const [error, setError] = useState('');

  const handleSectionChange = (nextSection: StatementSection) => {
    setSection(nextSection);
    if (!editingItem) {
      const nextDir = defaultDirectionForSection(nextSection);
      setDirection(nextDir);
      if (valueType === 'qualitative') {
        setTarget(nextDir === 'lower_is_better' ? '3' : '8');
      }
    }
  };

  const applyTemplate = (templateId: string) => {
    const tpl = LINE_ITEM_TEMPLATES.find((t) => t.templateId === templateId);
    if (!tpl) return;
    setAreaId(tpl.areaId);
    setSection(tpl.section);
    setName(tpl.name);
    setValueType(tpl.valueType);
    setDirection(tpl.direction);
    setUnit(tpl.unit ?? '');
    setCeiling(tpl.ceiling !== undefined ? String(tpl.ceiling) : '');
    setTarget(String(tpl.defaultTarget));
    setWeight(tpl.defaultWeight);
    if (tpl.rubric) {
      setAnchor2(tpl.rubric.anchor2);
      setAnchor5(tpl.rubric.anchor5);
      setAnchor8(tpl.rubric.anchor8);
      setValue(tpl.direction === 'lower_is_better' ? '5' : '6');
    } else {
      setValue(String(tpl.defaultTarget));
    }
  };

  const previewScore = useMemo(() => {
    const parsedVal = Number(value);
    const parsedTarget = Number(target);
    const parsedCeiling = ceiling.trim() !== '' ? Number(ceiling) : undefined;
    const def: LineItemDefinition = {
      id: existingDef?.id ?? 'preview',
      areaId,
      name: name || 'Preview item',
      statement: sectionToStatement(section),
      section,
      valueType,
      direction,
      unit: valueType === 'quantitative' ? unit : undefined,
      ceiling: parsedCeiling,
      rubric: valueType === 'qualitative' ? { anchor2, anchor5, anchor8 } : undefined,
      defaultTarget: Number.isFinite(parsedTarget) ? parsedTarget : 0,
      defaultWeight: weight,
      tags: existingDef?.tags ?? [],
      archived: false,
    };
    return scoreLineItem(def, {
      id: 'preview-entry',
      periodId,
      lineItemId: def.id,
      value: Number.isFinite(parsedVal) ? parsedVal : 0,
      target: Number.isFinite(parsedTarget) ? parsedTarget : 0,
      weight,
      note,
      updatedAt: new Date().toISOString(),
    });
  }, [
    anchor2,
    anchor5,
    anchor8,
    areaId,
    ceiling,
    direction,
    existingDef,
    name,
    note,
    periodId,
    section,
    target,
    unit,
    value,
    valueType,
    weight,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name for this line item.');
      return;
    }
    const numVal = Number(value);
    const numTarget = Number(target);
    if (!Number.isFinite(numVal) || !Number.isFinite(numTarget)) {
      setError('Value and target must be valid numbers.');
      return;
    }
    if (valueType === 'qualitative' && (numVal < 1 || numVal > 10 || numTarget < 1 || numTarget > 10)) {
      setError('Qualitative ratings and targets must be between 1 and 10.');
      return;
    }

    const parsedCeiling = ceiling.trim() !== '' && Number.isFinite(Number(ceiling))
      ? Number(ceiling)
      : undefined;

    onSave(
      {
        id: existingDef?.id,
        areaId,
        name: name.trim(),
        statement: sectionToStatement(section),
        section,
        valueType,
        direction,
        unit: valueType === 'quantitative' ? unit.trim() : undefined,
        ceiling: valueType === 'quantitative' && direction === 'lower_is_better' ? parsedCeiling : undefined,
        rubric:
          valueType === 'qualitative'
            ? {
                anchor2: anchor2.trim() || 'Low / strained baseline',
                anchor5: anchor5.trim() || 'Steady middle baseline',
                anchor8: anchor8.trim() || 'Strong target baseline',
              }
            : undefined,
        defaultTarget: numTarget,
        defaultWeight: weight,
        tags: existingDef?.tags ?? [section, areaId.replace('area-', '')],
      },
      {
        value: numVal,
        target: numTarget,
        weight,
        note: note.trim(),
      }
    );
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="line-item-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#E2DCD0] bg-[#FBF9F5] p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DCD0] pb-4">
          <div>
            <p className="text-xs text-[#686259]">
              {editingItem ? 'Edit line item definition & current period entry' : 'Add a line item to your ledger'}
            </p>
            <h2
              id="line-item-modal-title"
              className="mt-1 font-serif text-2xl font-medium text-[#1C1917]"
            >
              {editingItem ? existingDef?.name : 'New Line Item'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close line item editor"
            className="rounded-md p-1.5 text-[#686259] hover:bg-[#F4F0E8] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {!editingItem && (
            <div className="rounded-md border border-[#E2DCD0] bg-[#F4F0E8]/60 p-3.5">
              <label className="block text-xs font-medium text-[#44403C]">
                Start from a template (optional)
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
                }}
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              >
                <option value="">Choose a curated line item template…</option>
                {LINE_ITEM_TEMPLATES.map((tpl) => {
                  const areaName = activeAreas.find((a) => a.id === tpl.areaId)?.name ?? tpl.areaId;
                  return (
                    <option key={tpl.templateId} value={tpl.templateId}>
                      {areaName} · {tpl.section} · {tpl.name} ({tpl.valueType})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Area & Section */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#44403C]">Life Area</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              >
                {activeAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C]">Statement Section</label>
              <select
                value={section}
                onChange={(e) => handleSectionChange(e.target.value as StatementSection)}
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              >
                <option value="asset">Balance Sheet — Asset (capacity / stability)</option>
                <option value="liability">Balance Sheet — Liability (drain / obligation)</option>
                <option value="inflow">Income Statement — Inflow (adds energy / progress)</option>
                <option value="outflow">Income Statement — Outflow (consumes time / energy)</option>
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[#44403C]">Line Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emergency Reserve, Restorative Sleep Quality, Deferred Home Repairs"
              className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#686259]/70 focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          {/* Measurement Type & Direction */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#44403C]">Value Type</label>
              <div className="mt-1.5 grid grid-cols-2 rounded-md border border-[#E2DCD0] bg-[#F4F0E8] p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setValueType('quantitative');
                    if (!editingItem) {
                      setTarget(direction === 'lower_is_better' ? '0' : '5');
                      setValue('3');
                    }
                  }}
                  className={`rounded py-1.5 text-xs font-medium cursor-pointer ${
                    valueType === 'quantitative'
                      ? 'bg-[#FBF9F5] text-[#1C1917]'
                      : 'text-[#686259]'
                  }`}
                >
                  Quantitative
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValueType('qualitative');
                    if (!editingItem) {
                      setTarget(direction === 'lower_is_better' ? '3' : '8');
                      setValue('6');
                    }
                  }}
                  className={`rounded py-1.5 text-xs font-medium cursor-pointer ${
                    valueType === 'qualitative'
                      ? 'bg-[#FBF9F5] text-[#1C1917]'
                      : 'text-[#686259]'
                  }`}
                >
                  Qualitative (1–10)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C]">Health Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as ScoringDirection)}
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              >
                <option value="higher_is_better">Higher value is healthier</option>
                <option value="lower_is_better">Lower value is healthier</option>
              </select>
            </div>
          </div>

          {/* Numeric inputs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-[#44403C]">
                Current Value {valueType === 'qualitative' ? '(1–10)' : ''}
              </label>
              <input
                type="number"
                step="any"
                min={valueType === 'qualitative' ? 1 : undefined}
                max={valueType === 'qualitative' ? 10 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 font-mono text-sm tabular-nums text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403C]">
                Target {valueType === 'qualitative' ? '(1–10)' : ''}
              </label>
              <input
                type="number"
                step="any"
                min={valueType === 'qualitative' ? 1 : undefined}
                max={valueType === 'qualitative' ? 10 : undefined}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 font-mono text-sm tabular-nums text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              />
            </div>

            {valueType === 'quantitative' && (
              <div>
                <label className="block text-xs font-medium text-[#44403C]">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="USD, hrs/wk, days/wk"
                  className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#44403C]">
                Weight (1–5)
              </label>
              <select
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 font-mono text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              >
                <option value={1}>1 · Minor</option>
                <option value={2}>2 · Supporting</option>
                <option value={3}>3 · Standard</option>
                <option value={4}>4 · Important</option>
                <option value={5}>5 · Core</option>
              </select>
            </div>
          </div>

          {valueType === 'quantitative' && direction === 'lower_is_better' && Number(target) === 0 && (
            <div>
              <label className="block text-xs font-medium text-[#44403C]">
                Reference Ceiling for Zero-Target Scoring (optional)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={ceiling}
                onChange={(e) => setCeiling(e.target.value)}
                placeholder="e.g., 15000 for debt or 12 for maintenance items (score hits 0 at this ceiling)"
                className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 font-mono text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
              />
            </div>
          )}

          {/* Qualitative Rubric Anchors */}
          {valueType === 'qualitative' && (
            <div className="space-y-3 rounded-md border border-[#E2DCD0] bg-[#F4F0E8]/55 p-4">
              <p className="text-xs font-semibold text-[#44403C]">
                Qualitative Rubric Anchors (keeps scoring consistent across periods)
              </p>
              <div>
                <label className="block text-xs text-[#686259]">What does a 2 / 10 mean?</label>
                <input
                  type="text"
                  value={anchor2}
                  onChange={(e) => setAnchor2(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#686259]">What does a 5 / 10 mean?</label>
                <input
                  type="text"
                  value={anchor5}
                  onChange={(e) => setAnchor5(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#686259]">What does an 8 / 10 mean?</label>
                <input
                  type="text"
                  value={anchor8}
                  onChange={(e) => setAnchor8(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-sm text-[#1C1917] focus:border-[#1B4332] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-[#44403C]">Period Note (optional)</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Brief factual context for this period…"
              className="mt-1.5 w-full rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#686259]/70 focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          {/* Transparent Live Score Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-b border-[#E2DCD0] py-3.5">
            <div>
              <p className="text-xs font-medium text-[#44403C]">Live Normalized Health Preview</p>
              <p className="mt-0.5 font-mono text-xs text-[#686259]">
                {previewScore.explanation.formulaLabel}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-semibold tabular-nums text-[#1C1917]">
                {previewScore.healthScore}
              </span>
              <span className="font-mono text-xs text-[#686259]"> / 100</span>
              <p className="text-xs text-[#686259]">{previewScore.statusLabel}</p>
            </div>
          </div>

          {error && <p className="text-xs font-medium text-[#9A3412]">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              {editingItem && onArchive && existingDef && (
                <button
                  type="button"
                  onClick={() => {
                    onArchive(existingDef.id);
                    onClose();
                  }}
                  className="text-xs font-medium text-[#9A3412] hover:underline cursor-pointer"
                >
                  Archive line item
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[#E2DCD0] px-4 py-2 text-xs font-medium text-[#44403C] hover:bg-[#F4F0E8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-[#1B4332] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#143326] cursor-pointer"
              >
                {editingItem ? 'Save Changes' : 'Add to Statement'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
