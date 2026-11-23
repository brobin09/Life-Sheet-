import { X } from 'lucide-react';
import type { ScoreExplanation } from '../domain/types.ts';

interface ScoreBreakdownModalProps {
  explanation: ScoreExplanation | null;
  onClose: () => void;
}

export function ScoreBreakdownModal({ explanation, onClose }: ScoreBreakdownModalProps) {
  if (!explanation) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-breakdown-title"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#E2DCD0] bg-[#FBF9F5] p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DCD0] pb-4">
          <div>
            <p className="text-xs text-[#686259]">{explanation.subtitle}</p>
            <h2
              id="score-breakdown-title"
              className="mt-1 font-serif text-2xl font-medium text-[#1C1917]"
            >
              {explanation.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close score breakdown"
            className="rounded-md p-1.5 text-[#686259] hover:bg-[#F4F0E8] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Result summary strip */}
        <div className="mt-5 flex items-baseline justify-between border-b border-[#E2DCD0] pb-4">
          <div>
            <p className="text-xs text-[#686259]">{explanation.resultLabel}</p>
            <p className="mt-1 font-mono text-xs text-[#44403C]">{explanation.formulaLabel}</p>
          </div>
          <div className="font-mono text-3xl font-semibold tabular-nums text-[#1C1917]">
            {explanation.resultScore}
            <span className="text-sm font-normal text-[#686259]"> / 100</span>
          </div>
        </div>

        {/* Step-by-step plain English walkthrough */}
        <div className="mt-5">
          <h3 className="font-sans text-xs font-semibold text-[#44403C]">
            How this score was computed
          </h3>
          <ol className="mt-2.5 space-y-2 text-sm leading-relaxed text-[#44403C]">
            {explanation.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="font-mono text-xs text-[#686259] pt-0.5 tabular-nums">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Rubric Anchors (when qualitative) */}
        {explanation.rubric && (
          <div className="mt-6 border-t border-[#E2DCD0] pt-5">
            <h3 className="font-sans text-xs font-semibold text-[#44403C]">
              Scoring Rubric Anchors (1–10 Scale)
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="grid grid-cols-[56px_1fr] gap-3">
                <dt className="font-mono text-xs font-semibold text-[#686259] pt-0.5">2 / 10</dt>
                <dd className="text-[#44403C]">{explanation.rubric.anchor2}</dd>
              </div>
              <div className="grid grid-cols-[56px_1fr] gap-3">
                <dt className="font-mono text-xs font-semibold text-[#686259] pt-0.5">5 / 10</dt>
                <dd className="text-[#44403C]">{explanation.rubric.anchor5}</dd>
              </div>
              <div className="grid grid-cols-[56px_1fr] gap-3">
                <dt className="font-mono text-xs font-semibold text-[#686259] pt-0.5">8 / 10</dt>
                <dd className="text-[#44403C]">{explanation.rubric.anchor8}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Component breakdown table */}
        {explanation.components.length > 0 && (
          <div className="mt-6 border-t border-[#E2DCD0] pt-5">
            <h3 className="font-sans text-xs font-semibold text-[#44403C]">
              Inputs &amp; Weighted Components
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2DCD0] text-xs text-[#686259]">
                    <th className="py-2 pr-3 font-medium">Component</th>
                    <th className="py-2 px-2 text-right font-medium">Value / Score</th>
                    {explanation.components.some((c) => c.weight !== undefined) && (
                      <th className="py-2 px-2 text-right font-medium">Weight</th>
                    )}
                    {explanation.components.some((c) => c.contribution !== undefined) && (
                      <th className="py-2 pl-2 text-right font-medium">Contribution</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DCD0]/70">
                  {explanation.components.map((comp, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-3 text-[#1C1917]">{comp.label}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs tabular-nums text-[#44403C]">
                        {comp.value}
                      </td>
                      {explanation.components.some((c) => c.weight !== undefined) && (
                        <td className="py-2 px-2 text-right font-mono text-xs tabular-nums text-[#686259]">
                          {comp.weight ?? '—'}
                        </td>
                      )}
                      {explanation.components.some((c) => c.contribution !== undefined) && (
                        <td className="py-2 pl-2 text-right font-mono text-xs tabular-nums text-[#1C1917]">
                          {comp.contribution ?? '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-[#E2DCD0] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#292524] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
