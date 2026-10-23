"use client";

import React from "react";
import { TenantItem, EditTenantFormState } from "../types";

interface EditTenantModalProps {
  tenant: TenantItem | null;
  onClose: () => void;
  form: EditTenantFormState;
  setForm: React.Dispatch<React.SetStateAction<EditTenantFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function EditTenantModal({
  tenant,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: EditTenantModalProps) {
  if (!tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Modificar Datos de la Empresa</span>
            </div>
            <h2 className="font-title-md text-title-md text-on-surface font-bold">
              Editar: {tenant.name}
            </h2>
            <p className="text-xs text-slate-subtext">
              Actualice la información corporativa. Por normativa legal, el documento fiscal es inmutable.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            {/* Razón Social */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Razón Social de la Empresa *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
              />
            </div>

            {/* Documento / CIF (INMUTABLE / READONLY) */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-bold text-slate-subtext uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-amber-500">lock</span>
                  <span>Documento Oficial (CIF / NIF) — Inmutable</span>
                </label>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Solo Lectura
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={form.cif}
                  className="w-full h-11 px-space-sm rounded-xl bg-surface-container/60 border border-slate-border text-slate-subtext text-body-md font-mono cursor-not-allowed select-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">
                  lock
                </span>
              </div>
              <p className="text-[11px] text-slate-subtext mt-0.5">
                * El documento fiscal no es modificable para salvaguardar la validez jurídica de las actas de inspección oficial emitidas.
              </p>
            </div>

            {/* Teléfono */}
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Plan Tier */}
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Plan de Subscripción
              </label>
              <select
                value={form.planTier}
                onChange={(e) => setForm({ ...form, planTier: e.target.value })}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="STARTER">STARTER</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>

            {/* Dirección */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Dirección de las Instalaciones / Sede
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Administrador */}
          <div className="p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-emerald-400 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">badge</span>
              <span>Contacto del Administrador Principal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Nombre del Administrador
                </label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Correo del Administrador
                </label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Cupo de Inspectores */}
          <div className="flex flex-col gap-1">
            <label className="text-label-sm font-bold text-on-surface uppercase">
              Inspectores Máximos Habilitados (Cupo) *
            </label>
            <input
              type="number"
              min={Math.max(1, tenant.activeUsersCount)}
              max={500}
              required
              value={form.maxUserSeats}
              onChange={(e) => setForm({ ...form, maxUserSeats: Number(e.target.value) })}
              className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
            />
            <span className="text-[11px] text-slate-subtext mt-0.5">
              Actualmente {tenant.activeUsersCount} inspectores activos registrados.
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
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
