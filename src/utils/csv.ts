import type { PurchaseOrderRecord, SkuItem } from '../shared/types.ts';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export interface CsvParseResult {
  skus: SkuItem[];
  warnings: string[];
  errors: string[];
}

/**
 * Parses a long-format CSV with columns:
 * sku_code, name, category, supplier, unit_cost, unit_price, current_stock,
 * incoming_stock, lead_time_days, min_order_qty, month, units_sold
 */
export function parseInventorySalesCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      skus: [],
      warnings: [],
      errors: ['CSV must contain a header row and at least one data row.'],
    };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const col = (name: string, aliases: string[] = []): number => {
    const candidates = [name, ...aliases];
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const iSku = col('sku_code', ['sku', 'code']);
  const iName = col('name', ['product_name', 'item']);
  const iCat = col('category');
  const iSup = col('supplier', ['vendor']);
  const iCost = col('unit_cost', ['cost']);
  const iPrice = col('unit_price', ['price']);
  const iStock = col('current_stock', ['stock', 'on_hand']);
  const iInc = col('incoming_stock', ['incoming', 'on_order']);
  const iLead = col('lead_time_days', ['lead_time']);
  const iMoq = col('min_order_qty', ['moq']);
  const iMonth = col('month', ['date', 'period']);
  const iUnits = col('units_sold', ['units', 'sales', 'quantity']);

  const missing: string[] = [];
  if (iSku === -1) missing.push('sku_code');
  if (iName === -1) missing.push('name');
  if (iMonth === -1) missing.push('month');
  if (iUnits === -1) missing.push('units_sold');

  if (missing.length > 0) {
    return {
      skus: [],
      warnings: [],
      errors: [`Missing required columns: ${missing.join(', ')}. Download the sample template to check formatting.`],
    };
  }

  const skuMap = new Map<string, SkuItem>();
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    const skuCode = cells[iSku]?.trim();
    const name = cells[iName]?.trim();
    const monthRaw = cells[iMonth]?.trim();
    const unitsNum = Number(cells[iUnits]);

    if (!skuCode || !name) {
      warnings.push(`Row ${r + 1}: skipped due to missing sku_code or name.`);
      continue;
    }

    const monthMatch = monthRaw.match(/^(\d{4})-(\d{1,2})/);
    if (!monthMatch) {
      warnings.push(`Row ${r + 1} (${skuCode}): invalid month "${monthRaw}" (expected YYYY-MM).`);
      continue;
    }
    const cleanMonth = `${monthMatch[1]}-${monthMatch[2].padStart(2, '0')}`;

    if (!Number.isFinite(unitsNum) || unitsNum < 0) {
      warnings.push(`Row ${r + 1} (${skuCode}): invalid units_sold "${cells[iUnits]}".`);
      continue;
    }

    const unitCost = iCost !== -1 && Number.isFinite(Number(cells[iCost])) ? Math.max(0.01, Number(cells[iCost])) : 10;
    const unitPrice = iPrice !== -1 && Number.isFinite(Number(cells[iPrice])) ? Math.max(unitCost, Number(cells[iPrice])) : unitCost * 2.2;
    const currentStock = iStock !== -1 && Number.isFinite(Number(cells[iStock])) ? Math.max(0, Math.round(Number(cells[iStock]))) : 0;
    const incomingStock = iInc !== -1 && Number.isFinite(Number(cells[iInc])) ? Math.max(0, Math.round(Number(cells[iInc]))) : 0;
    const leadTimeDays = iLead !== -1 && Number.isFinite(Number(cells[iLead])) ? Math.max(1, Math.round(Number(cells[iLead]))) : 14;
    const minOrderQty = iMoq !== -1 && Number.isFinite(Number(cells[iMoq])) ? Math.max(1, Math.round(Number(cells[iMoq]))) : 10;

    let existing = skuMap.get(skuCode);
    if (!existing) {
      existing = {
        id: `csv-${skuCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${skuMap.size + 1}`,
        skuCode,
        name,
        category: iCat !== -1 && cells[iCat] ? cells[iCat] : 'General',
        supplier: iSup !== -1 && cells[iSup] ? cells[iSup] : 'Primary Supplier',
        unitCost,
        unitPrice,
        holdingCostRate: 0.22,
        orderFixedCost: 50,
        currentStock,
        incomingStock,
        leadTimeDays,
        leadTimeStdDays: Math.max(1, Math.round(leadTimeDays * 0.22)),
        minOrderQty,
        serviceLevelTarget: 0.95,
        monthlySales: [],
      };
      skuMap.set(skuCode, existing);
    }

    const dupMonth = existing.monthlySales.find((m) => m.month === cleanMonth);
    if (dupMonth) {
      dupMonth.units += Math.round(unitsNum);
    } else {
      existing.monthlySales.push({ month: cleanMonth, units: Math.round(unitsNum) });
    }
  }

  const skus = Array.from(skuMap.values()).map((s) => ({
    ...s,
    monthlySales: s.monthlySales.sort((a, b) => a.month.localeCompare(b.month)),
  }));

  if (skus.length === 0 && errors.length === 0) {
    errors.push('No valid SKU rows were parsed from the CSV file.');
  }

  return { skus, warnings, errors };
}

