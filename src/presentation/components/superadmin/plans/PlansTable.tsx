"use client";

import React from "react";
import { PlanItem } from "../types";
import { ActionMenu, ActionMenuItem } from "@/presentation/components/ui/ActionMenu";

interface PlansTableProps {
  plans: PlanItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (plan: PlanItem) => void;
  onToggleStatus: (plan: PlanItem) => void;
  onSetDefault: (plan: PlanItem) => void;
}

export function PlansTable({
  plans,
  isLoading,
  onRefresh,
  onOpenCreate,
  onOpenEdit,
  onToggleStatus,
  onSetDefault,
}: PlansTableProps) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
      <div className="p-space-md border-b border-slate-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-bold">
            Catálogo de Planes de Suscripción
          </h3>
          <p className="text-xs text-slate-subtext mt-0.5">
            Configure la oferta comercial, vigencias, cupos de inspectores y el plan default de registro.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-dark dark:text-slate-200 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Actualizar listado de planes"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading && plans.length === 0 ? (
          <div className="py-20 text-center text-slate-subtext">
            <span className="material-symbols-outlined text-[36px] animate-spin mb-2">sync</span>
            <p className="text-body-sm">Cargando planes de suscripción...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-3 text-slate-subtext">
              <span className="material-symbols-outlined text-[36px]">loyalty</span>
            </div>
            <h3 className="font-title-md text-title-md text-on-surface font-bold">
              No hay planes configurados
            </h3>
            <p className="text-body-sm text-slate-subtext mt-1 max-w-sm mx-auto">
              Cree un plan inicial para permitir la contratación y registro de nuevas empresas.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs uppercase shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_box</span>
              <span>Crear Primer Plan</span>
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container dark:bg-slate-800/90 text-xs font-bold text-slate-subtext dark:text-slate-300 uppercase tracking-wider border-b border-slate-border dark:border-slate-800">
              <tr>
                <th className="py-3 px-space-md min-w-[240px]">Plan / Código</th>
                <th className="hidden sm:table-cell py-3 px-space-md min-w-[130px]">Vigencia (Días)</th>
                <th className="hidden md:table-cell py-3 px-space-md min-w-[140px]">Cupo Inspectores</th>
                <th className="hidden sm:table-cell py-3 px-space-md min-w-[140px]">Precio Comercial</th>
                <th className="hidden md:table-cell py-3 px-space-md min-w-[110px]">Estado</th>
                <th className="py-3 px-3 sm:px-space-md text-right sticky right-0 bg-surface-container dark:bg-slate-800/95 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_12px_rgba(0,0,0,0.3)] min-w-[70px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
              {plans.map((p) => {
                const isFree = p.price === 0;

                const menuItems: ActionMenuItem[] = [
                  {
                    id: "edit",
                    label: "Editar Plan",
                    icon: "edit",
                    title: "Modificar nombre, precio o cupos",
                    onClick: () => onOpenEdit(p),
                  },
                ];

                if (!p.isDefault) {
                  menuItems.push({
                    id: "set-default",
                    label: "Definir como Plan Default",
                    icon: "star",
                    title: "Marcar este plan como predeterminado en el alta de empresas",
                    onClick: () => onSetDefault(p),
                  });
                }

                menuItems.push({
                  id: "toggle-status",
                  label: p.isActive ? "Inactivar Plan" : "Activar Plan",
                  icon: p.isActive ? "visibility_off" : "check_circle",
                  variant: p.isActive ? "warning" : "success",
                  separator: true,
                  title: p.isActive ? "Ocultar de nuevas contrataciones" : "Habilitar para contratación",
                  onClick: () => onToggleStatus(p),
                });

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <td className="py-space-md px-space-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{p.name}</div>
                        {p.isDefault && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-label-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {p.code}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 max-w-sm line-clamp-1">
                          {p.description}
                        </p>
                      )}

                      {/* Resumo Mobile */}
                      <div className="sm:hidden mt-2 pt-2 border-t border-slate-border/50 dark:border-slate-800 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">calendar_month</span>
                          {p.durationDays}d
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px] text-primary dark:text-emerald-400">group</span>
                          {p.maxUserSeats} insp.
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            p.isActive
                              ? "bg-status-pass-bg text-status-pass"
                              : "bg-surface-container dark:bg-slate-800 text-slate-subtext dark:text-slate-400 border border-slate-border/50 dark:border-slate-700"
                          }`}
                        >
                          {p.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>

                    <td className="hidden sm:table-cell py-space-md px-space-md">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
                        <span>{p.durationDays} días</span>
                      </div>
                    </td>

                    <td className="hidden md:table-cell py-space-md px-space-md">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-primary dark:text-emerald-400">group</span>
                        <span>
                          {p.maxUserSeats} {p.maxUserSeats === 1 ? "inspector" : "inspectores"}
                        </span>
                      </div>
                    </td>

                    <td className="hidden sm:table-cell py-space-md px-space-md">
                      {isFree ? (
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">card_giftcard</span>
                          Bonificado (0,00 €)
                        </span>
                      ) : (
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {new Intl.NumberFormat("es-ES", { style: "currency", currency: p.currency || "EUR" }).format(
                            p.price
                          )}
                        </span>
                      )}
                    </td>

                    <td className="hidden md:table-cell py-space-md px-space-md">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                          p.isActive
                            ? "bg-status-pass-bg text-status-pass"
                            : "bg-surface-container dark:bg-slate-800 text-slate-subtext dark:text-slate-400 border border-slate-border/50 dark:border-slate-700"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? "bg-status-pass" : "bg-slate-400"}`} />
                        {p.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="py-space-md px-3 sm:px-space-md text-right sticky right-0 bg-surface-container-lowest dark:bg-slate-900 group-hover:bg-surface-container-low dark:group-hover:bg-slate-800/90 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_12px_rgba(0,0,0,0.3)] transition-colors">
                      <div className="flex items-center justify-end">
                        <ActionMenu
                          label={`Acciones para plan ${p.name}`}
                          align="right"
                          items={menuItems}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
