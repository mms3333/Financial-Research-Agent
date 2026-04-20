"use client";

interface ProjectInputProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled?: boolean;
}

export function ProjectInput({ value, onChange, onRun, disabled }: ProjectInputProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <h2 className="text-lg font-semibold text-slate-100">Research Project</h2>
      <p className="mt-1 text-sm text-slate-400">
        Describe the financial research problem the agent should investigate.
      </p>

      <textarea
        className="mt-4 min-h-28 w-full rounded-lg border border-border bg-slate-900/50 p-3 text-sm text-slate-100 outline-none transition focus:border-info"
        placeholder="Analyze the investment outlook for semiconductor stocks in 2025..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />

      <button
        type="button"
        onClick={onRun}
        disabled={disabled || !value.trim()}
        className="mt-4 w-full rounded-lg bg-info px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? "Running..." : "Run Research"}
      </button>
    </div>
  );
}
