"use client";

import React from "react";
import { TenantItem } from "../types";
import { ActionMenu, ActionMenuItem } from "@/presentation/components/ui/ActionMenu";

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
      (t.adminEmail && t.adminEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.adminName && t.adminName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.phone && t.phone.includes(searchTerm))
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
            placeholder="Buscar por nombre, CIF, administrador, email o teléfono..."
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
            <thead className="bg-surface-container dark:bg-slate-800/90 text-xs font-bold text-slate-subtext dark:text-slate-300 uppercase tracking-wider border-b border-slate-border dark:border-slate-800">
              <tr>
                <th className="py-3 px-space-md min-w-[280px]">Empresa / Contacto</th>
                <th className="hidden sm:table-cell py-3 px-space-md min-w-[130px]">Plan &amp; Estado</th>
                <th className="hidden md:table-cell py-3 px-space-md min-w-[140px]">Estado Contrato</th>
                <th className="hidden lg:table-cell py-3 px-space-md min-w-[130px]">Inspectores Habilitados</th>
                <th className="hidden sm:table-cell py-3 px-space-md min-w-[150px]">Vigencia Subscripción</th>
                <th className="py-3 px-3 sm:px-space-md text-right sticky right-0 bg-surface-container dark:bg-slate-800/95 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_12px_rgba(0,0,0,0.3)] min-w-[70px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border/60 dark:divide-slate-800/60 font-body-sm">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors group">
                  {/* Coluna 1: Empresa & Contacto */}
                  <td className="py-space-md px-space-md">
                    <div className="flex items-start gap-3">
                      {/* Avatar / Monograma com Badge de Status */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 dark:from-primary/25 dark:to-primary/10 text-primary dark:text-emerald-400 flex items-center justify-center font-bold text-sm border border-primary/20 shadow-xs">
                          {t.name ? t.name.slice(0, 2).toUpperCase() : "EM"}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface dark:border-slate-900 ${
                            t.status === "ACTIVE" ? "bg-status-pass" : "bg-alert-red"
                          }`}
                          title={t.status === "ACTIVE" ? "Empresa Activa" : "Empresa Suspendida"}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Linha 1: Nome da Empresa e Badge CIF */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[220px]" title={t.name}>
                            {t.name}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-surface-container dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-border/80 dark:border-slate-700 shrink-0">
                            CIF: {t.cif}
                          </span>
                        </div>

                        {/* Linha 2: Endereço com ícone de localização */}
                        {t.address && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5" title={t.address}>
                            <span className="material-symbols-outlined text-[14px] text-slate-400 shrink-0">
                              location_on
                            </span>
                            <span className="truncate max-w-[260px]">{t.address}</span>
                          </div>
                        )}

                        {/* Linha 3: Contato & Administrador com links rápidos (um abaixo do outro) */}
                        {(t.adminName || t.adminEmail || t.phone) && (
                          <div className="pt-1 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                            {t.adminName && (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                                <span className="material-symbols-outlined text-[15px] text-slate-400 shrink-0">
                                  person
                                </span>
                                <span className="truncate">{t.adminName}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal shrink-0">(Admin)</span>
                              </div>
                            )}

                            {t.adminEmail && (
                              <a
                                href={`mailto:${t.adminEmail}`}
                                className="inline-flex items-center gap-1.5 hover:text-primary dark:hover:text-emerald-400 transition-colors whitespace-nowrap group/link w-fit"
                                title={`Enviar email para ${t.adminEmail}`}
                              >
                                <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover/link:text-primary dark:group-hover/link:text-emerald-400 transition-colors shrink-0">
                                  mail
                                </span>
                                <span className="group-hover/link:underline">{t.adminEmail}</span>
                              </a>
                            )}

                            {t.phone && (
                              <a
                                href={`tel:${t.phone}`}
                                className="inline-flex items-center gap-1.5 hover:text-primary dark:hover:text-emerald-400 transition-colors whitespace-nowrap group/link w-fit"
                                title={`Llamar a ${t.phone}`}
                              >
                                <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover/link:text-primary dark:group-hover/link:text-emerald-400 transition-colors shrink-0">
                                  phone
                                </span>
                                <span className="group-hover/link:underline font-mono">{t.phone}</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Linha 4 (Mobile Compact Badges - visível apenas em telas pequenas) */}
                        <div className="sm:hidden pt-2 mt-1.5 border-t border-slate-border/50 dark:border-slate-800/80 flex flex-wrap gap-1.5 items-center">
                          {t.planName || t.planCode ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-container dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-border/70 dark:border-slate-700">
                              {t.planName || t.planCode}
                            </span>
                          ) : null}

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === "ACTIVE"
                                ? "bg-status-pass-bg text-status-pass"
                                : "bg-alert-red-bg/25 text-alert-red"
                            }`}
                          >
                            {t.status === "ACTIVE" ? "Activa" : "Suspendida"}
                          </span>

                          {t.isExpired ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-alert-red-bg/25 text-alert-red">
                              Vencido
                            </span>
                          ) : t.paymentStatus === "PENDING_PAYMENT" ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                              Boleto Pendiente
                            </span>
                          ) : t.paymentStatus === "COURTESY" ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                              Bonificado
                            </span>
                          ) : t.paymentStatus === "PAID" ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                              Pagado
                            </span>
                          ) : null}

                          <span className="text-[10px] text-slate-600 dark:text-slate-300 inline-flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px] text-slate-400">group</span>
                            {t.activeUsersCount}/{t.maxUserSeats != null ? t.maxUserSeats : "—"}
                          </span>

                          {t.expiresAt && (
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 inline-flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px] text-slate-400">calendar_today</span>
                              {new Date(t.expiresAt).toLocaleDateString("es-ES")}
                              {t.daysRemaining != null && ` (${t.daysRemaining}d)`}
                            </span>
                          )}
                        </div>

                        {/* Em telas sm a lg, detalhe resumido de inspectores */}
                        <div className="hidden sm:flex lg:hidden pt-1 items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">group</span>
                            Inspectores: <strong className="text-slate-700 dark:text-slate-200">{t.activeUsersCount}/{t.maxUserSeats != null ? t.maxUserSeats : "—"}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Coluna 2: Plan & Estado (visível a partir de sm) */}
                  <td className="hidden sm:table-cell py-space-md px-space-md">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {t.planName || t.planCode || t.planTier ? (
                        <span className="text-label-sm font-bold px-2 py-0.5 rounded-md bg-surface-container dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-border/70 dark:border-slate-700">
                          {t.planName || t.planCode || t.planTier}
                        </span>
                      ) : (
                        <span className="text-label-sm font-semibold text-slate-subtext dark:text-slate-400">—</span>
                      )}
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

                  {/* Coluna 3: Estado Contrato (visível a partir de md) */}
                  <td className="hidden md:table-cell py-space-md px-space-md">
                    {!t.paymentStatus && !t.expiresAt ? (
                      <span className="text-slate-subtext dark:text-slate-400 text-xs">—</span>
                    ) : t.isExpired ? (
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
                    ) : t.paymentStatus === "PAID" ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Pagado / Al Día
                      </span>
                    ) : (
                      <span className="text-slate-subtext dark:text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Coluna 4: Inspectores Habilitados (visível a partir de lg) */}
                  <td className="hidden lg:table-cell py-space-md px-space-md">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {t.activeUsersCount}{" "}
                      <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">
                        / {t.maxUserSeats != null ? t.maxUserSeats : "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">inspectores activos</div>
                  </td>

                  {/* Coluna 5: Vigencia Subscripción (visível a partir de sm) */}
                  <td className="hidden sm:table-cell py-space-md px-space-md">
                    {t.expiresAt ? (
                      <div className="flex items-center gap-1.5 text-body-sm font-semibold text-slate-900 dark:text-slate-100">
                        <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">calendar_today</span>
                        <span>{new Date(t.expiresAt).toLocaleDateString("es-ES")}</span>
                        {t.daysRemaining != null && (
                          <span className="text-label-sm text-slate-500 dark:text-slate-400 font-normal">({t.daysRemaining}d)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-subtext dark:text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Coluna 6: Acciones (Menu 3 Pontinhos Sticky Right) */}
                  <td className="py-space-md px-3 sm:px-space-md text-right sticky right-0 bg-surface-container-lowest dark:bg-slate-900 group-hover:bg-surface-container-low dark:group-hover:bg-slate-800/90 z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_12px_rgba(0,0,0,0.3)] transition-colors">
                    <div className="flex items-center justify-end">
                      <ActionMenu
                        label={`Acciones para ${t.name}`}
                        align="right"
                        items={[
                          {
                            id: "edit",
                            label: "Editar Empresa",
                            icon: "edit",
                            title: "Editar datos de la empresa",
                            onClick: () => onOpenEdit(t),
                          },
                          {
                            id: "contract",
                            label: "Contrato & Licencia",
                            icon: "receipt_long",
                            title: "Ver contratos, renovar y salud del cliente",
                            onClick: () => onOpenContract(t),
                          },
                          {
                            id: "rubric",
                            label: "Personalizar Rúbrica",
                            icon: "fact_check",
                            title: "Personalizar rúbrica para esta empresa",
                            onClick: () => onOpenRubric(t),
                          },
                          {
                            id: "users",
                            label: "Gestionar Inspectores",
                            icon: "group",
                            title: "Ver y gestionar inspectores del tenant",
                            onClick: () => onOpenUsers(t),
                          },
                          {
                            id: "toggle-status",
                            label: t.status === "ACTIVE" ? "Suspender Empresa" : "Reactivar Empresa",
                            icon: t.status === "ACTIVE" ? "block" : "check_circle",
                            variant: t.status === "ACTIVE" ? "warning" : "success",
                            title: t.status === "ACTIVE" ? "Suspender acceso a la empresa" : "Reactivar acceso a la empresa",
                            onClick: () => onToggleStatus(t),
                          },
                          ...(onDeleteTenant
                            ? [
                                {
                                  id: "delete",
                                  label: "Eliminar Empresa",
                                  icon: "delete",
                                  variant: "danger" as const,
                                  separator: true,
                                  title: "Eliminar empresa definitivamente de la plataforma",
                                  onClick: () => onDeleteTenant(t),
                                },
                              ]
                            : []),
                        ]}
                      />
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
