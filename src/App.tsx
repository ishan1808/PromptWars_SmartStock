import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Menu,
  RotateCcw,
  ShoppingCart,
  Sliders,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BrandLogo } from './components/BrandLogo.tsx';
import { CsvImportModal } from './components/CsvImportModal.tsx';
import { DemandForecastView } from './components/DemandForecastView.tsx';
import { InventoryDataView } from './components/InventoryDataView.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { PurchaseOrdersView } from './components/PurchaseOrdersView.tsx';
import { ScenarioLabView } from './components/ScenarioLabView.tsx';
import { SkuEditorModal } from './components/SkuEditorModal.tsx';
import { Button, ConfirmDialog, ToastContainer, type ToastItem } from './components/ui.tsx';
import { analyzePortfolio, DEFAULT_SCENARIO } from './shared/forecastEngine.ts';
import { SAMPLE_DATASETS } from './shared/sampleData.ts';
import type {
  AbcClass,
  AiForecastBrief,
  AiPortfolioAudit,
  AiScenarioBrief,
  BusinessDataset,
  PurchaseOrderRecord,
  ScenarioParams,
  SkuAnalytics,
  SkuItem,
  StockStatus,
  XyzClass,
} from './shared/types.ts';
import { formatCurrency } from './utils/format.ts';

type ActiveTab = 'overview' | 'forecast' | 'scenarios' | 'orders' | 'inventory';

const STORAGE_KEY = 'smartstock_workspace_v2';

interface PersistedWorkspace {
  datasetId: string;
  businessName: string;
  industry: string;
  skus: SkuItem[];
  orderHistory: PurchaseOrderRecord[];
}

