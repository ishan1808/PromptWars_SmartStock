import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, RotateCcw, ShoppingCart } from 'lucide-react';
import type { PurchaseOrderRecord, ScenarioParams, SkuAnalytics } from '../shared/types.ts';
import { purchaseOrdersToCsv, triggerCsvDownload } from '../utils/csv.ts';
import { formatCurrency, formatNumber, formatPct, inferSkuUnit } from '../utils/format.ts';
import { ProductImage } from './ProductImage.tsx';
import { Button, StatusBadge } from './ui.tsx';

interface DraftLineOverride {
  qty: number;
  selected: boolean;
}

interface PurchaseOrdersViewProps {
  items: SkuAnalytics[];
  scenario: ScenarioParams;
  orderHistory: PurchaseOrderRecord[];
  draftOverrides: Record<string, DraftLineOverride>;
  onUpdateDraft: (skuId: string, qty: number, selected: boolean) => void;
  onBatchUpdateDraft: (next: Record<string, DraftLineOverride>) => void;
  onResetDraft: () => void;
  onSubmitOrders: (lines: Array<{ skuId: string; qty: number }>) => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  items,
  scenario,
  orderHistory,
  draftOverrides,
  onUpdateDraft,
  onBatchUpdateDraft,
  onResetDraft,
  onSubmitOrders,
}) => {
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const getLineState = (item: SkuAnalytics): DraftLineOverride => {
    const ov = draftOverrides[item.sku.id];
    if (ov) return ov;
    return {
      qty: item.recommendedOrderQty,
      selected: item.recommendedOrderQty > 0,
    };
  };

  const hasCustomDraft = Object.keys(draftOverrides).length > 0;

  const suppliers = useMemo(
    () => Array.from(new Set(items.map((i) => i.sku.supplier))).sort(),
    [items]
  );

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (supplierFilter !== 'ALL' && item.sku.supplier !== supplierFilter) return false;
      const line = draftOverrides[item.sku.id];
      const qty = line ? line.qty : item.recommendedOrderQty;
      if (!showAllSkus && item.recommendedOrderQty === 0 && qty === 0) {
        return false;
      }
      return true;
    });
  }, [items, supplierFilter, showAllSkus, draftOverrides]);

  const selectedLines = useMemo(() => {
    return items
      .map((i) => {
        const line = draftOverrides[i.sku.id];
        const qty = line ? line.qty : i.recommendedOrderQty;
        const selected = line ? line.selected : i.recommendedOrderQty > 0;
        return { item: i, qty, selected };
      })
      .filter((entry) => entry.selected && entry.qty > 0)
      .map((entry) => ({
        item: entry.item,
        qty: entry.qty,
        cost: entry.qty * entry.item.sku.unitCost,
      }));
  }, [items, draftOverrides]);

  const totalBatchCost = selectedLines.reduce((acc, l) => acc + l.cost, 0);
  const totalBatchUnits = selectedLines.reduce((acc, l) => acc + l.qty, 0);

  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => {
      const line = getLineState(item);
      return line.selected && line.qty > 0;
    });

  const handleToggleAllVisible = (checked: boolean) => {
    const next: Record<string, DraftLineOverride> = { ...draftOverrides };
    visibleItems.forEach((item) => {
      const current = getLineState(item);
      const nextQty = checked
        ? current.qty > 0
          ? current.qty
          : Math.max(item.recommendedOrderQty, item.sku.minOrderQty)
        : current.qty;
      next[item.sku.id] = { qty: nextQty, selected: checked };
    });
    onBatchUpdateDraft(next);
  };

  const handleFitBudgetCap = () => {
    if (scenario.budgetCap === null || scenario.budgetCap <= 0) return;
    let remaining = scenario.budgetCap;
    const sorted = [...items].sort((a, b) => b.priorityScore - a.priorityScore);
    const next: Record<string, DraftLineOverride> = {};

    for (const item of sorted) {
      if (item.recommendedOrderQty <= 0) {
        next[item.sku.id] = { qty: 0, selected: false };
        continue;
      }
      const fullCost = item.recommendedOrderQty * item.sku.unitCost;
      if (fullCost <= remaining) {
        next[item.sku.id] = { qty: item.recommendedOrderQty, selected: true };
        remaining -= fullCost;
      } else {
        const affordable = Math.floor(remaining / item.sku.unitCost);
        if (affordable >= item.sku.minOrderQty) {
          next[item.sku.id] = { qty: affordable, selected: true };
          remaining -= affordable * item.sku.unitCost;
        } else {
          next[item.sku.id] = { qty: item.recommendedOrderQty, selected: false };
        }
      }
    }
    onBatchUpdateDraft(next);
    setBanner(`Allocated orders to highest-risk SKUs within ${formatCurrency(scenario.budgetCap)} cap.`);
  };

  const handleSubmitBatch = () => {
    if (selectedLines.length === 0) return;
    onSubmitOrders(selectedLines.map((l) => ({ skuId: l.item.sku.id, qty: l.qty })));
    setBanner(
      `Submitted ${selectedLines.length} purchase order line(s) totaling ${formatCurrency(totalBatchCost)}. Incoming stock updated.`
    );
  };

  const handleExportCurrentCsv = () => {
    if (selectedLines.length === 0) return;
    const bySupplier = new Map<string, PurchaseOrderRecord>();
    const now = new Date().toISOString().slice(0, 10);

    selectedLines.forEach(({ item, qty, cost }) => {
      const existing = bySupplier.get(item.sku.supplier) ?? {
        id: `PO-${now}-${bySupplier.size + 1}`,
        createdAt: now,
        supplier: item.sku.supplier,
        items: [],
        totalCost: 0,
        status: 'Draft' as const,
      };
      existing.items.push({
        skuCode: item.sku.skuCode,
        name: item.sku.name,
        qty,
        unitCost: item.sku.unitCost,
        lineTotal: cost,
      });
      existing.totalCost += cost;
      bySupplier.set(item.sku.supplier, existing);
    });

    const csv = purchaseOrdersToCsv(Array.from(bySupplier.values()));
    triggerCsvDownload(`smartstock-purchase-order-${now}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div className="flex items-center justify-between rounded-xl border border-[#38865B]/35 bg-[#38865B]/12 px-4 py-3 text-xs text-[#145A43]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#38865B] shrink-0" />
            <span className="font-medium">{banner}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded-md px-2 py-0.5 text-xs font-medium text-[#145A43] hover:bg-[#38865B]/15"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Batch Controls & Summary */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-2xs lg:flex-row lg:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#292F2C]">
            Purchase Order Builder
          </h2>
          <p className="mt-0.5 text-xs text-[#6B746E]">
            Suggested order quantities balance EOQ batching, MOQ constraints, safety stock, and open incoming POs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-left font-mono tabular-nums lg:text-right">
            <div className="text-xs text-[#6B746E]">
              Selected: {selectedLines.length} SKUs · {formatNumber(totalBatchUnits)} units
            </div>
            <div className="text-base font-semibold text-[#292F2C]">
              {formatCurrency(totalBatchCost)}
            </div>
          </div>

          {hasCustomDraft && (
            <Button type="button" variant="ghost" size="sm" onClick={onResetDraft}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Suggested
            </Button>
          )}

          {scenario.budgetCap !== null && (
            <Button type="button" variant="secondary" onClick={handleFitBudgetCap}>
              Fit to {formatCurrency(scenario.budgetCap)} Cap
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={handleExportCurrentCsv}
            disabled={selectedLines.length === 0}
          >
            <Download className="h-3.5 w-3.5 text-[#6B746E]" />
            Export PO CSV
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmitBatch}
            disabled={selectedLines.length === 0}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Approve &amp; Mark Ordered
          </Button>
        </div>
      </div>

      {/* Filters & Order Table */}
      <div className="overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD1] px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="po-supplier" className="text-xs font-medium text-[#6B746E]">
              Supplier:
            </label>
            <select
              id="po-supplier"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 text-xs text-[#292F2C] focus:border-[#145A43] focus:outline-none"
            >
              <option value="ALL">All Suppliers ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#6B746E]">
            <input
              type="checkbox"
              checked={showAllSkus}
              onChange={(e) => setShowAllSkus(e.target.checked)}
              className="accent-[#145A43]"
            />
            Show healthy / overstocked SKUs (0 suggested)
          </label>
        </div>

        {visibleItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#6B746E]">
            No purchase orders are currently recommended for this filter. Enable &ldquo;Show healthy / overstocked SKUs&rdquo; to place a manual order.
          </div>
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#E2DDD1] bg-[#EEEAE0]/90 text-[#6B746E] backdrop-blur-xs">
                  <th className="w-10 px-4 py-2.5">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(e) => handleToggleAllVisible(e.target.checked)}
                        aria-label="Select all visible purchase order rows"
                        className="accent-[#145A43]"
                      />
                    </label>
                  </th>
                  <th className="min-w-[220px] px-3 py-2.5 font-medium">SKU / Supplier</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    Inv Position / ROP
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Risk</th>
                  <th className="px-3 py-2.5 text-right font-medium">Suggested</th>
                  <th className="px-3 py-2.5 text-right font-medium">Order Qty</th>
                  <th className="px-4 py-2.5 text-right font-medium">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAE0]">
                {visibleItems.map((item) => {
                  const line = getLineState(item);
                  const qty = line.qty;
                  const included = line.selected;
                  const unit = inferSkuUnit(item.sku);
                  return (
                    <tr key={item.sku.id} className="hover:bg-[#EEEAE0]/35">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={(e) =>
                            onUpdateDraft(item.sku.id, qty, e.target.checked)
                          }
                          aria-label={`Include ${item.sku.name}`}
                          className="accent-[#145A43]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            name={item.sku.name}
                            category={item.sku.category}
                            skuCode={item.sku.skuCode}
                            imageUrl={item.sku.imageUrl}
                            compact
                            className="h-8 w-8 rounded-md border border-[#E2DDD1]"
                          />
                          <div>
                            <div className="font-medium text-[#292F2C]">{item.sku.name}</div>
                            <div className="mt-0.5 text-[11px] text-[#6B746E]">
                              <span className="font-mono">{item.sku.skuCode}</span> · {item.sku.supplier} ·
                              MOQ {item.sku.minOrderQty} {unit} · {item.effectiveLeadTimeDays}d lead
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={item.status} compact />
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#292F2C] whitespace-nowrap">
                        {formatNumber(item.inventoryPosition)} / {formatNumber(item.reorderPoint)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#292F2C]">
                        {formatPct(item.stockoutProbability)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#6B746E]">
                        {formatNumber(item.recommendedOrderQty)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) => {
                            const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                            onUpdateDraft(item.sku.id, val, val > 0);
                          }}
                          aria-label={`Order quantity for ${item.sku.name}`}
                          className="w-20 rounded-md border border-[#D2CCB9] bg-[#FFFEFA] px-2 py-1 text-right font-mono text-xs tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#292F2C] whitespace-nowrap">
                        {formatCurrency(qty * item.sku.unitCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submitted PO Log */}
      {orderHistory.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E2DDD1] px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[#292F2C]">
              Submitted Purchase Orders ({orderHistory.length})
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                triggerCsvDownload('smartstock-po-history.csv', purchaseOrdersToCsv(orderHistory))
              }
            >
              Download All History CSV
            </Button>
          </div>
          <div className="divide-y divide-[#EEEAE0]">
            {orderHistory.map((po) => (
              <div
                key={po.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-[#292F2C]">{po.id}</span>
                  <span className="mx-2 text-[#D2CCB9]">·</span>
                  <span className="font-medium text-[#292F2C]">{po.supplier}</span>
                  <span className="mx-2 text-[#D2CCB9]">·</span>
                  <span className="text-[#6B746E]">
                    {po.items.map((i) => `${i.skuCode} (${i.qty}u)`).join(', ')}
                  </span>
                </div>
                <div className="font-mono tabular-nums font-semibold text-[#145A43]">
                  {formatCurrency(po.totalCost)} · {po.createdAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
