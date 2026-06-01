# ResearchBot

A multi-agent decision system, which includes a bull agent (to analyze the upside), a bear agent (to analyze the downside), and portfolio manager agent to weigh both and make a final investment decision built with Next.js 14 (App Router), OpenAI, and Tavily.

ResearchBot takes a financial research problem, creates a step-by-step plan, executes each step with Tavily web search, and produces a detailed integrated report with sources and optional visualizations.

Please look at the ResearchBot UI Example/Walkthrough to see a demo of the UI.

## Features

- Project input workflow for equity research questions
- Agent planning (4-6 actionable steps)
- Step execution loop with Tavily-only web research
- Streaming live progress and results in the UI
- Suggested Links section sorted by relevance
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
## LangChain
<img width="1329" height="827" alt="image" src="https://github.com/user-attachments/assets/677b7da3-4d1e-4916-8429-07b6621ffd2c" />

## Web UI
<img width="1321" height="811" alt="image" src="https://github.com/user-attachments/assets/8c969313-4f1a-4a02-9d24-b03c34b060a3" />



