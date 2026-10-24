"use client";

import React, { useState, useCallback, useRef } from "react";

export type ConfirmVariant = "primary" | "success" | "danger" | "warning" | "info";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  // Mapeamento visual por variante
  const variantStyles = {
    primary: {
      icon: icon || "help_outline",
      iconBg: "bg-primary/10 dark:bg-emerald-950/60 text-primary dark:text-emerald-400 border border-primary/20",
      btnConfirm: "bg-primary hover:bg-primary-hover text-white shadow-sm",
    },
    success: {
      icon: icon || "check_circle",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/60 text-status-pass dark:text-emerald-400 border border-emerald-500/20",
      btnConfirm: "bg-status-pass hover:bg-emerald-600 text-white shadow-sm",
    },
    danger: {
      icon: icon || "warning",
      iconBg: "bg-alert-red-bg/30 dark:bg-red-950/60 text-alert-red border border-alert-red/20",
      btnConfirm: "bg-alert-red hover:bg-red-600 text-white shadow-sm",
    },
    warning: {
      icon: icon || "report_problem",
      iconBg: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-500/20",
      btnConfirm: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm",
    },
    info: {
      icon: icon || "info",
      iconBg: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-500/20",
      btnConfirm: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 cursor-default select-none"
      onClick={(e) => {
        // Clicar fora não fecha o modal de confirmação
        e.stopPropagation();
      }}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-border dark:border-slate-800 animate-in zoom-in-95 duration-150 flex flex-col gap-4 text-left select-text"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {variantStyles.icon}
            </span>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug"
            >
              {title}
            </h3>
            <div
              id="confirm-dialog-description"
              className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
            >
              {message}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-border/70 dark:border-slate-800">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-border dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 ${variantStyles.btnConfirm}`}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">
                  sync
                </span>
                <span>Procesando...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook reutilizável para disparar caixas de confirmação assíncronas via Promise
 * Uso:
 * const { confirm, ConfirmDialogComponent } = useConfirm();
 * const ok = await confirm({ title: "...", message: "...", variant: "danger" });
 * if (!ok) return;
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setState(options);
    setIsLoading(false);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setState(null);
    setIsLoading(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setState(null);
    setIsLoading(false);
  }, []);

  const ConfirmDialogComponent = state ? (
    <ConfirmDialog
      isOpen={true}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      icon={state.icon}
      isLoading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmDialogComponent };
}
