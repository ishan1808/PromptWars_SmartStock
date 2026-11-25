import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AiForecastBrief,
  AiPortfolioAudit,
  AiScenarioBrief,
  PortfolioSummary,
  ScenarioParams,
  SkuAnalytics,
} from '../shared/types.ts';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets (or your hosting environment variables) to enable AI reasoning.'
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseApiError(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object') {
    const anyErr = err as { statusCode?: number; status?: number; message?: string };
    const status = anyErr.statusCode || anyErr.status || 500;
    const rawMsg = anyErr.message || 'Unexpected error communicating with Gemini AI.';

    if (rawMsg.includes('API_KEY_INVALID') || status === 400) {
      return {
        status: 400,
        message: 'The configured Gemini API key appears invalid. Please verify GEMINI_API_KEY in Settings > Secrets.',
      };
    }
    if (rawMsg.includes('PERMISSION_DENIED') || status === 403) {
      return {
        status: 403,
        message: 'Gemini API permission denied. Please check your API key permissions in Settings > Secrets.',
      };
    }
    if (rawMsg.includes('RESOURCE_EXHAUSTED') || status === 429) {
      return {
        status: 429,
        message: 'Gemini API rate limit reached. Please wait a moment and try again.',
      };
    }
    return { status, message: rawMsg };
  }
  return { status: 500, message: 'Failed to generate AI analysis.' };
}

export async function generateSkuForecastBrief(
  analytics: SkuAnalytics,
  scenario: ScenarioParams
): Promise<AiForecastBrief> {
  const ai = getClient();

  const promptPayload = {
    sku: {
      code: analytics.sku.skuCode,
      name: analytics.sku.name,
      category: analytics.sku.category,
      supplier: analytics.sku.supplier,
      unitCost: analytics.sku.unitCost,
      unitPrice: analytics.sku.unitPrice,
      grossMarginPct: analytics.expectedGrossMarginPct,
      currentStock: analytics.sku.currentStock,
      incomingStock: analytics.sku.incomingStock,
      notes: analytics.sku.notes || 'None',
    },
    statisticalModel: {
      avgMonthlyDemand: analytics.avgMonthlyDemand,
      nextMonthP50: analytics.nextMonthForecast,
      next3MonthsP50: analytics.next3MonthsForecast,
      nextMonthRange: {
        p10: analytics.series.find((s) => s.isForecast)?.p10 ?? 0,
        p90: analytics.series.find((s) => s.isForecast)?.p90 ?? 0,
      },
      coefficientOfVariation: analytics.coefficientOfVariation,
      seasonalStrength: analytics.seasonalStrength,
      peakMonth: analytics.peakMonthLabel,
      troughMonth: analytics.troughMonthLabel,
      abcXyzClass: `${analytics.abcClass}${analytics.xyzClass}`,
    },
    inventoryOptimization: {
      status: analytics.status,
      daysOfSupply: analytics.daysOfSupply,
      effectiveLeadTimeDays: analytics.effectiveLeadTimeDays,
      leadTimeUncertaintyStdDays: analytics.effectiveLeadTimeStdDays,
      safetyStock: analytics.safetyStock,
      reorderPoint: analytics.reorderPoint,
      eoq: analytics.eoq,
      recommendedOrderQty: analytics.recommendedOrderQty,
      recommendedOrderCost: analytics.recommendedOrderCost,
      stockoutProbabilityPct: Number((analytics.stockoutProbability * 100).toFixed(1)),
      trappedCapital: analytics.trappedCapital,
    },
    activeScenario: scenario,
    recentHistory: analytics.sku.monthlySales.slice(-8),
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this SKU's historical sales, seasonal pattern, lead-time variability, and probabilistic demand forecast. All monetary values are in Indian Rupees (INR / ₹). Provide clear, actionable purchasing reasoning under uncertainty for an Indian small business operator.\n\nData:\n${JSON.stringify({ currency: 'INR', ...promptPayload })}`,
      config: {
        systemInstruction:
          'You are SmartStock, an expert supply-chain planner and quantitative inventory analyst advising small business owners in India. All monetary figures are in Indian Rupees (INR / ₹); always format currency values using ₹ (never use $ or USD). Be concise, concrete, numerical, and realistic about uncertainty (P10-P90 intervals and supplier lead-time risk). Never invent numbers outside the provided data.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description: 'A crisp 1-sentence executive takeaway for this SKU.',
            },
            demandDrivers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 specific observations from the sales trajectory, promotions, or category trend.',
            },
            seasonalityInsight: {
              type: Type.STRING,
              description: 'Concise analysis of seasonal peaks, troughs, and timing implications.',
            },
            uncertaintyAssessment: {
              type: Type.STRING,
              description: 'Explicit reasoning about the P10-P90 spread, CV, and lead-time volatility.',
            },
            purchasingRecommendation: {
              type: Type.STRING,
              description: 'Clear purchasing decision referencing reorder point, EOQ, safety stock, and capital impact.',
            },
            riskMitigations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 practical next steps or contingency actions.',
            },
            confidenceLevel: {
              type: Type.STRING,
              description: 'Must be exactly one of: High, Moderate, Low.',
            },
          },
          required: [
            'headline',
            'demandDrivers',
            'seasonalityInsight',
            'uncertaintyAssessment',
            'purchasingRecommendation',
            'riskMitigations',
            'confidenceLevel',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }
    const parsed = JSON.parse(rawText) as Partial<AiForecastBrief>;
    const conf = parsed.confidenceLevel;
    return {
      headline: parsed.headline || 'Demand forecast analysis completed.',
      demandDrivers: Array.isArray(parsed.demandDrivers) ? parsed.demandDrivers : [],
      seasonalityInsight: parsed.seasonalityInsight || 'No seasonal anomalies detected.',
      uncertaintyAssessment: parsed.uncertaintyAssessment || 'Evaluate P10–P90 spread against lead time.',
      purchasingRecommendation: parsed.purchasingRecommendation || 'Monitor inventory position against ROP.',
      riskMitigations: Array.isArray(parsed.riskMitigations) ? parsed.riskMitigations : [],
      confidenceLevel: conf === 'High' || conf === 'Moderate' || conf === 'Low' ? conf : 'Moderate',
    };
  } catch (err) {
    const parsedErr = parseApiError(err);
    const wrapped = new Error(parsedErr.message) as Error & { statusCode?: number };
    wrapped.statusCode = parsedErr.status;
    throw wrapped;
  }
}

