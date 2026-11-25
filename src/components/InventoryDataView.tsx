import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LayoutGrid,
  List,
  Package,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { AbcClass, SkuAnalytics, SkuItem, StockStatus, XyzClass } from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPct, inferSkuUnit } from '../utils/format.ts';
import { ProductImage } from './ProductImage.tsx';
import { Button, ConfirmDialog, StatusBadge } from './ui.tsx';

interface InventoryDataViewProps {
  items: SkuAnalytics[];
  matrixFilter: { abc: AbcClass; xyz: XyzClass } | null;
  categoryFilterProp?: string | null;
  statusFilterProp?: StockStatus | null;
  onClearMatrixFilter: () => void;
  onClearCategoryProp?: () => void;
  onClearStatusProp?: () => void;
  onAdjustStock: (skuId: string, delta: number) => void;
  onReceiveIncoming: (skuId: string) => void;
  onAddSku: () => void;
  onEditSku: (sku: SkuItem) => void;
  onDeleteSku: (skuId: string) => void;
  onOpenCsvImport: () => void;
  onInspectForecast: (skuId: string) => void;
}

type SortKey = 'priority' | 'value' | 'price' | 'dos' | 'risk' | 'name';
type ViewMode = 'grid' | 'table';

const PAGE_SIZE = 24;

