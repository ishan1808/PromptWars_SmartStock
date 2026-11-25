import React, { useEffect, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { SkuItem } from '../shared/types.ts';
import {
  parseInventorySalesCsv,
  SAMPLE_CSV_TEMPLATE,
  triggerCsvDownload,
} from '../utils/csv.ts';
import { Button } from './ui.tsx';

interface CsvImportModalProps {
  onClose: () => void;
  onImportSkus: (skus: SkuItem[], mode: 'replace' | 'merge', datasetName?: string) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  onClose,
  onImportSkus,
}) => {
  const [csvText, setCsvText] = useState('');
  const [businessName, setBusinessName] = useState('Imported Indian Store');
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [parsed, setParsed] = useState<ReturnType<typeof parseInventorySalesCsv> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleValidate = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    setParsed(parseInventorySalesCsv(text));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      handleValidate(content);
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (!parsed || parsed.errors.length > 0 || parsed.skus.length === 0) return;
    onImportSkus(parsed.skus, mode, mode === 'replace' ? businessName.trim() || undefined : undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#104735]/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
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
            <h2 id="csv-modal-title" className="text-base font-semibold text-[#292F2C]">
              Import Historical Sales &amp; Inventory CSV
            </h2>
            <p className="text-xs text-[#6B746E]">
              Required columns: sku_code, name, month (YYYY-MM), units_sold
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CSV import"
            className="rounded-lg p-1.5 text-[#6B746E] hover:bg-[#EEEAE0] hover:text-[#292F2C]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#EEEAE0]/65 p-3.5">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-3.5 py-1.5 font-medium text-[#292F2C] hover:bg-[#F5F1E8]">
              <Upload className="h-3.5 w-3.5 text-[#6B746E]" />
              Choose CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleValidate(SAMPLE_CSV_TEMPLATE)}
                className="rounded-md px-2 py-1 font-medium text-[#145A43] hover:bg-[#145A43]/10"
              >
                Load Sample CSV into Preview
              </button>
              <button
                type="button"
                onClick={() =>
                  triggerCsvDownload('smartstock-sample-import.csv', SAMPLE_CSV_TEMPLATE)
                }
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-[#292F2C] hover:bg-[#EEEAE0]"
              >
                <Download className="h-3.5 w-3.5" />
                Download Template
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="csv-paste-area" className="block font-medium text-[#292F2C]">
              Or Paste CSV Rows Directly
            </label>
            <textarea
              id="csv-paste-area"
              rows={6}
              value={csvText}
              onChange={(e) => handleValidate(e.target.value)}
              placeholder="sku_code,name,category,supplier,unit_cost,unit_price,current_stock,incoming_stock,lead_time_days,min_order_qty,month,units_sold"
              className="mt-1.5 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] p-2.5 font-mono text-[11px] text-[#292F2C] placeholder:text-[#929A94] focus:border-[#145A43] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="csv-import-mode" className="block font-medium text-[#292F2C]">
                Import Mode
              </label>
              <select
                id="csv-import-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as 'replace' | 'merge')}
                className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 text-[#292F2C] focus:border-[#145A43] focus:outline-none"
              >
                <option value="replace">Replace Active Portfolio</option>
                <option value="merge">Merge with Existing SKUs</option>
              </select>
            </div>

            {mode === 'replace' && (
              <div>
                <label htmlFor="csv-workspace-name" className="block font-medium text-[#292F2C]">
                  Workspace Name
                </label>
                <input
                  id="csv-workspace-name"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D2CCB9] bg-[#FFFEFA] px-2.5 py-1.5 text-[#292F2C] focus:border-[#145A43] focus:outline-none"
                />
              </div>
            )}
          </div>

          {parsed && (
            <div className="space-y-2 rounded-lg border border-[#E2DDD1] bg-[#F5F1E8]/45 p-3.5">
              {parsed.errors.length > 0 ? (
                <div className="text-[#B43F3F]">
                  <div className="font-semibold">Validation Error</div>
                  {parsed.errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              ) : (
                <div className="text-[#145A43]">
                  <span className="font-semibold">
                    Parsed {parsed.skus.length} SKU(s) ready to import:
                  </span>{' '}
                  {parsed.skus
                    .map((s) => `${s.skuCode} (${s.monthlySales.length} mo)`)
                    .join(', ')}
                </div>
              )}

              {parsed.warnings.length > 0 && (
                <div className="text-[#9A6714]">
                  <div className="font-medium">Warnings ({parsed.warnings.length}):</div>
                  <ul className="mt-0.5 max-h-20 overflow-y-auto">
                    {parsed.warnings.map((w, i) => (
                      <li key={i}>· {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-[#E2DDD1] pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirm}
              disabled={!parsed || parsed.errors.length > 0 || parsed.skus.length === 0}
            >
              Import Dataset
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
