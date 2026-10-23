"use client";

import React, { useState } from "react";
import { TenantItem, ContractHistoryItem, RenewContractFormState } from "../types";

interface ContractModalProps {
  tenant: TenantItem | null;
  onClose: () => void;
  contracts: ContractHistoryItem[];
  isLoadingContracts: boolean;
  onRenewContract: (form: {
    durationOption: "365" | "180" | "90" | "30" | "custom";
    customDate: string;
    newSeats: number;
    paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
    amount: number;
    invoiceRef: string;
    notes: string;
  }) => Promise<void>;
  isRenewing: boolean;
}

export function ContractModal({
  tenant,
  onClose,
  contracts,
  isLoadingContracts,
  onRenewContract,
  isRenewing,
}: ContractModalProps) {
  const [renewalForm, setRenewalForm] = useState<{
    durationOption: "365" | "180" | "90" | "30" | "custom";
    customDate: string;
    newSeats: number;
    paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
    amount: number;
    invoiceRef: string;
    notes: string;
  }>({
    durationOption: "365",
    customDate: "",
    newSeats: tenant?.maxUserSeats || 5,
    paymentStatus: "PAID",
    amount: 0,
    invoiceRef: "",
    notes: "",
  });

  if (!tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRenewContract(renewalForm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-surface-container-lowest rounded-2xl p-space-lg shadow-2xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-start justify-between border-b border-slate-border/70 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Salud Financiera &amp; Gestión de Contrato</span>
            </div>
            <h2 className="font-title-md text-title-md text-on-surface font-bold">
              {tenant.name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-subtext flex-wrap">
              <span>CIF: <strong className="font-mono text-on-surface">{tenant.cif}</strong></span>
              <span>•</span>
              <span>
                Vencimiento Actual: <strong className="text-on-surface">{new Date(tenant.expiresAt).toLocaleDateString("es-ES")}</strong> ({tenant.daysRemaining} días)
              </span>
              <span>•</span>
              <span>Estado: </span>
              {tenant.isExpired ? (
                <span className="font-bold text-alert-red bg-alert-red-bg/25 px-2 py-0.5 rounded-full">Vencido</span>
              ) : tenant.paymentStatus === "PENDING_PAYMENT" ? (
                <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full">Boleto Pendiente</span>
              ) : tenant.paymentStatus === "COURTESY" ? (
                <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 px-2 py-0.5 rounded-full">Bonificado</span>
              ) : (
                <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">Pagado / Al Día</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pt-3 pr-1">
          {/* Formulário de Renovação / Alteração de Vigência */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-surface border border-slate-border space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-border/50 pb-2">
              <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">update</span>
                <span>Renovar Contrato / Alterar Vigencia</span>
              </span>
              <span className="text-[11px] text-slate-subtext">
                Extiende la fecha a partir del vencimiento actual o reactiva el plan si ya está vencido.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Periodo de Extensión *
                </label>
                <select
                  value={renewalForm.durationOption}
                  onChange={(e) =>
                    setRenewalForm({
                      ...renewalForm,
                      durationOption: e.target.value as any,
                    })
                  }
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                >
                  <option value="365">Renovación Anual (+365 días / 1 año)</option>
                  <option value="180">Renovación Semestral (+180 días / 6 meses)</option>
                  <option value="90">Renovación Trimestral (+90 días / 3 meses)</option>
                  <option value="30">Extensión Mensual (+30 días / 1 mes)</option>
                  <option value="custom">Fecha Específica Personalizada...</option>
                </select>
              </div>

              {renewalForm.durationOption === "custom" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface uppercase">
                    Nueva Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={renewalForm.customDate}
                    onChange={(e) => setRenewalForm({ ...renewalForm, customDate: e.target.value })}
                    className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface uppercase">
                    Cupo de Inspectores *
                  </label>
                  <input
                    type="number"
                    min={Math.max(1, tenant.activeUsersCount)}
                    max={500}
                    required
                    value={renewalForm.newSeats}
                    onChange={(e) => setRenewalForm({ ...renewalForm, newSeats: Number(e.target.value) })}
                    className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Estado Financiero *
                </label>
                <select
                  value={renewalForm.paymentStatus}
                  onChange={(e) =>
                    setRenewalForm({
                      ...renewalForm,
                      paymentStatus: e.target.value as "PAID" | "COURTESY" | "PENDING_PAYMENT",
                    })
                  }
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                >
                  <option value="PAID">🟢 Pagado / Factura Liquidada</option>
                  <option value="COURTESY">🎁 Bonificado (Cortesía)</option>
                  <option value="PENDING_PAYMENT">🟡 Boleto / Factura Pendiente</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Ref. Boleto o Factura
                </label>
                <input
                  type="text"
                  placeholder="Ej. BOL-2026-1049"
                  value={renewalForm.invoiceRef}
                  onChange={(e) => setRenewalForm({ ...renewalForm, invoiceRef: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Importe / Valor (€ o R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={renewalForm.amount}
                  onChange={(e) => setRenewalForm({ ...renewalForm, amount: Number(e.target.value) })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-on-surface uppercase">
                Notas Comerciales / Justificativa
              </label>
              <input
                type="text"
                placeholder="Ej. Renovación anual acordada con descuento comercial y pago vía boleto 30 días."
                value={renewalForm.notes}
                onChange={(e) => setRenewalForm({ ...renewalForm, notes: e.target.value })}
                className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={isRenewing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>{isRenewing ? "Registrando Renovación..." : "Confirmar Renovación de Contrato"}</span>
              </button>
            </div>
          </form>

          {/* Histórico de Contratos e Saúde do Cliente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface uppercase">
                <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                <span>Historial de Contratos &amp; Eventos Financieros</span>
              </div>
              <span className="text-[11px] text-slate-subtext">
                Auditoría permanente de cambios de vigencia y pagos
              </span>
            </div>

            {isLoadingContracts ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-slate-subtext">Cargando contratos históricos...</span>
              </div>
            ) : contracts.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface border border-slate-border text-center text-xs text-slate-subtext">
                No hay registros históricos de contratos aún. Los eventos de renovación quedarán registrados aquí para auditoría comercial.
              </div>
            ) : (
              <div className="border border-slate-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                    <tr>
                      <th className="py-2 px-3">Fecha &amp; Acción</th>
                      <th className="py-2 px-3">Vigencia / Días</th>
                      <th className="py-2 px-3">Cupo</th>
                      <th className="py-2 px-3">Estado Financiero</th>
                      <th className="py-2 px-3">Factura / Ref</th>
                      <th className="py-2 px-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border/50 text-on-surface">
                    {contracts.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-on-surface">
                            {new Date(c.createdAt).toLocaleDateString("es-ES")}
                          </div>
                          <div className="text-[10px] text-slate-subtext font-semibold">
                            {c.actionType === "CREATION"
                              ? "Alta Inicial"
                              : c.actionType === "RENEWAL"
                              ? "Renovación"
                              : c.actionType === "SEATS_CHANGE"
                              ? "Ajuste Cupo"
                              : "Extensión"}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div>Hasta {new Date(c.expiresAt).toLocaleDateString("es-ES")}</div>
                          <div className="text-[10px] text-slate-subtext font-mono">+{c.daysAdded} días</div>
                        </td>

                        <td className="py-2.5 px-3 font-bold">
                          {c.seats} inspectores
                        </td>

                        <td className="py-2.5 px-3">
                          {c.paymentStatus === "PENDING_PAYMENT" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                              Boleto Pendiente
                            </span>
                          ) : c.paymentStatus === "COURTESY" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                              Bonificado
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                              Pagado
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {c.invoiceRef || "—"}
                          {c.amount ? <div className="text-slate-subtext text-[10px]">{c.amount} €</div> : null}
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-slate-subtext max-w-xs truncate" title={c.notes || ""}>
                          {c.notes || "—"}
                          {c.createdBy && (
                            <div className="text-[9px] text-slate-400">Por: {c.createdBy}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border/60 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
