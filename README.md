# SmartStock — AI Inventory & Demand Predictor

SmartStock is a full-stack inventory intelligence, demand forecasting, and purchasing optimization web application designed for small businesses. It combines statistical time-series forecasting under uncertainty with server-side Gemini AI reasoning to help operators prevent stockouts, reduce trapped overstock capital, and plan purchasing decisions under variable demand and supplier lead times.

## Key Features

- **Executive Portfolio Overview**: Real-time tracking of on-hand inventory value, immediate reorder capital, lead-time stockout probability, trapped overstock capital, category exposure charts, and an interactive ABC / XYZ classification matrix.
- **Probabilistic Demand Forecasting (`P10 / P50 / P90`)**: Seasonal index decomposition and damped Holt exponential smoothing generate 6-month forward forecasts with explicit uncertainty cones, safety stock thresholds, and reorder points.
- **AI Reasoning Under Uncertainty**: Server-side Gemini (`gemini-4-hydrogen`) endpoints provide structured SKU-level demand briefs, portfolio-wide procurement audits, and stress-test contingency strategies.
- **What-If Scenario Lab**: Interactive stress-testing for demand surges/drops, supplier lead-time delays, lead-time volatility multipliers, fill-rate service level targets, and purchasing budget caps.
- **Smart Purchase Order Builder**: EOQ and MOQ-aware reorder queue with budget-cap prioritization, live incoming-stock updates upon approval, and CSV export.
- **Inventory & CSV Data Ingestion**: Searchable, sortable SKU ledger with inline stock adjustments, SKU creation/editing, multi-industry business profiles, and validated CSV import with a downloadable template.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, `@google/genai` SDK (`gemini-4-hydrogen`)
- **Build & Tooling**: Vite 8, esbuild, tsx

## Environment Variables

Configure the following environment variables (see `.env.example`):

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key used exclusively on the Express backend. |
| `PORT` | Optional | Server port (defaults to `3000`; automatically injected by Render). |
| `NODE_ENV` | Production | Set to `production` when serving the compiled `dist/` bundle. |

## Local Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

## Deployment on Render

1. Connect the repository to a new **Web Service** on Render.
2. Set the environment variable `GEMINI_API_KEY` in Render's Environment settings (and `NODE_ENV=production`).
3. Configure the exact commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

The production server listens on `0.0.0.0:$PORT` and serves both `/api/*` routes and the compiled frontend bundle.
