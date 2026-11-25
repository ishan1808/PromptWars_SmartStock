import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzePortfolio, analyzeSku, DEFAULT_SCENARIO } from './src/shared/forecastEngine.ts';
import type { ScenarioParams, SkuItem } from './src/shared/types.ts';
import {
  generatePortfolioAudit,
  generateScenarioAnalysis,
  generateSkuForecastBrief,
} from './src/server/aiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeScenario(raw: unknown): ScenarioParams {
  if (!raw || typeof raw !== 'object') return DEFAULT_SCENARIO;
  const s = raw as Partial<ScenarioParams>;
  return {
    demandMultiplier:
      typeof s.demandMultiplier === 'number' && Number.isFinite(s.demandMultiplier)
        ? Math.min(3.0, Math.max(0.25, s.demandMultiplier))
        : 1.0,
    leadTimeShockDays:
      typeof s.leadTimeShockDays === 'number' && Number.isFinite(s.leadTimeShockDays)
        ? Math.min(60, Math.max(-14, Math.round(s.leadTimeShockDays)))
        : 0,
    leadTimeVolatilityMultiplier:
      typeof s.leadTimeVolatilityMultiplier === 'number' &&
      Number.isFinite(s.leadTimeVolatilityMultiplier)
        ? Math.min(4.0, Math.max(0.5, s.leadTimeVolatilityMultiplier))
        : 1.0,
    serviceLevelOverride:
      typeof s.serviceLevelOverride === 'number' &&
      s.serviceLevelOverride >= 0.8 &&
      s.serviceLevelOverride <= 0.999
        ? s.serviceLevelOverride
        : null,
    budgetCap:
      typeof s.budgetCap === 'number' && Number.isFinite(s.budgetCap) && s.budgetCap > 0
        ? s.budgetCap
        : null,
  };
}

function isValidSku(raw: unknown): raw is SkuItem {
  if (!raw || typeof raw !== 'object') return false;
  const sku = raw as Partial<SkuItem>;
  return (
    typeof sku.id === 'string' &&
    typeof sku.skuCode === 'string' &&
    typeof sku.name === 'string' &&
    typeof sku.unitCost === 'number' &&
    typeof sku.unitPrice === 'number' &&
    typeof sku.currentStock === 'number' &&
    Array.isArray(sku.monthlySales)
  );
}

async function startServer() {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  app.post('/api/ai/forecast-brief', async (req: Request, res: Response) => {
    try {
      const { sku, scenario } = req.body ?? {};
      if (!isValidSku(sku)) {
        res.status(400).json({ error: 'Invalid SKU payload supplied.' });
        return;
      }
      const cleanScenario = sanitizeScenario(scenario);
      const analytics = analyzeSku(sku, cleanScenario);
      const brief = await generateSkuForecastBrief(analytics, cleanScenario);
      res.json({ brief });
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode || 500;
      const message = err instanceof Error ? err.message : 'Unable to generate forecast brief.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/scenario-analysis', async (req: Request, res: Response) => {
    try {
      const { skus, scenario, notes } = req.body ?? {};
      if (!Array.isArray(skus) || skus.length === 0 || !skus.every(isValidSku)) {
        res.status(400).json({ error: 'A valid non-empty list of SKUs is required.' });
        return;
      }
      const cleanScenario = sanitizeScenario(scenario);
      const { items, summary } = analyzePortfolio(skus, cleanScenario);
      const cleanNotes = typeof notes === 'string' ? notes.slice(0, 500) : undefined;
      const analysis = await generateScenarioAnalysis(items, summary, cleanScenario, cleanNotes);
      res.json({ analysis });
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode || 500;
      const message = err instanceof Error ? err.message : 'Unable to run scenario analysis.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/ai/portfolio-audit', async (req: Request, res: Response) => {
    try {
      const { businessName, skus, scenario } = req.body ?? {};
      if (!Array.isArray(skus) || skus.length === 0 || !skus.every(isValidSku)) {
        res.status(400).json({ error: 'A valid non-empty list of SKUs is required.' });
        return;
      }
      const cleanName =
        typeof businessName === 'string' && businessName.trim()
          ? businessName.trim().slice(0, 120)
          : 'Small Business Portfolio';
      const cleanScenario = sanitizeScenario(scenario);
      const { items, summary } = analyzePortfolio(skus, cleanScenario);
      const audit = await generatePortfolioAudit(cleanName, items, summary);
      res.json({ audit });
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode || 500;
      const message = err instanceof Error ? err.message : 'Unable to generate portfolio audit.';
      res.status(status).json({ error: message });
    }
  });

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const isProduction =
    process.env.NODE_ENV === 'production' || path.basename(__filename) === 'server.js';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('/', (_req: Request, res: Response) => {
        res.status(500).send('Production build not found. Run npm run build first.');
      });
    }
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SmartStock server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SmartStock server:', err);
  process.exit(1);
});
