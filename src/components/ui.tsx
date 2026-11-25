import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { StockStatus } from '../shared/types.ts';
import { getStatusStyle } from '../utils/format.ts';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const sizeCls = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-xs';
  const variantCls =
    variant === 'primary'
      ? 'bg-[#145A43] text-white border border-[#145A43] hover:bg-[#104735] hover:border-[#104735] shadow-2xs'
      : variant === 'danger'
        ? 'bg-[#C65353] text-white border border-[#C65353] hover:bg-[#B24444] shadow-2xs'
        : variant === 'ghost'
          ? 'bg-transparent text-[#145A43] border border-transparent hover:bg-[#EEEAE0]'
          : 'bg-[#FFFEFA] text-[#292F2C] border border-[#D2CCB9] hover:bg-[#EEEAE0] hover:border-[#BEB7A2]';

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-45 ${sizeCls} ${variantCls} ${className}`}
    >
      {children}
    </button>
  );
};

export const StatusBadge: React.FC<{ status: StockStatus; compact?: boolean }> = ({
  status,
  compact = false,
}) => {
  const st = getStatusStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      } ${st.surfaceClass} ${st.borderClass} ${st.textClass}`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: st.dotColor }}
        aria-hidden="true"
      />
      <span>{st.shortLabel}</span>
    </span>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#104735]/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#E2DDD1] bg-[#FFFEFA] p-5 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              tone === 'danger' ? 'bg-[#C65353]/12 text-[#C65353]' : 'bg-[#145A43]/12 text-[#145A43]'
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-sm font-semibold text-[#292F2C]">
              {title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#6B746E]">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-[#EEEAE0] pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export interface ToastItem {
  id: string;
  title: string;
  tone?: 'success' | 'warning' | 'info' | 'danger';
}

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const tone = t.tone ?? 'success';
          const Icon =
            tone === 'danger' || tone === 'warning'
              ? AlertTriangle
              : tone === 'info'
                ? Info
                : CheckCircle2;
          const iconColor =
            tone === 'danger'
              ? 'text-[#C65353]'
              : tone === 'warning'
                ? 'text-[#D99A32]'
                : tone === 'info'
                  ? 'text-[#527A9B]'
                  : 'text-[#38865B]';

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg border border-[#E2DDD1] bg-[#FFFEFA] px-3.5 py-2.5 text-xs text-[#292F2C] shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                <span className="font-medium">{t.title}</span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded p-1 text-[#929A94] hover:bg-[#EEEAE0] hover:text-[#292F2C]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
