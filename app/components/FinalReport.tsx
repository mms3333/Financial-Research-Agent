"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface FinalReportProps {
  markdown: string;
}

interface VisualizationSeries {
  key: string;
  label?: string;
  color?: string;
}

interface VisualizationChart {
  type: "bar" | "line";
  title: string;
  xKey: string;
  yLabel?: string;
  data: Array<Record<string, string | number>>;
  series: VisualizationSeries[];
}

interface VisualizationPayload {
  charts: VisualizationChart[];
}

function parseVisualizationPayload(markdown: string): {
  cleanMarkdown: string;
  charts: VisualizationChart[];
} {
  const match = markdown.match(/```visualization_data\s*([\s\S]*?)```/i);
  if (!match) {
    return { cleanMarkdown: markdown, charts: [] };
  }

  try {
    const parsed = JSON.parse(match[1].trim()) as VisualizationPayload;
    const charts = (parsed.charts ?? []).filter(
      (chart) =>
        (chart.type === "bar" || chart.type === "line") &&
        !!chart.title &&
        !!chart.xKey &&
        Array.isArray(chart.data) &&
        Array.isArray(chart.series) &&
        chart.series.length > 0
    );

    const cleanMarkdown = markdown.replace(match[0], "").trim();
    return { cleanMarkdown, charts: charts.slice(0, 3) };
  } catch {
    return { cleanMarkdown: markdown, charts: [] };
  }
}

export function FinalReport({ markdown }: FinalReportProps) {
  const { cleanMarkdown, charts } = useMemo(() => parseVisualizationPayload(markdown), [markdown]);

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <h2 className="text-lg font-semibold text-slate-100">Final Report</h2>
      {charts.length > 0 ? (
        <div className="mt-4 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Charts</h3>
          {charts.map((chart) => (
            <div key={chart.title} className="rounded-lg border border-border bg-slate-900/40 p-3">
              <p className="mb-2 text-sm font-medium text-slate-100">{chart.title}</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.type === "bar" ? (
                    <BarChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#22314F" />
                      <XAxis dataKey={chart.xKey} stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip />
                      <Legend />
                      {chart.series.map((series) => (
                        <Bar
                          key={series.key}
                          dataKey={series.key}
                          fill={series.color || "#4AA3FF"}
                          name={series.label || series.key}
                        />
                      ))}
                    </BarChart>
                  ) : (
                    <LineChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#22314F" />
                      <XAxis dataKey={chart.xKey} stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip />
                      <Legend />
                      {chart.series.map((series) => (
                        <Line
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          stroke={series.color || "#3DDC97"}
                          name={series.label || series.key}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                        />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="prose prose-invert mt-4 max-w-none prose-headings:text-slate-100 prose-p:text-slate-200 prose-strong:text-white prose-li:text-slate-200 prose-a:text-info">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {cleanMarkdown || "_Awaiting report..._"}
        </ReactMarkdown>
      </div>
    </div>
  );
}
