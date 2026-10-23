"use client";

import React from "react";
import { TenantItem } from "../types";

interface TenantsTableProps {
  tenants: TenantItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenEdit: (tenant: TenantItem) => void;
  onOpenContract: (tenant: TenantItem) => void;
  onOpenRubric: (tenant: TenantItem) => void;
  onOpenUsers: (tenant: TenantItem) => void;
  onToggleStatus: (tenant: TenantItem) => void;
  onDeleteTenant?: (tenant: TenantItem) => void;
}

export function TenantsTable({
  tenants,
  searchTerm,
  setSearchTerm,
  isLoading,
  onRefresh,
  onOpenEdit,
  onOpenContract,
  onOpenRubric,
  onOpenUsers,
  onToggleStatus,
  onDeleteTenant,
}: TenantsTableProps) {
  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.adminEmail && t.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
      <div className="p-space-md border-b border-slate-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined text-slate-subtext text-[20px] absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, CIF o email de administrador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-space-sm py-2 rounded-xl text-body-sm bg-surface border border-slate-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface"
          />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-dark dark:text-slate-200 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
            sync
          </span>
          <span>Actualizar</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-3 text-slate-subtext">
              <span className="material-symbols-outlined text-[36px]">domain_disabled</span>
            </div>
            <h3 className="font-title-md text-title-md text-on-surface font-bold">
              No hay empresas registradas
            </h3>
            <p className="text-body-sm text-slate-subtext mt-1 max-w-sm mx-auto">
              Haz clic en "Nueva Empresa" para dar de alta el primer cliente con su cuota de inspectores y administrador.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container text-xs font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
              <tr>
                <th className="py-3 px-space-md">Empresa / Contacto</th>
                <th className="py-3 px-space-md">Plan &amp; Estado</th>
                <th className="py-3 px-space-md">Estado Contrato</th>
                <th className="py-3 px-space-md">Inspectores Habilitados</th>
                <th className="py-3 px-space-md">Vigencia Subscripción</th>
                <th className="py-3 px-space-md text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-space-md px-space-md">
                    <div className="font-bold text-on-surface text-sm">{t.name}</div>
                    <div className="text-label-sm text-slate-subtext font-mono mt-0.5">CIF: {t.cif}</div>
                    {t.address && (
                      <div className="text-xs text-slate-subtext flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        <span className="truncate max-w-xs">{t.address}</span>
                      </div>
                    )}
                    {(t.adminEmail || t.phone) && (
                      <div className="text-[11px] text-slate-subtext flex items-center gap-2 mt-1">
                        {t.adminEmail && (
                          <span className="flex items-center gap-0.5" title="Administrador de Empresa">
                            <span className="material-symbols-outlined text-[13px] text-primary">mail</span>
                            <span>{t.adminEmail}</span>
                          </span>
                        )}
                        {t.phone && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">phone</span>
                            <span>{t.phone}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Coluna 2: Plan & Estado */}
                  <td className="py-space-md px-space-md">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-label-sm font-bold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                        {t.planTier}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === "ACTIVE"
                            ? "bg-status-pass-bg text-status-pass"
                            : "bg-alert-red-bg/25 text-alert-red"
                        }`}
                      >
                        {t.status === "ACTIVE" ? "Activa" : "Suspendida"}
                      </span>
                    </div>
                  </td>

                  {/* Coluna 3: Estado Contrato (Saúde Financeira) */}
                  <td className="py-space-md px-space-md">
                    {t.isExpired ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-alert-red-bg/25 text-alert-red inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-alert-red" />
                        Vencido
                      </span>
                    ) : t.paymentStatus === "PENDING_PAYMENT" ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Boleto Pendiente
                      </span>
                    ) : t.paymentStatus === "COURTESY" ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Bonificado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Pagado / Al Día
                      </span>
                    )}
                  </td>

                  {/* Coluna 4: Inspectores Habilitados */}
                  <td className="py-space-md px-space-md">
                    <div className="font-bold text-on-surface text-sm">
                      {t.activeUsersCount} <span className="text-slate-subtext font-normal text-xs">/ {t.maxUserSeats}</span>
                    </div>
                    <div className="text-[11px] text-slate-subtext">inspectores activos</div>
                  </td>

                  {/* Coluna 5: Vigencia Subscripción */}
                  <td className="py-space-md px-space-md">
                    <div className="flex items-center gap-1.5 text-body-sm font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-slate-subtext">calendar_today</span>
                      <span>{new Date(t.expiresAt).toLocaleDateString("es-ES")}</span>
                      <span className="text-label-sm text-slate-subtext font-normal">({t.daysRemaining}d)</span>
                    </div>
                  </td>

                  {/* Coluna 6: Acciones (Editar, Contrato, Rúbrica, Inspectores, Suspender/Reactivar) */}
                  <td className="py-space-md px-space-md text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onOpenEdit(t)}
                        className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                        title="Editar datos de la empresa (documento fiscal inmutable)"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenContract(t)}
                        className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                        title="Ver contratos, renovar y salud del cliente"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        <span>Contrato</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenRubric(t)}
                        className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                        title="Personalizar rúbrica para esta empresa"
                      >
                        <span className="material-symbols-outlined text-[16px]">fact_check</span>
                        <span>Rúbrica</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenUsers(t)}
                        className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
                        title="Ver y gestionar inspectores del tenant"
                      >
                        <span className="material-symbols-outlined text-[16px]">group</span>
                        <span>Inspectores</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(t)}
                        className={`h-8 px-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm ${
                          t.status === "ACTIVE"
                            ? "bg-surface-container hover:bg-alert-red-bg/25 hover:text-alert-red text-on-surface"
                            : "bg-status-pass-bg hover:bg-status-pass/20 text-status-pass"
                        }`}
                        title={t.status === "ACTIVE" ? "Suspender acceso a la empresa" : "Reactivar acceso a la empresa"}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {t.status === "ACTIVE" ? "block" : "check_circle"}
                        </span>
                        <span>{t.status === "ACTIVE" ? "Suspender" : "Reactivar"}</span>
                      </button>

                      {onDeleteTenant && (
                        <button
                          type="button"
                          onClick={() => onDeleteTenant(t)}
                          className="h-8 px-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-alert-red-bg/30 text-slate-subtext hover:text-alert-red inline-flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-sm"
                          title="Eliminar empresa definitivamente de la plataforma"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
