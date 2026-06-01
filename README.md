# ResearchBot

An autonomous equity research agent built with Next.js 14 (App Router), OpenAI, and Tavily.

ResearchBot takes a financial research problem, creates a step-by-step plan, executes each step with Tavily web search, and produces a detailed integrated report with sources and optional visualizations.

Please look at the ResearchBot UI Example/Walkthrough to see a demo of the UI.

## Next Release

A multi-agent decision system which includes a bull agent (to analyze the upside situation), a bear agent (to analyze the downside situation), and portfolio manager agent to weigh both and make a final investment decision.

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
- `@langchain/langgraph` for multi-agent orchestration
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
  research/
    collect-data.ts    # data collection node (plan + Tavily steps)
    execute-steps.ts   # shared step execution loop
    graph.ts           # LangGraph workflow
    nodes.ts           # bull / bear / portfolio manager nodes
    pipeline.ts        # run_equity_research_pipeline entrypoint
    state.ts           # ResearchState annotation
    types.ts
```

## LangGraph Multi-Agent Pipeline

Ticker-based equity research uses a **LangGraph** workflow with specialized agents:

```text
START → data_collection → (bull_analyst ∥ bear_analyst) → portfolio_manager → END
```

Shared state (`ResearchState`) includes ticker, company/financial/news bundles, research context, bull and bear theses, and the portfolio manager recommendation (`LONG` | `SHORT` | `HOLD`).

### Programmatic entrypoint

```typescript
import { run_equity_research_pipeline } from "@/lib/research";

// Final recommendation only
const recommendation = await run_equity_research_pipeline("AAPL");

// Full debug payload (theses + intermediate state)
const debug = await run_equity_research_pipeline("AAPL", true);
```

### HTTP API

`POST /api/equity-research`

```json
{ "ticker": "AAPL", "debug": false }
```

## LangGraph Studio (visual UI)

LangGraph Studio is a **web UI hosted on LangSmith** that connects to a local dev server and shows your graph, lets you run it step-by-step, and inspect state after each node.

### Prerequisites

1. A free [LangSmith](https://smith.langchain.com/) account.
2. Add to `.env.local` (same file used by `langgraph.json`):

```bash
LANGSMITH_API_KEY=lsv2_...
OPENAI_API_KEY=...
TAVILY_API_KEY=...
```

3. Install dependencies (includes `@langchain/langgraph-cli`):

```bash
npm install --legacy-peer-deps
```

### Start the local LangGraph server

```bash
npm run langgraph:dev
```

You should see:

- **API:** `http://localhost:2024`
- **Studio UI:** `https://smith.langchain.com/studio?baseUrl=http://localhost:2024`

Open the Studio URL in **Chrome or Firefox** (Safari often blocks `localhost`; use `npm run langgraph:dev:tunnel` on Safari).

### Use Studio with this project

1. In Studio, select the graph **`equity_research`** (registered in `langgraph.json`).
2. Open the **Graph** tab to see the flow: `data_collection` → parallel `bull_analyst` / `bear_analyst` → `portfolio_manager`.
3. In **Input**, paste minimal state (data collection fills the rest):

```json
{
  "ticker": "AAPL",
  "company_information": { "ticker": "AAPL", "summary": "", "sources": [] },
  "financial_data": { "summaries": [], "sources": [] },
  "news_data": { "summaries": [], "sources": [] },
  "research_context": "",
  "bull_thesis": "",
  "bear_thesis": "",
  "final_recommendation": null
}
```

4. Click **Run** (or step node-by-node). A full run calls Tavily + OpenAI many times and can take several minutes.
5. After each node, inspect **State** for `bull_thesis`, `bear_thesis`, and `final_recommendation`.

Studio entrypoint for the CLI: `langgraph/graph.ts` (exports `graph`).

## Environment Variables

Create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
TAVILY_API_KEY=your_key_here
LANGSMITH_API_KEY=your_langsmith_key_here
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



