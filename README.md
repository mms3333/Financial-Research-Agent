# ResearchBot

An autonomous equity research agent built with Next.js 14 (App Router), OpenAI, and Tavily.

ResearchBot takes a financial research problem, creates a step-by-step plan, executes each step with Tavily web search, and produces a detailed integrated report with sources and optional visualizations.

Please look at the ResearchBot UI Example/Walkthrough to see a demo of the UI.

## Features

- Project input workflow for equity research questions
- Agent planning (4-6 actionable steps)
- Step execution loop with Tavily-only web research
- Streaming live progress and results in the UI
- Suggested Links section ranked by relevance (top 20)
- Final integrated report in markdown (not separate mini summaries)
- Optional report refinement from user feedback

## Tech Stack

- Next.js 14 + App Router
- TypeScript
- Tailwind CSS
- OpenAI API (`OPENAI_MODEL`, default `gpt-4.1-mini`)
- Tavily API for web search
- `react-markdown` + `remark-gfm`
- `recharts` for charts

## Project Structure

```text
app/
  api/
    agent/
      plan/route.ts      # planning-only endpoint
      refine/route.ts    # feedback-based report refinement
      route.ts           # full agent loop (plan -> execute -> report)
  components/
    FinalReport.tsx
    ProjectInput.tsx
    StepCard.tsx
  globals.css
  layout.tsx
  page.tsx

lib/
  openai.ts
  prompts.ts
  tavily.ts
  types.ts
```

## Environment Variables

Create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
TAVILY_API_KEY=your_key_here
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

### `POST /api/agent/plan`

Generate only the research plan.

Request:

```json
{ "project": "Analyze the investment outlook for semiconductor stocks in 2026" }
```

### `POST /api/agent`

Run full agent workflow (plan, Tavily execution, synthesis, streaming report).

Request:

```json
{ "project": "Analyze the investment outlook for semiconductor stocks in 2026" }
```

Optional planning-only mode on same endpoint:

```json
{ "project": "...", "mode": "plan_only" }
```

### `POST /api/agent/refine`

Update an existing report with user feedback.

Request shape:

```json
{
  "project": "...",
  "currentReport": "...",
  "feedback": "...",
  "stepResults": []
}
```



