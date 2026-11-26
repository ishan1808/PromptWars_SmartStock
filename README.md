# SmartStock — AI Inventory & Demand Predictor

AI-powered demand forecasting, seasonal trend analysis, scenario modeling, and inventory optimization for small businesses.

---

## Problem Statement

Small businesses and local retail operators—especially Indian grocery and kirana stores managing fast-moving perishables, seasonal festive goods, and multi-supplier staples—often rely on static spreadsheets or gut instinct to decide **what, when, and how much to reorder**. Without accounting for seasonal demand shifts, promotional spikes, supplier lead-time delays, and demand volatility, stores face costly stockouts on high-velocity items alongside working capital trapped in slow-moving overstock.

**SmartStock** addresses the challenge: *analyze historical sales, seasonal trends, and current inventory levels to optimize purchasing decisions under uncertainty.*

---

## How SmartStock Solves It

- **Historical Sales Ingestion & Catalog Management** → **Inventory & Data** workspace supports manual SKU creation/editing with a monthly sales & promo editor, bulk **CSV Import** (merge or replace mode with downloadable template), instant stock steppers (`-5` / `+5`), incoming PO receiving, and live INR (`₹`) valuation across 146 Indian grocery & household products.
- **Seasonal Trend & Volatility Analysis** → **Demand Forecast** decomposes monthly sales into normalized 12-month **Seasonal Indices** (down-weighting promotional spikes), highlights **Peak & Trough Season** months, and scores **Seasonality %** and **Coefficient of Variation (CV)** into **ABC/XYZ** classes.
- **Demand Forecasting Under Uncertainty (P10 / P50 / P90)** → **Demand Forecast** combines damped Holt exponential smoothing with empirical residual variance to chart **Actual Sales**, **Predicted P50**, and **P10–P90 Uncertainty Bands** across **3-Month** or **6-Month Horizons**, plus a **12-Week Stock Runway** simulation.
- **Reorder-Point, Safety Stock & Low-Stock Detection** → **Overview Command Center** and **Inventory & Data** continuously flag `Critical Stockout`, `Reorder Now`, `Healthy`, and `Overstock` SKUs against dynamic **Reorder Points (ROP)**, **Safety Stock**, **Economic Order Quantity (EOQ)**, **Stockout Probability**, and **Trapped Overstock Capital**.
- **What-If Scenario Modeling & Capital Allocation** → **Scenario Lab** lets operators stress-test **Demand Shifts**, **Lead-Time Delay Shocks**, **Supplier Volatility**, **Service Level Targets (90%–99%)**, and **Purchasing Budget Caps (₹)** with real-time baseline vs. scenario comparisons; **Purchase Orders** includes a risk-prioritized **Fit to Budget Cap** allocator and CSV PO export.
- **Explainable AI Reasoning & Procurement Briefings** → **Gemini AI** backend endpoints generate structured executive briefings on **Overview**, SKU-level **Demand & Uncertainty Reasoning** on **Demand Forecast**, and **Contingency Strategies** inside **Scenario Lab**.

---

## Features

- **Overview Command Center**: Real-time INR (`₹`) valuation KPIs, 6-month portfolio unit sales movement chart, interactive Stock Posture Breakdown shortcuts, Category Inventory vs. Reorder Exposure bars, clickable ABC/XYZ Risk Matrix, tabbed Priority Stock & Reorder Queue, and AI Procurement Briefing.
- **Demand Forecast**: Searchable & category-filterable SKU navigator, 3M/6M forecast horizon toggle, interactive P10–P90 probabilistic fan chart, 12-week stock runway chart against Safety Stock & ROP, monthly forecast table, and AI uncertainty reasoning.
- **Scenario Lab**: Pre-built Indian retail stress presets (*Diwali Festive Surge*, *Monsoon Transit Delay*, *Off-Season Softness*, *Peak Surge + Cash Cap*) plus custom sliders, baseline-vs-scenario SKU delta table with *Impacted / At-Risk* filter, and AI Contingency Strategist.
- **Inventory & Data**: Responsive Card View and Table View with unique bespoke illustrations for all 146 Indian grocery & household SKUs (plus custom image upload/URL support), 13 category quick-filters, status/sort controls, pagination, and persistent `localStorage` state.
- **Purchase Orders**: EOQ/MOQ-aware order builder with bulk Select-All, custom draft quantities preserved across tab navigation, supplier filtering, working-capital budget cap fitting, PO approval tracking (updating incoming stock), and CSV export.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `motion`, `lucide-react`
- **Backend**: Node.js, Express (`server.ts`) serving API routes and production static assets
- **AI Integration**: Google GenAI SDK (`@google/genai`, `gemini-4-hydrogen`) with strict JSON schema responses
- **Testing**: Vitest (Node test environment)