export const SAMPLE_CSV_TEMPLATE = [
  'sku_code,name,category,supplier,unit_cost,unit_price,current_stock,incoming_stock,lead_time_days,min_order_qty,month,units_sold',
  'IND-GRN-01,Basmati Rice (5kg Pack),Rice and Grains,Punjab Agro Mills,420.00,560.00,32,0,7,25,2026-06,85',
  'IND-GRN-01,Basmati Rice (5kg Pack),Rice and Grains,Punjab Agro Mills,420.00,560.00,32,0,7,25,2026-07,92',
  'IND-GRN-01,Basmati Rice (5kg Pack),Rice and Grains,Punjab Agro Mills,420.00,560.00,32,0,7,25,2026-08,98',
  'IND-GRN-01,Basmati Rice (5kg Pack),Rice and Grains,Punjab Agro Mills,420.00,560.00,32,0,7,25,2026-09,115',
  'IND-GRN-01,Basmati Rice (5kg Pack),Rice and Grains,Punjab Agro Mills,420.00,560.00,32,0,7,25,2026-10,148',
  'IND-GRN-01,Basmati Rice (5kg Pack),Rice and Grains,Punjab Agro Mills,420.00,560.00,32,0,7,25,2026-11,166',
  'IND-OIL-08,Cow Ghee (500ml Jar),Oils and Ghee,Amul & Dairy Fresh Co-op,285.00,360.00,180,0,5,30,2026-06,62',
  'IND-OIL-08,Cow Ghee (500ml Jar),Oils and Ghee,Amul & Dairy Fresh Co-op,285.00,360.00,180,0,5,30,2026-07,58',
  'IND-OIL-08,Cow Ghee (500ml Jar),Oils and Ghee,Amul & Dairy Fresh Co-op,285.00,360.00,180,0,5,30,2026-08,65',
  'IND-OIL-08,Cow Ghee (500ml Jar),Oils and Ghee,Amul & Dairy Fresh Co-op,285.00,360.00,180,0,5,30,2026-09,84',
  'IND-OIL-08,Cow Ghee (500ml Jar),Oils and Ghee,Amul & Dairy Fresh Co-op,285.00,360.00,180,0,5,30,2026-10,132',
  'IND-OIL-08,Cow Ghee (500ml Jar),Oils and Ghee,Amul & Dairy Fresh Co-op,285.00,360.00,180,0,5,30,2026-11,164',
].join('\n');

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function purchaseOrdersToCsv(orders: PurchaseOrderRecord[]): string {
  const header = 'po_id,created_at,supplier,sku_code,item_name,order_qty,unit_cost,line_total';
  const rows: string[] = [header];
  for (const po of orders) {
    for (const item of po.items) {
      const safeName = `"${item.name.replace(/"/g, '""')}"`;
      const safeSupplier = `"${po.supplier.replace(/"/g, '""')}"`;
      rows.push(
        `${po.id},${po.createdAt},${safeSupplier},${item.skuCode},${safeName},${item.qty},${item.unitCost.toFixed(2)},${item.lineTotal.toFixed(2)}`
      );
    }
  }
  return rows.join('\n');
}
