import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, RotateCcw, SlidersHorizontal, Upload } from 'lucide-react';
import { getQuarterLabel } from '../domain/scoring.ts';
import type { Period } from '../domain/types.ts';

export type PeriodCadence = 'monthly' | 'quarterly';

interface LedgerToolbarProps {
  cadence: PeriodCadence;
  onChangeCadence: (c: PeriodCadence) => void;
  periods: Period[];
  selectedPeriodId: string;
  onSelectPeriodId: (id: string) => void;
  quarters: string[];
  selectedQuarter: string;
  onSelectQuarter: (q: string) => void;
  isSampleData: boolean;
  onOpenOnboarding: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onExportJson: () => void;
  onImportJson: (raw: string) => void;
  onRestoreSample: () => void;
}

export function LedgerToolbar({
  cadence,
  onChangeCadence,
  periods,
  selectedPeriodId,
  onSelectPeriodId,
  quarters,
  selectedQuarter,
  onSelectQuarter,
  isSampleData,
  onOpenOnboarding,
  onExportCsv,
  onExportPdf,
  onExportJson,
  onImportJson,
  onRestoreSample,
}: LedgerToolbarProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="no-print border-b border-[#E2DCD0] bg-[#F4F0E8]/65">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
        {/* Left: Cadence segmented switch + Period dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Statement cadence"
            className="inline-flex items-center rounded-md border border-[#E2DCD0] bg-[#FBF9F5] p-0.5"
          >
            <button
              type="button"
              onClick={() => onChangeCadence('monthly')}
              className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                cadence === 'monthly'
                  ? 'bg-[#1C1917] text-[#FBF9F5]'
                  : 'text-[#686259] hover:text-[#1C1917]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onChangeCadence('quarterly')}
              className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                cadence === 'quarterly'
                  ? 'bg-[#1C1917] text-[#FBF9F5]'
                  : 'text-[#686259] hover:text-[#1C1917]'
              }`}
            >
              Quarterly Rollup
            </button>
          </div>

          {cadence === 'monthly' ? (
            <label className="flex items-center gap-2 text-xs text-[#686259]">
              <span className="sr-only">Select month</span>
              <select
                value={selectedPeriodId}
                onChange={(e) => onSelectPeriodId(e.target.value)}
                className="rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-sm font-medium text-[#1C1917] focus:border-[#1B4332] focus:outline-none cursor-pointer"
              >
                {[...periods].reverse().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex items-center gap-2 text-xs text-[#686259]">
              <span className="sr-only">Select quarter</span>
              <select
                value={selectedQuarter}
                onChange={(e) => onSelectQuarter(e.target.value)}
                className="rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-sm font-medium text-[#1C1917] focus:border-[#1B4332] focus:outline-none cursor-pointer"
              >
                {[...quarters].reverse().map((q) => (
                  <option key={q} value={q}>
                    {getQuarterLabel(q)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <span className="hidden sm:inline text-xs text-[#686259]">
            {isSampleData
              ? 'Sample ledger active · Stored locally on this device'
              : 'Stored locally on this device'}
          </span>
        </div>

        {/* Right: Onboarding + Export dropdown */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] whitespace-nowrap shrink-0 hover:border-[#CEC6B6] hover:bg-[#F4F0E8] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#686259]" aria-hidden="true" />
            {isSampleData ? 'Set Up My Ledger' : 'Setup Wizard'}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              aria-expanded={exportMenuOpen}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] whitespace-nowrap shrink-0 hover:border-[#CEC6B6] hover:bg-[#F4F0E8] transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#686259]" aria-hidden="true" />
              Export &amp; Data
            </button>

            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setExportMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-40 mt-1.5 w-60 rounded-md border border-[#E2DCD0] bg-[#FBF9F5] py-1.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onExportCsv();
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#1C1917] hover:bg-[#F4F0E8] cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-[#686259]" aria-hidden="true" />
                    Download Period CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onExportPdf();
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#1C1917] hover:bg-[#F4F0E8] cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#686259]" aria-hidden="true" />
                    Print / Save PDF Statement
                  </button>

                  <div className="my-1.5 border-t border-[#E2DCD0]" />

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onExportJson();
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#1C1917] hover:bg-[#F4F0E8] cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-[#686259]" aria-hidden="true" />
                    Backup Full Ledger (JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#1C1917] hover:bg-[#F4F0E8] cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-[#686259]" aria-hidden="true" />
                    Restore Backup (JSON)
                  </button>

                  <div className="my-1.5 border-t border-[#E2DCD0]" />

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onRestoreSample();
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#686259] hover:bg-[#F4F0E8] hover:text-[#1C1917] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Load 4-Month Sample Data
                  </button>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
