import type { SkuItem, StockStatus } from '../shared/types.ts';

export function formatCurrency(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '₹0';
  if (compact && Math.abs(value) >= 10000) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

export function formatPct(fractionOrPct: number, isFraction = true): string {
  const val = isFraction ? fractionOrPct * 100 : fractionOrPct;
  return `${val.toFixed(1)}%`;
}

export function inferSkuUnit(sku: Pick<SkuItem, 'unit' | 'name' | 'category'>): string {
  if (sku.unit && sku.unit.trim()) return sku.unit.trim();
  const n = sku.name.toLowerCase();
  const c = sku.category.toLowerCase();
  if (n.includes('oil') || n.includes('milk') || n.includes('buttermilk') || n.includes('juice') || n.includes('handwash') || n.includes('shampoo') || n.includes('conditioner') || n.includes('cleaner') || n.includes('softener') || n.includes('liquid')) {
    return 'btl';
  }
  if (n.includes('ghee') || n.includes('honey') || n.includes('pickle') || n.includes('coffee') || n.includes('asafoetida') || n.includes('yeast')) {
    return 'jar';
  }
  if (c === 'vegetables' || c === 'fruits') {
    return n.includes('banana') ? 'dozen' : 'kg';
  }
  if (c.includes('rice') || c.includes('flour') || c.includes('pulses') || n.includes('sugar') || n.includes('salt') || n.includes('jaggery')) {
    return 'pack';
  }
  return 'units';
}

export function getStatusStyle(status: StockStatus): {
  textClass: string;
  surfaceClass: string;
  borderClass: string;
  dotColor: string;
  shortLabel: string;
} {
  switch (status) {
    case 'Critical Stockout':
      return {
        textClass: 'text-[#B43F3F]',
        surfaceClass: 'bg-[#C65353]/12',
        borderClass: 'border-[#C65353]/30',
        dotColor: '#C65353',
        shortLabel: 'Critical',
      };
    case 'Reorder Now':
      return {
        textClass: 'text-[#9A6714]',
        surfaceClass: 'bg-[#E6A23C]/16',
        borderClass: 'border-[#D99A32]/35',
        dotColor: '#D99A32',
        shortLabel: 'Reorder Now',
      };
    case 'Overstock':
      return {
        textClass: 'text-[#3F6280]',
        surfaceClass: 'bg-[#527A9B]/14',
        borderClass: 'border-[#527A9B]/30',
        dotColor: '#527A9B',
        shortLabel: 'Overstock',
      };
    case 'Healthy':
    default:
      return {
        textClass: 'text-[#2C6E49]',
        surfaceClass: 'bg-[#38865B]/12',
        borderClass: 'border-[#38865B]/28',
        dotColor: '#38865B',
        shortLabel: 'Healthy',
      };
  }
}