export const InventoryDataView: React.FC<InventoryDataViewProps> = ({
  items,
  matrixFilter,
  categoryFilterProp,
  statusFilterProp,
  onClearMatrixFilter,
  onClearCategoryProp,
  onClearStatusProp,
  onAdjustStock,
  onReceiveIncoming,
  onAddSku,
  onEditSku,
  onDeleteSku,
  onOpenCsvImport,
  onInspectForecast,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('priority');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<SkuItem | null>(null);

  useEffect(() => {
    if (categoryFilterProp) {
      setCategoryFilter(categoryFilterProp);
    }
  }, [categoryFilterProp]);

  useEffect(() => {
    if (statusFilterProp) {
      setStatusFilter(statusFilterProp);
    }
  }, [statusFilterProp]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.sku.category))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((item) => {
      if (matrixFilter) {
        if (item.abcClass !== matrixFilter.abc || item.xyzClass !== matrixFilter.xyz) {
          return false;
        }
      }
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && item.sku.category !== categoryFilter) return false;
      if (
        q &&
        !item.sku.name.toLowerCase().includes(q) &&
        !item.sku.skuCode.toLowerCase().includes(q) &&
        !item.sku.supplier.toLowerCase().includes(q) &&
        !item.sku.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'value') return b.inventoryValue - a.inventoryValue;
      if (sortBy === 'price') return b.sku.unitPrice - a.sku.unitPrice;
      if (sortBy === 'dos') return a.daysOfSupply - b.daysOfSupply;
      if (sortBy === 'risk') return b.stockoutProbability - a.stockoutProbability;
      if (sortBy === 'name') return a.sku.name.localeCompare(b.sku.name);
      return b.priorityScore - a.priorityScore;
    });
  }, [items, matrixFilter, statusFilter, categoryFilter, search, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, sortBy, matrixFilter, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const startNum = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endNum = Math.min(filtered.length, safePage * PAGE_SIZE);

  const hasFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    matrixFilter !== null;

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    onClearMatrixFilter();
    onClearCategoryProp?.();
    onClearStatusProp?.();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] px-5 py-4 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B746E]">
            <span>Catalog &amp; Stock Control</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold tabular-nums text-[#145A43]">
              {formatNumber(filtered.length)} of {formatNumber(items.length)} products
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#292F2C]">
            Product Inventory
          </h2>
          <p className="mt-0.5 text-xs text-[#6B746E]">
            Monitor stock levels, unit pricing, incoming purchase orders, and replenishment thresholds
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="secondary" onClick={onOpenCsvImport}>
            <Upload className="h-3.5 w-3.5 text-[#6B746E]" />
            Import CSV
          </Button>
          <Button type="button" variant="primary" onClick={onAddSku}>
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter & View Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-4 shadow-2xs xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#929A94]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, product, supplier..."
              aria-label="Search inventory"
              className="h-9 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] pr-3 pl-8 text-xs text-[#292F2C] placeholder:text-[#929A94] focus:border-[#145A43] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | StockStatus);
              onClearStatusProp?.();
            }}
            aria-label="Filter by stock status"
            className="h-9 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 text-xs text-[#292F2C] focus:border-[#145A43] focus:outline-none sm:w-auto"
          >
            <option value="ALL">All Statuses ({items.length})</option>
            <option value="Critical Stockout">Critical Stockout</option>
            <option value="Reorder Now">Reorder Now</option>
            <option value="Overstock">Overstock</option>
            <option value="Healthy">Healthy</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              onClearCategoryProp?.();
            }}
            aria-label="Filter by category"
            className="h-9 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 text-xs text-[#292F2C] focus:border-[#145A43] focus:outline-none sm:w-auto sm:max-w-[220px]"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="inline-flex h-9 w-full items-center gap-1.5 rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 text-xs text-[#292F2C] sm:w-auto">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#929A94]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort products"
              className="w-full bg-transparent text-xs text-[#292F2C] focus:outline-none sm:w-auto"
            >
              <option value="priority">Sort: Urgency</option>
              <option value="risk">Sort: Stockout Risk</option>
              <option value="dos">Sort: Lowest Days Supply</option>
              <option value="value">Sort: Inventory Value</option>
              <option value="price">Sort: Selling Price</option>
              <option value="name">Sort: Name A–Z</option>
            </select>
          </div>

          {matrixFilter && (
            <button
              type="button"
              onClick={onClearMatrixFilter}
              className="h-9 rounded-lg border border-[#D99A32]/45 bg-[#E6A23C]/15 px-2.5 text-xs font-medium text-[#9A6714] hover:bg-[#E6A23C]/25 whitespace-nowrap"
            >
              Matrix: Class {matrixFilter.abc}
              {matrixFilter.xyz} × Clear
            </button>
          )}

          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 rounded-lg bg-[#EEEAE0] p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                viewMode === 'grid'
                  ? 'bg-[#FFFEFA] text-[#292F2C] shadow-2xs'
                  : 'text-[#6B746E] hover:text-[#292F2C]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Card View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-[#FFFEFA] text-[#292F2C] shadow-2xs'
                  : 'text-[#6B746E] hover:text-[#292F2C]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Category Quick Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setCategoryFilter('ALL');
            onClearCategoryProp?.();
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
            categoryFilter === 'ALL'
              ? 'border-[#145A43] bg-[#145A43] text-white'
              : 'border-[#E2DDD1] bg-[#FFFEFA] text-[#6B746E] hover:border-[#D2CCB9] hover:text-[#292F2C]'
          }`}
        >
          All ({items.length})
        </button>
        {categories.map((cat) => {
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategoryFilter(cat);
                onClearCategoryProp?.();
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                active
                  ? 'border-[#145A43] bg-[#145A43] text-white'
                  : 'border-[#E2DDD1] bg-[#FFFEFA] text-[#6B746E] hover:border-[#D2CCB9] hover:text-[#292F2C]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-12 text-center shadow-2xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEEAE0] text-[#145A43]">
            <Package className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#292F2C]">
            {items.length === 0
              ? 'Your product catalog is empty'
              : 'No products match the active filters'}
          </p>
          <p className="mt-1 max-w-sm text-xs text-[#6B746E]">
            {items.length === 0
              ? 'Add your first grocery or retail SKU manually or import historical monthly sales from a CSV file.'
              : 'Clear your search or category filter, add a new product manually, or import historical sales via CSV.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {hasFilters && items.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={handleResetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Filters
              </Button>
            )}
            {items.length === 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={onOpenCsvImport}>
                <Upload className="h-3.5 w-3.5" />
                Import CSV
              </Button>
            )}
            <Button type="button" variant="primary" size="sm" onClick={onAddSku}>
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key={`grid-${safePage}-${categoryFilter}-${statusFilter}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {pagedItems.map((item) => {
                const unit = inferSkuUnit(item.sku);
                return (
                  <article
                    key={item.sku.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:border-[#D2CCB9] hover:shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => onInspectForecast(item.sku.id)}
                      className="block w-full text-left focus:outline-none"
                    >
                      <ProductImage
                        name={item.sku.name}
                        category={item.sku.category}
                        skuCode={item.sku.skuCode}
                        imageUrl={item.sku.imageUrl}
                        className="aspect-[4/3] w-full border-b border-[#EEEAE0]"
                        imgClassName="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    </button>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#6B746E]">
                          <span className="truncate">
                            <span className="font-mono font-medium text-[#292F2C]">
                              {item.sku.skuCode}
                            </span>{' '}
                            · {item.sku.category}
                          </span>
                          <span className="font-mono shrink-0 text-[#929A94]">
                            {item.abcClass}
                            {item.xyzClass}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onInspectForecast(item.sku.id)}
                          className="mt-1.5 line-clamp-2 min-h-[2.5rem] w-full text-left text-sm leading-snug font-semibold text-[#292F2C] hover:text-[#145A43]"
                        >
                          {item.sku.name}
                        </button>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="font-mono text-sm font-semibold tabular-nums text-[#292F2C]">
                            {formatCurrency(item.sku.unitPrice)}
                            <span className="ml-1.5 text-[11px] font-normal text-[#929A94]">
                              / {unit}
                            </span>
                          </div>
                          <StatusBadge status={item.status} compact />
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#EEEAE0] pt-3 text-xs">
                        <div className="flex items-center justify-between gap-2 text-[#6B746E] tabular-nums">
                          <span>
                            Avail:{' '}
                            <strong className="font-mono text-[#292F2C]">
                              {formatNumber(item.sku.currentStock)} {unit}
                            </strong>
                            {item.sku.incomingStock > 0 && (
                              <span className="ml-1 font-mono text-[11px] text-[#38865B]">
                                (+{item.sku.incomingStock})
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[11px] text-[#6B746E]">
                            {item.daysOfSupply}d · Risk {formatPct(item.stockoutProbability)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onAdjustStock(item.sku.id, -5)}
                              title="Deduct 5 units sold"
                              className="inline-flex h-7 items-center rounded-md border border-[#D2CCB9] bg-[#FFFEFA] px-2 font-mono text-[11px] text-[#292F2C] hover:bg-[#EEEAE0]"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdjustStock(item.sku.id, 5)}
                              title="Add 5 units"
                              className="inline-flex h-7 items-center rounded-md border border-[#D2CCB9] bg-[#FFFEFA] px-2 font-mono text-[11px] text-[#292F2C] hover:bg-[#EEEAE0]"
                            >
                              +5
                            </button>
                            {item.sku.incomingStock > 0 && (
                              <button
                                type="button"
                                onClick={() => onReceiveIncoming(item.sku.id)}
                                className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-[#145A43] hover:bg-[#145A43]/10"
                              >
                                Receive
                              </button>
                            )}
                          </div>

                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onInspectForecast(item.sku.id)}
                              className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-[#145A43] hover:bg-[#145A43]/10"
                            >
                              Forecast
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditSku(item.sku)}
                              aria-label={`Edit ${item.sku.name}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#6B746E] hover:bg-[#EEEAE0] hover:text-[#292F2C]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(item.sku)}
                              aria-label={`Delete ${item.sku.name}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#929A94] hover:bg-[#C65353]/12 hover:text-[#C65353]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key={`table-${safePage}-${categoryFilter}-${statusFilter}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-2xs"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2DDD1] bg-[#EEEAE0]/60 text-[#6B746E]">
                      <th className="min-w-[220px] px-4 py-3 font-medium">Product</th>
                      <th className="px-3 py-3 font-medium">SKU</th>
                      <th className="px-3 py-3 font-medium">Category</th>
                      <th className="px-3 py-3 text-right font-medium">Quantity</th>
                      <th className="px-3 py-3 font-medium">Unit</th>
                      <th className="px-3 py-3 text-right font-medium">Purchase</th>
                      <th className="px-3 py-3 text-right font-medium">Selling</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEAE0]">
                    {pagedItems.map((item) => {
                      const unit = inferSkuUnit(item.sku);
                      return (
                        <tr key={item.sku.id} className="hover:bg-[#EEEAE0]/35">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ProductImage
                                name={item.sku.name}
                                category={item.sku.category}
                                skuCode={item.sku.skuCode}
                                imageUrl={item.sku.imageUrl}
                                compact
                                className="h-9 w-9 rounded-lg border border-[#E2DDD1]"
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={() => onInspectForecast(item.sku.id)}
                                  className="text-left font-medium text-[#292F2C] hover:text-[#145A43]"
                                >
                                  {item.sku.name}
                                </button>
                                <div className="mt-0.5 text-[11px] text-[#6B746E]">
                                  {item.sku.supplier} · {item.daysOfSupply}d cover
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-[#6B746E] whitespace-nowrap">
                            {item.sku.skuCode}
                          </td>
                          <td className="px-3 py-3 text-[#6B746E] whitespace-nowrap">
                            {item.sku.category}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onAdjustStock(item.sku.id, -5)}
                                title="Deduct 5 units sold"
                                className="rounded-md border border-[#D2CCB9] px-1.5 py-0.5 text-[11px] text-[#6B746E] hover:bg-[#EEEAE0]"
                              >
                                -5
                              </button>
                              <span className="min-w-[2.5rem] text-right font-semibold text-[#292F2C]">
                                {formatNumber(item.sku.currentStock)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onAdjustStock(item.sku.id, 5)}
                                title="Add 5 units"
                                className="rounded-md border border-[#D2CCB9] px-1.5 py-0.5 text-[11px] text-[#6B746E] hover:bg-[#EEEAE0]"
                              >
                                +5
                              </button>
                            </div>
                            {item.sku.incomingStock > 0 && (
                              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#38865B]">
                                <span>+{item.sku.incomingStock} in</span>
                                <button
                                  type="button"
                                  onClick={() => onReceiveIncoming(item.sku.id)}
                                  className="underline hover:text-[#145A43]"
                                >
                                  Receive
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-[#6B746E] whitespace-nowrap">
                            {unit}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-[#6B746E] whitespace-nowrap">
                            {formatCurrency(item.sku.unitCost)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums font-medium text-[#292F2C] whitespace-nowrap">
                            {formatCurrency(item.sku.unitPrice)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <StatusBadge status={item.status} compact />
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onInspectForecast(item.sku.id)}
                                className="rounded-md px-2 py-1 text-[11px] font-medium text-[#145A43] hover:bg-[#145A43]/10"
                              >
                                Forecast
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditSku(item.sku)}
                                aria-label={`Edit ${item.sku.name}`}
                                className="rounded-md p-1.5 text-[#6B746E] hover:bg-[#EEEAE0] hover:text-[#292F2C]"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDelete(item.sku)}
                                aria-label={`Delete ${item.sku.name}`}
                                className="rounded-md p-1.5 text-[#929A94] hover:bg-[#C65353]/12 hover:text-[#C65353]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination Bar */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] px-4 py-3 text-xs text-[#6B746E] shadow-2xs">
          <span className="font-mono tabular-nums">
            Showing {startNum}–{endNum} of {filtered.length} products
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              <span className="font-mono tabular-nums text-[#6B746E]">
                Page {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : 'Delete Product'}
        description={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.skuCode} (${pendingDelete.name}) and its historical sales series from your active workspace.`
            : ''
        }
        confirmLabel="Delete Product"
        cancelLabel="Keep Product"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            onDeleteSku(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
};
