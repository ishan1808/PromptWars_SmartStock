import React, { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { MonthlySale, SkuItem } from '../shared/types.ts';
import { inferSkuUnit } from '../utils/format.ts';
import { ProductImage } from './ProductImage.tsx';
import { Button } from './ui.tsx';

interface SkuEditorModalProps {
  initialSku: SkuItem | null;
  existingSkuCodes?: string[];
  onClose: () => void;
  onSave: (sku: SkuItem) => void;
}

const INDIAN_CATEGORIES = [
  'Rice and Grains',
  'Flour and Baking Products',
  'Pulses and Lentils',
  'Oils and Ghee',
  'Spices and Masalas',
  'Salt and Sweeteners',
  'Dairy Products',
  'Snacks and Packaged Foods',
  'Beverages',
  'Personal Care Products',
  'Household Cleaning Products',
  'Vegetables',
  'Fruits',
];

const UNIT_OPTIONS = ['units', 'pack', 'kg', 'g', 'L', 'ml', 'btl', 'jar', 'box', 'dozen'];

function buildDefaultMonthlySales(): MonthlySale[] {
  const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  return months.map((m) => ({ month: m, units: 50 }));
}

export const SkuEditorModal: React.FC<SkuEditorModalProps> = ({
  initialSku,
  existingSkuCodes = [],
  onClose,
  onSave,
}) => {
  const [skuCode, setSkuCode] = useState(initialSku?.skuCode ?? '');
  const [name, setName] = useState(initialSku?.name ?? '');
  const [category, setCategory] = useState(initialSku?.category ?? 'Rice and Grains');
  const [supplier, setSupplier] = useState(initialSku?.supplier ?? '');
  const [unit, setUnit] = useState(
    initialSku ? inferSkuUnit(initialSku) : 'pack'
  );
  const [unitCost, setUnitCost] = useState(String(initialSku?.unitCost ?? 85));
  const [unitPrice, setUnitPrice] = useState(String(initialSku?.unitPrice ?? 120));
  const [currentStock, setCurrentStock] = useState(String(initialSku?.currentStock ?? 40));
  const [incomingStock, setIncomingStock] = useState(String(initialSku?.incomingStock ?? 0));
  const [leadTimeDays, setLeadTimeDays] = useState(String(initialSku?.leadTimeDays ?? 7));
  const [leadTimeStdDays, setLeadTimeStdDays] = useState(
    String(initialSku?.leadTimeStdDays ?? 2)
  );
  const [minOrderQty, setMinOrderQty] = useState(String(initialSku?.minOrderQty ?? 20));
  const [serviceLevelTarget, setServiceLevelTarget] = useState(
    String(initialSku?.serviceLevelTarget ?? 0.95)
  );
  const [imageUrl, setImageUrl] = useState(initialSku?.imageUrl ?? '');
  const [notes, setNotes] = useState(initialSku?.notes ?? '');
  const [sales, setSales] = useState<MonthlySale[]>(
    initialSku?.monthlySales.length ? [...initialSku.monthlySales] : buildDefaultMonthlySales()
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const parsedCost = Number(unitCost);
  const parsedPrice = Number(unitPrice);
  const liveMarginPct =
    Number.isFinite(parsedCost) &&
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0 &&
    parsedPrice >= parsedCost
      ? (((parsedPrice - parsedCost) / parsedPrice) * 100).toFixed(1)
      : null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError('Image file must be under 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = skuCode.trim();
    const cleanName = name.trim();
    const cost = Number(unitCost);
    const price = Number(unitPrice);
    const stock = Number(currentStock);
    const incoming = Number(incomingStock);
    const lead = Number(leadTimeDays);
    const leadStd = Number(leadTimeStdDays);
    const moq = Number(minOrderQty);
    const sl = Number(serviceLevelTarget);

    if (!cleanCode || !cleanName) {
      setError('SKU Code and Product Name are required.');
      return;
    }
    const isDuplicateCode = existingSkuCodes.some(
      (code) =>
        code.toLowerCase() === cleanCode.toLowerCase() &&
        (!initialSku || initialSku.skuCode.toLowerCase() !== cleanCode.toLowerCase())
    );
    if (isDuplicateCode) {
      setError(`SKU Code "${cleanCode}" already exists in this catalog.`);
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      setError('Purchase Price (Unit Cost) must be greater than zero.');
      return;
    }
    if (!Number.isFinite(price) || price < cost) {
      setError('Selling Price must be greater than or equal to Purchase Price.');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(incoming) || incoming < 0) {
      setError('Stock quantities cannot be negative.');
      return;
    }
    if (!Number.isFinite(lead) || lead < 1) {
      setError('Lead time must be at least 1 day.');
      return;
    }
    if (!Number.isFinite(moq) || moq < 1) {
      setError('Minimum Order Qty (MOQ) must be at least 1.');
      return;
    }
    if (sales.length === 0 || sales.some((s) => !Number.isFinite(s.units) || s.units < 0)) {
      setError('All monthly sales figures must be valid non-negative numbers.');
      return;
    }

    onSave({
      id: initialSku?.id ?? `sku-${Date.now()}`,
      skuCode: cleanCode,
      name: cleanName,
      category: category.trim() || 'Rice and Grains',
      supplier: supplier.trim() || 'Primary Supplier',
      unit: unit.trim() || 'units',
      unitCost: Number(cost.toFixed(2)),
      unitPrice: Number(price.toFixed(2)),
      holdingCostRate: initialSku?.holdingCostRate ?? 0.22,
      orderFixedCost: initialSku?.orderFixedCost ?? Math.max(120, Math.round(cost * 1.6)),
      currentStock: Math.round(stock),
      incomingStock: Math.round(incoming),
      leadTimeDays: Math.round(lead),
      leadTimeStdDays: Math.max(0.5, Number.isFinite(leadStd) ? leadStd : 2),
      minOrderQty: Math.max(1, Math.round(moq)),
      serviceLevelTarget: Math.min(0.995, Math.max(0.85, sl)),
      imageUrl: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      monthlySales: sales.map((s) => ({ month: s.month, units: Math.round(s.units), promo: s.promo })),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#104735]/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sku-modal-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] shadow-lg"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2DDD1] bg-[#FFFEFA] px-5 py-4">
          <div>
            <h2 id="sku-modal-title" className="text-base font-semibold text-[#292F2C]">
              {initialSku ? `Edit Product · ${initialSku.skuCode}` : 'Add New Product'}
            </h2>
            <p className="text-xs text-[#6B746E]">
              Configure pricing, stock policy, and historical demand series
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[#6B746E] hover:bg-[#EEEAE0] hover:text-[#292F2C]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 text-xs">
          {error && (
            <div className="rounded-lg border border-[#C65353]/35 bg-[#C65353]/10 p-3 text-[#9E3535]">
              {error}
            </div>
          )}

          {/* Section 1: Identity & Classification */}
          <section className="space-y-3">
            <div className="border-b border-[#EEEAE0] pb-1.5 text-xs font-semibold text-[#145A43]">
              1. Product Identity &amp; Classification
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sku-code-input" className="block font-medium text-[#292F2C]">
                  SKU Code *
                </label>
                <input
                  id="sku-code-input"
                  type="text"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="GRN-15"
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 font-mono text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-name-input" className="block font-medium text-[#292F2C]">
                  Product Name *
                </label>
                <input
                  id="sku-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Basmati Rice (5kg)"
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-category-input" className="block font-medium text-[#292F2C]">
                  Category
                </label>
                <input
                  id="sku-category-input"
                  type="text"
                  list="indian-sku-categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
                <datalist id="indian-sku-categories">
                  {INDIAN_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label htmlFor="sku-supplier-input" className="block font-medium text-[#292F2C]">
                    Supplier
                  </label>
                  <input
                    id="sku-supplier-input"
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Punjab Agro Mills"
                    className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="sku-unit-select" className="block font-medium text-[#292F2C]">
                    Unit
                  </label>
                  <select
                    id="sku-unit-select"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2 py-1.5 font-mono text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Pricing & Inventory Policy */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#EEEAE0] pb-1.5">
              <span className="text-xs font-semibold text-[#145A43]">
                2. Pricing, Stock &amp; Replenishment Policy
              </span>
              {liveMarginPct !== null && (
                <span className="font-mono text-[11px] font-medium text-[#38865B]">
                  Gross Margin: {liveMarginPct}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="sku-cost-input" className="block font-medium text-[#292F2C]">
                  Purchase Price (₹)
                </label>
                <input
                  id="sku-cost-input"
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-price-input" className="block font-medium text-[#292F2C]">
                  Selling Price (₹)
                </label>
                <input
                  id="sku-price-input"
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-stock-input" className="block font-medium text-[#292F2C]">
                  On-Hand Qty
                </label>
                <input
                  id="sku-stock-input"
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-incoming-input" className="block font-medium text-[#292F2C]">
                  Incoming PO Qty
                </label>
                <input
                  id="sku-incoming-input"
                  type="number"
                  value={incomingStock}
                  onChange={(e) => setIncomingStock(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-lead-input" className="block font-medium text-[#292F2C]">
                  Lead Time (Days)
                </label>
                <input
                  id="sku-lead-input"
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-leadstd-input" className="block font-medium text-[#292F2C]">
                  Lead Std Dev (Days)
                </label>
                <input
                  id="sku-leadstd-input"
                  type="number"
                  step="0.5"
                  value={leadTimeStdDays}
                  onChange={(e) => setLeadTimeStdDays(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-moq-input" className="block font-medium text-[#292F2C]">
                  Min Order Qty
                </label>
                <input
                  id="sku-moq-input"
                  type="number"
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sku-sl-select" className="block font-medium text-[#292F2C]">
                  Service Target
                </label>
                <select
                  id="sku-sl-select"
                  value={serviceLevelTarget}
                  onChange={(e) => setServiceLevelTarget(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 font-mono text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                >
                  <option value="0.9">90%</option>
                  <option value="0.93">93%</option>
                  <option value="0.95">95%</option>
                  <option value="0.97">97%</option>
                  <option value="0.98">98%</option>
                  <option value="0.99">99%</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Media, Notes & Monthly Sales */}
          <section className="space-y-4">
            <div className="border-b border-[#EEEAE0] pb-1.5 text-xs font-semibold text-[#145A43]">
              3. Product Visual &amp; Historical Monthly Sales
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <ProductImage
                name={name || 'New Product'}
                category={category || 'Rice and Grains'}
                skuCode={skuCode}
                imageUrl={imageUrl}
                className="h-24 w-32 rounded-lg border border-[#E2DDD1]"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <label htmlFor="sku-image-input" className="block font-medium text-[#292F2C]">
                    Product Image URL or Upload (optional)
                  </label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <input
                      id="sku-image-input"
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Leave blank for automatic tailored artwork"
                      className="min-w-[180px] flex-1 rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 font-medium text-[#292F2C] hover:bg-[#EEEAE0] whitespace-nowrap">
                      <ImagePlus className="h-3.5 w-3.5 text-[#145A43]" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {imageUrl.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="rounded-lg border border-[#E2DDD1] px-2.5 py-1.5 text-xs font-medium text-[#6B746E] hover:bg-[#EEEAE0] hover:text-[#292F2C]"
                      >
                        Reset Art
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="sku-notes-input" className="block font-medium text-[#292F2C]">
                    Seasonality &amp; Shelf-Life Notes
                  </label>
                  <input
                    id="sku-notes-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes on festive surges, mandi delays, or shelf life..."
                    className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3 py-1.5 text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-[#292F2C]">
                  Historical Monthly Unit Sales ({sales.length} months)
                </span>
                {sales.length < 18 && (
                  <button
                    type="button"
                    onClick={() => {
                      const firstMonth = sales[0]?.month ?? '2026-06';
                      const [y, m] = firstMonth.split('-').map(Number);
                      const prevDate = new Date(Date.UTC(y, m - 2, 1));
                      const prevMonth = `${prevDate.getUTCFullYear()}-${String(
                        prevDate.getUTCMonth() + 1
                      ).padStart(2, '0')}`;
                      setSales((prev) => [
                        { month: prevMonth, units: prev[0]?.units ?? 50 },
                        ...prev,
                      ]);
                    }}
                    className="rounded-md px-2 py-1 text-xs font-medium text-[#145A43] hover:bg-[#145A43]/10"
                  >
                    + Add Earlier Month
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {sales.map((pt, idx) => (
                  <div key={pt.month} className="rounded-lg border border-[#E2DDD1] bg-[#F5F1E8]/45 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#6B746E]">{pt.month}</span>
                      <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] text-[#6B746E]">
                        <input
                          type="checkbox"
                          checked={Boolean(pt.promo)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSales((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, promo: checked } : row))
                            );
                          }}
                          className="accent-[#145A43]"
                        />
                        Promo
                      </label>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={pt.units}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setSales((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, units: val } : row))
                        );
                      }}
                      className="mt-1 w-full rounded-md border border-[#D2CCB9] bg-[#FFFEFA] px-1.5 py-1 font-mono text-xs tabular-nums text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#E2DDD1] pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {initialSku ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