export async function generateScenarioAnalysis(
  items: SkuAnalytics[],
  summary: PortfolioSummary,
  scenario: ScenarioParams,
  scenarioNotes?: string
): Promise<AiScenarioBrief> {
  const ai = getClient();

  const compactSkus = items.slice(0, 12).map((i) => ({
    skuCode: i.sku.skuCode,
    name: i.sku.name,
    status: i.status,
    abcXyz: `${i.abcClass}${i.xyzClass}`,
    daysOfSupply: i.daysOfSupply,
    effectiveLeadTimeDays: i.effectiveLeadTimeDays,
    stockoutProbabilityPct: Number((i.stockoutProbability * 100).toFixed(1)),
    recommendedOrderQty: i.recommendedOrderQty,
    recommendedOrderCost: i.recommendedOrderCost,
    trappedCapital: i.trappedCapital,
    marginPct: i.expectedGrossMarginPct,
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Evaluate this "What-If" inventory stress-test scenario and advise how an Indian small business should allocate purchasing budget (in INR / ₹) under demand and supplier lead-time uncertainty.\n\nCurrency: INR (₹)\nScenario Parameters: ${JSON.stringify(scenario)}\nOperator Notes: ${scenarioNotes || 'None'}\nPortfolio Summary: ${JSON.stringify(summary)}\nSKU Impacts: ${JSON.stringify(compactSkus)}`,
      config: {
        systemInstruction:
          'You are SmartStock, an inventory optimization and working-capital strategist for Indian businesses. All monetary values are in Indian Rupees (INR / ₹); always format currency figures with ₹ (never use $ or USD). Explain trade-offs between service level, stockout cost, lead-time delays, and cash constraints using only the supplied figures.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: '2-3 sentence summary of how the scenario shifts risk and cash needs.',
            },
            capitalAllocationAdvice: {
              type: Type.STRING,
              description: 'Concrete guidance on prioritizing PO spend, especially if budget-constrained.',
            },
            topVulnerableSkus: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skuCode: { type: Type.STRING },
                  name: { type: Type.STRING },
                  riskSummary: { type: Type.STRING },
                  action: { type: Type.STRING },
                },
                required: ['skuCode', 'name', 'riskSummary', 'action'],
              },
              description: 'Up to 4 highest-risk SKUs under this scenario.',
            },
            contingencyTriggers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 measurable triggers for when to expedite freight or pause reorders.',
            },
          },
          required: [
            'executiveSummary',
            'capitalAllocationAdvice',
            'topVulnerableSkus',
            'contingencyTriggers',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Gemini returned an empty scenario response. Please try again.');
    }
    const parsed = JSON.parse(rawText) as Partial<AiScenarioBrief>;
    return {
      executiveSummary: parsed.executiveSummary || 'Scenario evaluation completed.',
      capitalAllocationAdvice: parsed.capitalAllocationAdvice || 'Prioritize Class A high-risk SKUs first.',
      topVulnerableSkus: Array.isArray(parsed.topVulnerableSkus) ? parsed.topVulnerableSkus : [],
      contingencyTriggers: Array.isArray(parsed.contingencyTriggers) ? parsed.contingencyTriggers : [],
    };
  } catch (err) {
    const parsedErr = parseApiError(err);
    const wrapped = new Error(parsedErr.message) as Error & { statusCode?: number };
    wrapped.statusCode = parsedErr.status;
    throw wrapped;
  }
}

export async function generatePortfolioAudit(
  businessName: string,
  items: SkuAnalytics[],
  summary: PortfolioSummary
): Promise<AiPortfolioAudit> {
  const ai = getClient();

  const compactSkus = items.slice(0, 14).map((i) => ({
    skuCode: i.sku.skuCode,
    name: i.sku.name,
    supplier: i.sku.supplier,
    status: i.status,
    abcXyz: `${i.abcClass}${i.xyzClass}`,
    currentStock: i.sku.currentStock,
    incomingStock: i.sku.incomingStock,
    reorderPoint: i.reorderPoint,
    recommendedOrderQty: i.recommendedOrderQty,
    recommendedOrderCost: i.recommendedOrderCost,
    trappedCapital: i.trappedCapital,
    daysOfSupply: i.daysOfSupply,
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Conduct an executive inventory and procurement audit for ${businessName}. All monetary values are in Indian Rupees (INR / ₹).\n\nCurrency: INR (₹)\nSummary: ${JSON.stringify(summary)}\nSKUs: ${JSON.stringify(compactSkus)}`,
      config: {
        systemInstruction:
          'You are SmartStock, an inventory optimization advisor for Indian businesses. All monetary figures are in Indian Rupees (INR / ₹); always format currency values using ₹ (never use $ or USD). Provide crisp, practical, high-signal purchasing and working-capital recommendations grounded strictly in the provided data.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: '2-sentence portfolio health overview.',
            },
            urgentActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 immediate reorder or expediting actions.',
            },
            workingCapitalOpportunities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 concrete ways to free trapped capital from overstocked SKUs.',
            },
            supplierConcentrationRisks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 observations on supplier lead times or batching POs.',
            },
          },
          required: [
            'summary',
            'urgentActions',
            'workingCapitalOpportunities',
            'supplierConcentrationRisks',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Gemini returned an empty audit response. Please try again.');
    }
    const parsed = JSON.parse(rawText) as Partial<AiPortfolioAudit>;
    return {
      summary: parsed.summary || 'Portfolio audit completed.',
      urgentActions: Array.isArray(parsed.urgentActions) ? parsed.urgentActions : [],
      workingCapitalOpportunities: Array.isArray(parsed.workingCapitalOpportunities)
        ? parsed.workingCapitalOpportunities
        : [],
      supplierConcentrationRisks: Array.isArray(parsed.supplierConcentrationRisks)
        ? parsed.supplierConcentrationRisks
        : [],
    };
  } catch (err) {
    const parsedErr = parseApiError(err);
    const wrapped = new Error(parsedErr.message) as Error & { statusCode?: number };
    wrapped.statusCode = parsedErr.status;
    throw wrapped;
  }
}