function loadInitialWorkspace(): PersistedWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>;
      if (Array.isArray(parsed.skus) && parsed.skus.length > 0) {
        return {
          datasetId: parsed.datasetId || 'custom',
          businessName: parsed.businessName || 'My Business',
          industry: parsed.industry || 'Retail & Operations',
          skus: parsed.skus,
          orderHistory: Array.isArray(parsed.orderHistory) ? parsed.orderHistory : [],
        };
      }
    }
  } catch {
    // Fallback to default dataset if storage is unreadable
  }
  const def = SAMPLE_DATASETS[0];
  return {
    datasetId: def.id,
    businessName: def.businessName,
    industry: def.industry,
    skus: def.skus,
    orderHistory: [],
  };
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SS';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const NAV_GROUPS: Array<{
  section: string;
  items: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    section: 'Analytics & Planning',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'forecast', label: 'Demand Forecast', icon: BarChart3 },
      { id: 'scenarios', label: 'Scenario Lab', icon: Sliders },
    ],
  },
  {
    section: 'Operations & Catalog',
    items: [
      { id: 'inventory', label: 'Inventory & Data', icon: Boxes },
      { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function App() {
  const [workspace, setWorkspace] = useState<PersistedWorkspace>(() => loadInitialWorkspace());
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [scenario, setScenario] = useState<ScenarioParams>(DEFAULT_SCENARIO);
  const [selectedSkuId, setSelectedSkuId] = useState<string>(
    () => workspace.skus[0]?.id ?? ''
  );
  const [matrixFilter, setMatrixFilter] = useState<{ abc: AbcClass; xyz: XyzClass } | null>(
    null
  );
  const [categoryJump, setCategoryJump] = useState<string | null>(null);
  const [statusJump, setStatusJump] = useState<StockStatus | null>(null);
  const [poOverrides, setPoOverrides] = useState<
    Record<string, { qty: number; selected: boolean }>
  >({});
  const [storageWarned, setStorageWarned] = useState(false);

  // Modals & Confirmations
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SkuItem | null | undefined>(undefined);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pushToast = useCallback((title: string, tone: ToastItem['tone'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  // AI States
  const [audit, setAudit] = useState<AiPortfolioAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [briefMap, setBriefMap] = useState<Record<string, AiForecastBrief>>({});
  const [briefLoadingId, setBriefLoadingId] = useState<string | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);

  const [scenarioAi, setScenarioAi] = useState<AiScenarioBrief | null>(null);
  const [scenarioAiLoading, setScenarioAiLoading] = useState(false);
  const [scenarioAiError, setScenarioAiError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      if (!storageWarned) {
        setStorageWarned(true);
        pushToast('Browser storage limit reached; use smaller product images to persist edits.', 'warning');
      }
    }
  }, [workspace, storageWarned, pushToast]);

  const { items, summary } = useMemo(
    () => analyzePortfolio(workspace.skus, scenario),
    [workspace.skus, scenario]
  );

  useEffect(() => {
    if (workspace.skus.length > 0 && !workspace.skus.some((s) => s.id === selectedSkuId)) {
      setSelectedSkuId(workspace.skus[0].id);
    }
  }, [workspace.skus, selectedSkuId]);

  const isScenarioModified =
    scenario.demandMultiplier !== 1.0 ||
    scenario.leadTimeShockDays !== 0 ||
    scenario.leadTimeVolatilityMultiplier !== 1.0 ||
    scenario.serviceLevelOverride !== null ||
    scenario.budgetCap !== null;

  const switchPresetDataset = (ds: BusinessDataset) => {
    setWorkspace({
      datasetId: ds.id,
      businessName: ds.businessName,
      industry: ds.industry,
      skus: ds.skus,
      orderHistory: [],
    });
    setSelectedSkuId(ds.skus[0]?.id ?? '');
    setScenario(DEFAULT_SCENARIO);
    setAudit(null);
    setAuditError(null);
    setBriefMap({});
    setBriefError(null);
    setScenarioAi(null);
    setScenarioAiError(null);
    setMatrixFilter(null);
    setCategoryJump(null);
    setStatusJump(null);
    setPoOverrides({});
    pushToast(`Loaded ${ds.businessName} (${ds.skus.length} SKUs)`, 'info');
  };

  const handleRunPortfolioAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/ai/portfolio-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: workspace.businessName,
          skus: workspace.skus,
          scenario,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate portfolio audit.');
      }
      setAudit(data.audit);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Unable to reach AI service.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleGenerateSkuBrief = async (item: SkuAnalytics) => {
    setBriefLoadingId(item.sku.id);
    setBriefError(null);
    try {
      const res = await fetch('/api/ai/forecast-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: item.sku,
          scenario,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate SKU forecast analysis.');
      }
      setBriefMap((prev) => ({ ...prev, [item.sku.id]: data.brief }));
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Unable to reach AI service.');
    } finally {
      setBriefLoadingId(null);
    }
  };

  const handleRunScenarioAi = async (notes: string) => {
    setScenarioAiLoading(true);
    setScenarioAiError(null);
    try {
      const res = await fetch('/api/ai/scenario-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skus: workspace.skus,
          scenario,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run scenario analysis.');
      }
      setScenarioAi(data.analysis);
    } catch (err) {
      setScenarioAiError(err instanceof Error ? err.message : 'Unable to reach AI service.');
    } finally {
      setScenarioAiLoading(false);
    }
  };

  const handleSubmitPurchaseOrders = (lines: Array<{ skuId: string; qty: number }>) => {
    const qtyById = new Map(lines.map((l) => [l.skuId, l.qty]));
    const now = new Date().toISOString().slice(0, 10);
    const bySupplier = new Map<string, PurchaseOrderRecord>();

    workspace.skus.forEach((sku) => {
      const qty = qtyById.get(sku.id);
      if (!qty || qty <= 0) return;
      const lineTotal = Number((qty * sku.unitCost).toFixed(2));
      const existing = bySupplier.get(sku.supplier) ?? {
        id: `PO-${now.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 899)}`,
        createdAt: now,
        supplier: sku.supplier,
        items: [],
        totalCost: 0,
        status: 'Submitted' as const,
      };
      existing.items.push({
        skuCode: sku.skuCode,
        name: sku.name,
        qty,
        unitCost: sku.unitCost,
        lineTotal,
      });
      existing.totalCost = Number((existing.totalCost + lineTotal).toFixed(2));
      bySupplier.set(sku.supplier, existing);
    });

    const newOrders = Array.from(bySupplier.values());
    setWorkspace((prev) => ({
      ...prev,
      skus: prev.skus.map((s) => {
        const addQty = qtyById.get(s.id) ?? 0;
        return addQty > 0 ? { ...s, incomingStock: s.incomingStock + addQty } : s;
      }),
      orderHistory: [...newOrders, ...prev.orderHistory],
    }));
    setBriefMap({});
    setAudit(null);
    setPoOverrides({});
    pushToast(`Submitted ${newOrders.length} purchase order(s)`, 'success');
  };

  const handleScenarioUpdate = (next: ScenarioParams) => {
    setScenario(next);
    setBriefMap({});
    setAudit(null);
    setScenarioAi(null);
    setPoOverrides({});
  };

  const handleAdjustStock = (skuId: string, delta: number) => {
    setWorkspace((prev) => ({
      ...prev,
      skus: prev.skus.map((s) =>
        s.id === skuId ? { ...s, currentStock: Math.max(0, s.currentStock + delta) } : s
      ),
    }));
    setBriefMap((prev) => {
      const next = { ...prev };
      delete next[skuId];
      return next;
    });
    setAudit(null);
  };

  const handleReceiveIncoming = (skuId: string) => {
    const target = workspace.skus.find((s) => s.id === skuId);
    setWorkspace((prev) => ({
      ...prev,
      skus: prev.skus.map((s) =>
        s.id === skuId
          ? { ...s, currentStock: s.currentStock + s.incomingStock, incomingStock: 0 }
          : s
      ),
    }));
    setBriefMap((prev) => {
      const next = { ...prev };
      delete next[skuId];
      return next;
    });
    setAudit(null);
    if (target) {
      pushToast(`Received +${target.incomingStock} units for ${target.name}`, 'success');
    }
  };

  const handleSaveSku = (saved: SkuItem) => {
    const isEdit = workspace.skus.some((s) => s.id === saved.id);
    setWorkspace((prev) => {
      const nextSkus = isEdit
        ? prev.skus.map((s) => (s.id === saved.id ? saved : s))
        : [saved, ...prev.skus];
      return { ...prev, skus: nextSkus };
    });
    setBriefMap((prev) => {
      const next = { ...prev };
      delete next[saved.id];
      return next;
    });
    setAudit(null);
    setSelectedSkuId(saved.id);
    setEditingSku(undefined);
    pushToast(isEdit ? `Updated ${saved.name}` : `Added ${saved.name} to catalog`, 'success');
  };

  const handleDeleteSku = (skuId: string) => {
    const target = workspace.skus.find((s) => s.id === skuId);
    setWorkspace((prev) => ({
      ...prev,
      skus: prev.skus.filter((s) => s.id !== skuId),
    }));
    setBriefMap((prev) => {
      const next = { ...prev };
      delete next[skuId];
      return next;
    });
    setAudit(null);
    if (target) {
      pushToast(`Deleted ${target.name}`, 'warning');
    }
  };

  const handleImportCsvSkus = (
    imported: SkuItem[],
    mode: 'replace' | 'merge',
    datasetName?: string
  ) => {
    setWorkspace((prev) => {
      if (mode === 'replace') {
        return {
          datasetId: 'custom-csv',
          businessName: datasetName || 'Imported Business',
          industry: 'Custom CSV Dataset',
          skus: imported,
          orderHistory: [],
        };
      }
      const map = new Map(prev.skus.map((s) => [s.skuCode.toLowerCase(), s]));
      imported.forEach((item) => {
        map.set(item.skuCode.toLowerCase(), item);
      });
      return { ...prev, skus: Array.from(map.values()) };
    });
    setAudit(null);
    setBriefMap({});
    setScenarioAi(null);
    setActiveTab('overview');
    pushToast(`Imported ${imported.length} SKU(s) (${mode})`, 'success');
  };

  const currentNavLabel = ALL_NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? 'Overview';
  const actionCount = summary.criticalCount + summary.reorderCount;

  const renderSidebarContent = (showMobileClose = false) => (
    <div className="flex min-h-full flex-col justify-between bg-[#145A43] text-[#FFFEFA]">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-[#104735] px-5 py-4">
          <BrandLogo variant="dark" />
          {showMobileClose && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="rounded-lg p-1.5 text-[#EEEAE0] hover:bg-[#104735] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="space-y-5 px-3 py-4" aria-label="Workspace navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.section}>
              <div className="mb-1.5 px-3 text-[11px] font-medium text-[#EEEAE0]/60">
                {group.section}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`relative flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap ${
                        active
                          ? 'bg-[#104735] text-[#FFFEFA] shadow-2xs ring-1 ring-[#E6A23C]/30'
                          : 'text-[#EEEAE0]/80 hover:bg-[#104735]/60 hover:text-[#FFFEFA]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-[#E6A23C]' : 'text-[#EEEAE0]/65'
                          }`}
                        />
                        <span>{item.label}</span>
                      </span>
                      {item.id === 'orders' && actionCount > 0 && (
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#E6A23C]">
                          {actionCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Store Catalog Profiles */}
        <div className="border-t border-[#104735] px-4 py-4">
          <div className="text-[11px] font-medium text-[#EEEAE0]/65">Store Catalog Profiles</div>
          <div className="mt-2 space-y-2">
            {SAMPLE_DATASETS.map((ds) => {
              const isSelected = workspace.datasetId === ds.id;
              return (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => {
                    switchPresetDataset(ds);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                    isSelected
                      ? 'border-[#E6A23C]/65 bg-[#104735] font-medium text-[#FFFEFA] shadow-2xs'
                      : 'border-[#FFFEFA]/12 bg-[#104735]/45 text-[#EEEAE0]/85 hover:border-[#FFFEFA]/25 hover:bg-[#104735]/80'
                  }`}
                >
                  <div className="truncate">{ds.businessName}</div>
                  <div
                    className={`mt-0.5 truncate text-[11px] ${
                      isSelected ? 'text-[#E6A23C]' : 'text-[#EEEAE0]/60'
                    }`}
                  >
                    {ds.skus.length} SKUs · {ds.industry}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Store & User Profile Footer */}
      <div className="border-t border-[#104735] bg-[#104735]/55 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6A23C] font-mono text-xs font-bold text-[#292F2C]">
            {getInitials(workspace.businessName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#FFFEFA]">
              {workspace.businessName}
            </div>
            <div className="font-mono text-[11px] tabular-nums text-[#EEEAE0]/70">
              {workspace.skus.length} active SKUs
            </div>
          </div>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            title="Reset sample data"
            aria-label="Reset sample data"
            className="rounded-lg p-1.5 text-[#EEEAE0]/75 hover:bg-[#FFFEFA]/10 hover:text-[#E6A23C]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F1E8] text-[#292F2C]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[#104735] bg-[#145A43] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{renderSidebarContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-[#104735]/55 backdrop-blur-[1px]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-50 h-full w-72 max-w-[82vw] overflow-y-auto border-r border-[#104735] bg-[#145A43]"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[#E2DDD1] bg-[#FFFEFA]/95 px-4 backdrop-blur-xs sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-1.5 text-[#6B746E] hover:bg-[#EEEAE0] hover:text-[#292F2C] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 truncate text-xs sm:text-sm">
              <span className="hidden truncate font-medium text-[#6B746E] sm:inline">
                {workspace.businessName}
              </span>
              <span className="hidden text-[#D2CCB9] sm:inline">/</span>
              <h1 className="truncate font-semibold text-[#292F2C]">{currentNavLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCsvModalOpen(true)}
            >
              <Upload className="h-3.5 w-3.5 text-[#6B746E]" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('orders')}
            >
              <span className="hidden sm:inline">Purchase Queue ({actionCount})</span>
              <span className="sm:hidden">Orders ({actionCount})</span>
            </Button>
          </div>
        </header>

        {/* Active Scenario Notice Strip (only when non-baseline) */}
        {isScenarioModified && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D99A32]/40 bg-[#E6A23C]/16 px-4 py-2 text-xs text-[#6B4506] sm:px-6">
            <div>
              <span className="font-semibold">Scenario Stress Test Active:</span>{' '}
              Demand {scenario.demandMultiplier.toFixed(2)}x · Lead-Time{' '}
              {scenario.leadTimeShockDays >= 0 ? '+' : ''}
              {scenario.leadTimeShockDays}d · Volatility{' '}
              {scenario.leadTimeVolatilityMultiplier.toFixed(2)}x
              {scenario.serviceLevelOverride
                ? ` · Service Target ${(scenario.serviceLevelOverride * 100).toFixed(0)}%`
                : ''}
              {scenario.budgetCap !== null ? ` · Budget Cap ${formatCurrency(scenario.budgetCap)}` : ''}
            </div>
            <button
              type="button"
              onClick={() => handleScenarioUpdate(DEFAULT_SCENARIO)}
              className="rounded-md px-2 py-0.5 font-medium text-[#6B4506] hover:bg-[#D99A32]/20 whitespace-nowrap"
            >
              Reset to Baseline
            </button>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'overview' && (
                <OverviewView
                  businessName={workspace.businessName}
                  items={items}
                  summary={summary}
                  audit={audit}
                  auditLoading={auditLoading}
                  auditError={auditError}
                  onRunAudit={handleRunPortfolioAudit}
                  onInspectSku={(id) => {
                    setSelectedSkuId(id);
                    setActiveTab('forecast');
                  }}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onFilterByMatrix={(abc, xyz) => {
                    setMatrixFilter({ abc, xyz });
                    setCategoryJump(null);
                    setStatusJump(null);
                    setActiveTab('inventory');
                  }}
                  onFilterByCategory={(cat) => {
                    setCategoryJump(cat);
                    setMatrixFilter(null);
                    setStatusJump(null);
                    setActiveTab('inventory');
                  }}
                  onFilterByStatus={(status) => {
                    setStatusJump(status);
                    setCategoryJump(null);
                    setMatrixFilter(null);
                    setActiveTab('inventory');
                  }}
                />
              )}

              {activeTab === 'forecast' && (
                <DemandForecastView
                  items={items}
                  selectedSkuId={selectedSkuId}
                  onSelectSku={setSelectedSkuId}
                  scenario={scenario}
                  briefMap={briefMap}
                  briefLoadingId={briefLoadingId}
                  briefError={briefError}
                  onGenerateBrief={handleGenerateSkuBrief}
                  onGoToOrders={() => setActiveTab('orders')}
                  onGoToInventory={() => setActiveTab('inventory')}
                />
              )}

              {activeTab === 'scenarios' && (
                <ScenarioLabView
                  skus={workspace.skus}
                  scenario={scenario}
                  onChangeScenario={handleScenarioUpdate}
                  aiAnalysis={scenarioAi}
                  aiLoading={scenarioAiLoading}
                  aiError={scenarioAiError}
                  onRunAiScenario={handleRunScenarioAi}
                  onApplyToOrders={() => setActiveTab('orders')}
                />
              )}

              {activeTab === 'orders' && (
                <PurchaseOrdersView
                  items={items}
                  scenario={scenario}
                  orderHistory={workspace.orderHistory}
                  draftOverrides={poOverrides}
                  onUpdateDraft={(skuId, qty, selected) =>
                    setPoOverrides((prev) => ({ ...prev, [skuId]: { qty, selected } }))
                  }
                  onBatchUpdateDraft={(next) => setPoOverrides(next)}
                  onResetDraft={() => setPoOverrides({})}
                  onSubmitOrders={handleSubmitPurchaseOrders}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryDataView
                  items={items}
                  matrixFilter={matrixFilter}
                  categoryFilterProp={categoryJump}
                  statusFilterProp={statusJump}
                  onClearMatrixFilter={() => setMatrixFilter(null)}
                  onClearCategoryProp={() => setCategoryJump(null)}
                  onClearStatusProp={() => setStatusJump(null)}
                  onAdjustStock={handleAdjustStock}
                  onReceiveIncoming={handleReceiveIncoming}
                  onAddSku={() => setEditingSku(null)}
                  onEditSku={(sku) => setEditingSku(sku)}
                  onDeleteSku={handleDeleteSku}
                  onOpenCsvImport={() => setCsvModalOpen(true)}
                  onInspectForecast={(id) => {
                    setSelectedSkuId(id);
                    setActiveTab('forecast');
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals & Confirmation Dialogs */}
      {csvModalOpen && (
        <CsvImportModal
          onClose={() => setCsvModalOpen(false)}
          onImportSkus={(skus, mode, name) => {
            setPoOverrides({});
            handleImportCsvSkus(skus, mode, name);
          }}
        />
      )}

      {editingSku !== undefined && (
        <SkuEditorModal
          initialSku={editingSku}
          existingSkuCodes={workspace.skus.map((s) => s.skuCode)}
          onClose={() => setEditingSku(undefined)}
          onSave={handleSaveSku}
        />
      )}

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset Workspace to Default Sample Data?"
        description={`This will restore the default ${SAMPLE_DATASETS[0].skus.length}-item Indian grocery & household catalog and clear custom edits or draft purchase history.`}
        confirmLabel="Reset Sample Data"
        cancelLabel="Cancel"
        tone="primary"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setResetConfirmOpen(false);
          switchPresetDataset(SAMPLE_DATASETS[0]);
        }}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
