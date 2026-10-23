"use client";

import React from "react";
import { TenantItem } from "../types";

interface QuickSeatsModalProps {
  tenant: TenantItem | null;
  onClose: () => void;
  seatsValue: number;
  setSeatsValue: (value: number) => void;
  onSave: () => void;
}

export function QuickSeatsModal({
  tenant,
  onClose,
  seatsValue,
  setSeatsValue,
  onSave,
}: QuickSeatsModalProps) {
  if (!tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150">
        <h2 className="font-title-md text-title-md text-on-surface font-bold mb-1">
          Ajustar Cupo de Inspectores
        </h2>
        <p className="text-body-sm text-slate-subtext mb-space-sm">
          Empresa: <strong>{tenant.name}</strong>
        </p>

        <div className="space-y-space-sm">
          <div>
            <label className="text-label-sm font-bold text-on-surface uppercase block mb-1">
              Número Máximo de Inspectores Activos
            </label>
            <input
              type="number"
              min={Math.max(1, tenant.activeUsersCount)}
              max={500}
              value={seatsValue}
              onChange={(e) => setSeatsValue(Number(e.target.value))}
              className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="text-label-sm text-slate-subtext mt-1 block">
              Actualmente {tenant.activeUsersCount} inspectores registrados.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer"
            >
              Guardar Cupo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
