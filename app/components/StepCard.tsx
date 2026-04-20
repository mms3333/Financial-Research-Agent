"use client";

import { useState } from "react";
import { ResearchStep, StepExecutionResult, StepStatus } from "@/lib/types";

const statusStyles: Record<StepStatus, string> = {
  pending: "bg-slate-700/60 text-slate-200",
  in_progress: "bg-blue-500/20 text-blue-300",
  complete: "bg-emerald-500/20 text-emerald-300",
  error: "bg-red-500/20 text-red-300"
};

interface StepCardProps {
  index: number;
  step: ResearchStep;
  status: StepStatus;
  result?: StepExecutionResult;
}

export function StepCard({ index, step, status, result }: StepCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Step {index + 1}</p>
          <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
          <p className="mt-1 text-xs text-slate-400">{step.description}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[status]}`}>
          {status.replace("_", " ")}
        </span>
      </div>

      {result ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-slate-400">
            Query: <span className="text-slate-200">{result.query}</span>
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-info hover:text-blue-300"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Hide findings" : "Show findings"}
          </button>
          {expanded ? (
            <div className="mt-2 space-y-2 text-xs text-slate-300">
              <p className="whitespace-pre-wrap">{result.summary}</p>
              {result.sources.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Source Links
                  </p>
                  <ul className="space-y-1">
                    {result.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-info hover:text-blue-300 hover:underline"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
