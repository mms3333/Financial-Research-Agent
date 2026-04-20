"use client";

import { useMemo, useState } from "react";
import { FinalReport } from "@/app/components/FinalReport";
import { ProjectInput } from "@/app/components/ProjectInput";
import { StepCard } from "@/app/components/StepCard";
import {
  AgentStreamEvent,
  ResearchPlan,
  StepExecutionResult,
  StepStatus
} from "@/lib/types";

export default function HomePage() {
  const [project, setProject] = useState("");
  const [running, setRunning] = useState(false);
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [statusByStepId, setStatusByStepId] = useState<Record<string, StepStatus>>({});
  const [resultsByStepId, setResultsByStepId] = useState<Record<string, StepExecutionResult>>({});
  const [finalReport, setFinalReport] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");
  const [updatingReport, setUpdatingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedSteps = useMemo(() => plan?.steps ?? [], [plan]);
  const suggestedLinks = useMemo(() => {
    const links = Object.values(resultsByStepId).flatMap((result) => result.sources);
    const keywordStopwords = new Set([
      "the",
      "and",
      "for",
      "with",
      "from",
      "into",
      "that",
      "this",
      "what",
      "when",
      "where",
      "about",
      "over",
      "under",
      "after",
      "before",
      "stock",
      "stocks",
      "equity",
      "research"
    ]);

    const keywords = project
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((word) => word.length >= 3 && !keywordStopwords.has(word));

    const byUrl = new Map<
      string,
      { title: string; url: string; mentions: number; keywordMatches: number; score: number }
    >();

    for (const source of links) {
      if (!source.url) continue;
      const text = `${source.title} ${source.url}`.toLowerCase();
      const keywordMatches = keywords.reduce(
        (count, keyword) => (text.includes(keyword) ? count + 1 : count),
        0
      );

      const existing = byUrl.get(source.url);
      if (existing) {
        existing.mentions += 1;
        existing.keywordMatches = Math.max(existing.keywordMatches, keywordMatches);
        existing.score = existing.mentions * 2 + existing.keywordMatches;
      } else {
        byUrl.set(source.url, {
          title: source.title,
          url: source.url,
          mentions: 1,
          keywordMatches,
          score: 2 + keywordMatches
        });
      }
    }

    return Array.from(byUrl.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ title, url }) => ({ title, url }));
  }, [resultsByStepId, project]);

  async function runResearch(): Promise<void> {
    setRunning(true);
    setPlan(null);
    setStatusByStepId({});
    setResultsByStepId({});
    setFinalReport("");
    setError(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project })
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start research run.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffered += decoder.decode(value, { stream: true });
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: AgentStreamEvent;
          try {
            event = JSON.parse(line) as AgentStreamEvent;
          } catch {
            continue;
          }

          if (event.type === "plan") {
            setPlan(event.payload);
            const initialStatuses = Object.fromEntries(
              event.payload.steps.map((step) => [step.id, "pending" as StepStatus])
            );
            setStatusByStepId(initialStatuses);
          } else if (event.type === "step-status") {
            setStatusByStepId((prev) => ({ ...prev, [event.payload.stepId]: event.payload.status }));
          } else if (event.type === "step-result") {
            setResultsByStepId((prev) => ({ ...prev, [event.payload.stepId]: event.payload }));
          } else if (event.type === "final-report-chunk") {
            setFinalReport((prev) => prev + event.payload.chunk);
          } else if (event.type === "final-report-complete") {
            setFinalReport(event.payload.report);
          } else if (event.type === "error") {
            setError(event.payload.message);
          }
        }
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unexpected client error.";
      setError(message);
    } finally {
      setRunning(false);
    }
  }

  async function updateReportFromFeedback(): Promise<void> {
    if (!project.trim() || !finalReport.trim() || !reportFeedback.trim()) {
      setError("Project, current report, and feedback are required to update the report.");
      return;
    }

    setUpdatingReport(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          currentReport: finalReport,
          feedback: reportFeedback,
          stepResults: Object.values(resultsByStepId)
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update report from feedback.");
      }

      const data = (await response.json()) as { report?: string; error?: string };
      if (!data.report) {
        throw new Error(data.error || "No updated report returned.");
      }

      setFinalReport(data.report);
      setReportFeedback("");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unexpected feedback error.";
      setError(message);
    } finally {
      setUpdatingReport(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 lg:flex-row">
      <section className="w-full space-y-4 lg:w-1/3">
        <div className="rounded-xl border border-border bg-panel p-4">
          <h1 className="text-2xl font-bold text-slate-100">ResearchBot</h1>
          <p className="mt-1 text-sm text-slate-400">
            An autonomous equity research agent
          </p>
        </div>

        <ProjectInput value={project} onChange={setProject} onRun={runResearch} disabled={running} />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Execution Steps</h2>
          {orderedSteps.length === 0 ? (
            <p className="rounded-xl border border-border bg-panel p-4 text-sm text-slate-400">
              The plan will appear here once the research run starts.
            </p>
          ) : (
            orderedSteps.map((step, index) => (
              <StepCard
                key={step.id}
                index={index}
                step={step}
                status={statusByStepId[step.id] ?? "pending"}
                result={resultsByStepId[step.id]}
              />
            ))
          )}
        </div>
      </section>

      <section className="w-full space-y-4 lg:w-2/3">
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold text-slate-100">Live Agent Output</h2>
          <p className="mt-2 text-sm text-slate-300">
            The agent streams plan generation, step execution, and report drafting in real time.
          </p>
          {error ? <p className="mt-3 text-sm text-red-300">Error: {error}</p> : null}
        </div>

        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold text-slate-100">Suggested Links</h2>
          <p className="mt-2 text-sm text-slate-300">
            Curated internet sources discovered during step execution.
          </p>
          {suggestedLinks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              Links will populate here as Tavily search results are processed.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {suggestedLinks.map((source) => (
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
          )}
        </div>

        <FinalReport markdown={finalReport} />

        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold text-slate-100">Report Feedback (Optional)</h2>
          <p className="mt-2 text-sm text-slate-300">
            After the final equity report is generated, you can request revisions here.
          </p>
          <textarea
            className="mt-3 min-h-24 w-full rounded-lg border border-border bg-slate-900/50 p-3 text-sm text-slate-100 outline-none transition focus:border-info"
            placeholder="Example: add a deeper valuation comparison and expand downside risks for NVDA vs AMD."
            value={reportFeedback}
            onChange={(event) => setReportFeedback(event.target.value)}
            disabled={updatingReport}
          />
          <button
            type="button"
            onClick={updateReportFromFeedback}
            disabled={updatingReport || !reportFeedback.trim() || !finalReport.trim()}
            className="mt-3 rounded-lg bg-info px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updatingReport ? "Updating Report..." : "Update Report with Feedback"}
          </button>
        </div>
      </section>
    </main>
  );
}