---

## Setup and Run Instructions

### Prerequisites
- Node.js `>= 18` and `npm`
- A Google Gemini API key (`GEMINI_API_KEY`) for AI briefings and scenario narratives (quantitative forecasting, charts, CSV import/export, and PO workflows work offline without an API key)

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (see `.env.example`):
   ```bash
   export GEMINI_API_KEY="your_gemini_api_key"
   ```
3. Start the full-stack development server (Express API + Vite middleware on port `3000`):
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

### Production Build & Render Deployment
- **Service Type**: Render **Web Service** (Node)
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment Variables**: `GEMINI_API_KEY` (and optional `NODE_ENV=production`; `server.ts` binds automatically to `0.0.0.0` on `process.env.PORT`)

---

## How to Run Tests

Run the automated Vitest suite:

```bash
npm test
```

The suite (`src/shared/__tests__/forecastEngine.test.ts`) executes 12 unit tests covering:
- **Demand forecasting**: empty-history resilience, 3M/6M forecast horizons, strict `P10 <= P50 <= P90` bounds, damped Holt trend extrapolation, and horizon-dependent uncertainty growth.
- **Seasonal trend calculation**: 12-month seasonal index normalization (`mean ≈ 1.0`), peak/trough detection, promotional spike down-weighting, and Coefficient of Variation (`CV`) XYZ classification.
- **Reorder-point & stock detection**: `Critical Stockout`, `Reorder Now`, `Healthy`, and `Overstock` thresholds, incoming stock credit in inventory position, MOQ/EOQ floors, trapped capital, and ABC revenue Pareto ranking.
- **Scenario modeling**: demand multiplier scaling, lead-time delay shocks, supplier volatility multipliers, and service-level target overrides.

---

## Assumptions

- **Uncertainty Modeling**:
  - Monthly demand uncertainty uses empirical one-step Holt forecast residual standard deviation $\sigma_{\text{res}}$ floored by a Poisson minimum $\sqrt{\max(1, \bar{D})}$. Forward 80% prediction intervals (`P10` / `P90`) use $z_{0.90} \approx 1.2816$ and scale across horizon $h$ by $\sqrt{1 + 0.35(h - 1)}$ multiplied by the seasonal index and upside demand factor.
  - Replenishment safety stock accounts for **joint demand and supplier lead-time uncertainty**:
    $$\sigma_{\text{LTD}} = \sqrt{L_{\text{eff}} \cdot \sigma_D^2 + \bar{D}^2 \cdot \sigma_{L,\text{eff}}^2}$$
    where daily demand std is $\sigma_D = \sigma_{\text{res}} / \sqrt{30}$ and $\text{Safety Stock} = \lceil z_{\text{SL}} \cdot \sigma_{\text{LTD}} \rceil$.
- **Forecast Horizon & Calendar**: Near-term daily demand rate blends the next two forecasted months (`60%` Month 1 + `40%` Month 2) divided by a standardized `30`-day month.
- **Seasonality & Promotions**: When fewer than 24 monthly observations exist per SKU, raw month ratios shrink smoothly toward `1.0` to prevent noisy spikes from overfitting, and months flagged with `promo: true` are down-weighted (`0.85x`) during baseline seasonal estimation.
- **Ordering Policy**: Reorders trigger when `inventoryPosition (currentStock + incomingStock) <= reorderPoint`, targeting `reorderPoint + max(EOQ, 21 days of demand)` while honoring supplier `minOrderQty`.
- **Persistence**: Workspace edits, custom SKUs, and submitted PO logs persist locally in browser `localStorage` (`smartstock_workspace_v2`).
