"use client";

import React, { useState, useEffect } from "react";
import { NewTenantFormState, PlanItem } from "../types";
import { Cif } from "@/domain/value-objects/cif";
import { FormValidatorService } from "@/domain/services/form-validator.service";

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: NewTenantFormState;
  setForm: React.Dispatch<React.SetStateAction<NewTenantFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  plans?: PlanItem[];
}

export function CreateTenantModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
  plans: propPlans,
}: CreateTenantModalProps) {
  const [clientError, setClientError] = useState<string | null>(null);
  const [availablePlans, setAvailablePlans] = useState<PlanItem[]>(propPlans || []);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Carregar planos se não forem passados via props
  useEffect(() => {
    if (propPlans && propPlans.length > 0) {
      setAvailablePlans(propPlans);
      return;
    }

    if (isOpen) {
      setIsLoadingPlans(true);
      fetch("/api/superadmin/plans?onlyActive=true")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.plans) {
            setAvailablePlans(json.plans);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingPlans(false));
    }
  }, [isOpen, propPlans]);

  // Pré-selecionar o plano default quando os planos forem carregados
  useEffect(() => {
    if (isOpen && availablePlans.length > 0 && !form.planId) {
      const defaultPlan = availablePlans.find((p) => p.isDefault) || availablePlans[0];
      if (defaultPlan) {
        setForm((prev) => ({
          ...prev,
          planId: defaultPlan.id,
          planTier: defaultPlan.code,
          subscriptionDays: defaultPlan.durationDays,
          maxUserSeats: defaultPlan.maxUserSeats,
          paymentStatus: defaultPlan.price === 0 ? "COURTESY" : prev.paymentStatus || "PAID",
        }));
      }
    }
  }, [isOpen, availablePlans, form.planId, setForm]);

  if (!isOpen) return null;

  const sanitizedCif = (form.cif || "").trim().toUpperCase().replace(/[\s-]/g, "");
  const isCifValid = sanitizedCif.length > 0 ? Cif.isValid(sanitizedCif) : null;

  const selectedPlan = availablePlans.find((p) => p.id === form.planId);

  const handleCifChange = (val: string) => {
    setClientError(null);
    setForm({ ...form, cif: val.toUpperCase().trim() });
  };

  const handleSelectPlan = (plan: PlanItem) => {
    setClientError(null);
    setForm({
      ...form,
      planId: plan.id,
      planTier: plan.code,
      subscriptionDays: plan.durationDays,
      maxUserSeats: plan.maxUserSeats,
      paymentStatus: plan.price === 0 ? "COURTESY" : form.paymentStatus === "COURTESY" ? "PAID" : form.paymentStatus || "PAID",
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    // 1. Razón Social
    const nameVal = FormValidatorService.validateRequiredText(form.name, "La razón social de la empresa", 3);
    if (!nameVal.isValid) {
      setClientError(nameVal.error || "Razón social obligatoria.");
      return;
    }

    // 2. CIF / NIF Oficial
    const cifVal = FormValidatorService.validateCif(form.cif, true);
    if (!cifVal.isValid) {
      setClientError(cifVal.error || "CIF / NIF no válido.");
      return;
    }

    // 3. Teléfono de Contacto
    if (form.phone && form.phone.trim()) {
      const phoneVal = FormValidatorService.validatePhone(form.phone, false);
      if (!phoneVal.isValid) {
        setClientError(phoneVal.error || "Teléfono no válido.");
        return;
      }
    }

    // 4. Administrador Inicial
    if (form.adminEmail && form.adminEmail.trim()) {
      const emailVal = FormValidatorService.validateEmail(form.adminEmail, true);
      if (!emailVal.isValid) {
        setClientError(emailVal.error || "Correo electrónico no válido.");
        return;
      }
      const adminNameVal = FormValidatorService.validateRequiredText(form.adminName, "El nombre del administrador de empresa", 2);
      if (!adminNameVal.isValid) {
        setClientError(adminNameVal.error || "Nombre del administrador obligatorio.");
        return;
      }
    }

    // 5. Plano Selecionado
    if (!form.planId && availablePlans.length > 0) {
      setClientError("Por favor seleccione un plan de suscripción para la empresa.");
      return;
    }

    // Validação aprovada, encaminhar para o handler
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 pb-3">
          <div>
            <h2 className="font-title-md text-title-md text-on-surface font-bold">
              Dar de Alta Nueva Empresa (Tenant)
            </h2>
            <p className="text-body-sm text-slate-subtext">
              Registre la empresa cliente, valide su CIF oficial y vincule su plan inicial.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-subtext hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Mensagem de Erro de Validação Local */}
        {clientError && (
          <div className="mb-4 p-3 rounded-xl bg-alert-red-bg/25 border border-alert-red/30 text-alert-red text-xs flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{clientError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-space-md">
          {/* Informações da Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            {/* Razão Social */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Razón Social de la Empresa *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Calidad Alimentaria Ibérica S.L."
                value={form.name}
                onChange={(e) => {
                  setClientError(null);
                  setForm({ ...form, name: e.target.value });
                }}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* CIF / NIF com Feedback Visual Instantâneo */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  CIF / NIF Oficial *
                </label>
                {isCifValid !== null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCifValid
                        ? "bg-status-pass-bg text-status-pass"
                        : "bg-alert-red-bg/25 text-alert-red"
                    }`}
                  >
                    {isCifValid ? "✓ Válido" : "✗ Inválido"}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej. B84920194"
                  maxLength={12}
                  value={form.cif}
                  onChange={(e) => handleCifChange(e.target.value)}
                  className={`w-full h-11 px-space-sm rounded-xl bg-surface border text-on-surface text-body-md font-mono uppercase tracking-wider focus:outline-none focus:ring-2 ${
                    isCifValid === false
                      ? "border-alert-red focus:ring-alert-red/30"
                      : isCifValid === true
                      ? "border-status-pass focus:ring-status-pass/30"
                      : "border-slate-border focus:ring-primary/20 focus:border-primary"
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-subtext">
                * 9 caracteres: CIF (B84920194), NIF (12345678Z) o NIE (X1234567Z)
              </p>
            </div>

            {/* Telefone de Contacto da Empresa */}
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                placeholder="Ej. +34 912 345 678"
                value={form.phone}
                onChange={(e) => {
                  setClientError(null);
                  setForm({ ...form, phone: e.target.value });
                }}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Dirección */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Dirección de las Instalaciones / Sede
              </label>
              <input
                type="text"
                placeholder="Ej. Polígono Industrial Las Nieves, Nave 4, Madrid"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Bloco Administrador Inicial com Dados Complementares */}
          <div className="p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-emerald-400 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Administrador Principal de la Empresa (Tenant Admin)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Nombre del Administrador *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Dra. Carmen Rodríguez"
                  value={form.adminName}
                  onChange={(e) => {
                    setClientError(null);
                    setForm({ ...form, adminName: e.target.value });
                  }}
                  className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Correo Corporativo (Login) *
                </label>
                <input
                  type="email"
                  placeholder="admin@empresa.com"
                  value={form.adminEmail}
                  onChange={(e) => {
                    setClientError(null);
                    setForm({ ...form, adminEmail: e.target.value });
                  }}
                  className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>

              {/* DNI / NIE do Administrador */}
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  DNI / NIE / NIF del Administrador
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12345678Z o Y1234567A"
                  value={form.adminDocumentNumber || ""}
                  onChange={(e) =>
                    setForm({ ...form, adminDocumentNumber: e.target.value.toUpperCase() })
                  }
                  className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Telefone Direto do Administrador */}
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Teléfono / Móvil del Administrador
                </label>
                <input
                  type="tel"
                  placeholder="Ej. +34 612 345 678"
                  value={form.adminPhone || ""}
                  onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                  className="w-full h-10 px-space-sm rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-subtext">
              * Se creará una cuenta con perfil <strong className="text-on-surface">TENANT_ADMIN</strong>, acceso a todas las auditorías de su empresa y contraseña temporal autogenerada.
            </p>
          </div>

          {/* Vínculo a Plano de Suscripción */}
          <div className="p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-emerald-400 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">loyalty</span>
                <span>Plan de Suscripción Inicial *</span>
              </div>
              <span className="text-[10px] text-slate-subtext">
                {isLoadingPlans ? "Cargando planes..." : `${availablePlans.length} planes disponibles`}
              </span>
            </div>

            {/* Grade de Seleção de Planos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availablePlans.map((plan) => {
                const isSelected = form.planId === plan.id;
                const isFree = plan.price === 0;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-primary bg-primary/10 dark:bg-emerald-950/40 ring-2 ring-primary/30"
                        : "border-slate-border bg-surface-container-lowest hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-on-surface truncate">
                          {plan.name}
                        </span>
                        {plan.isDefault && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-subtext mt-1">
                        {plan.durationDays} días • {plan.maxUserSeats} {plan.maxUserSeats === 1 ? "usuario" : "usuarios"}
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-black text-on-surface">
                      {isFree ? "🎁 Bonificado (0,00 €)" : `${plan.price.toFixed(2)} €`}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPlan && (
              <div className="p-2.5 rounded-lg bg-surface-container-lowest text-[11px] text-slate-subtext flex items-center justify-between border border-slate-border/60">
                <span>
                  Plan: <strong className="text-on-surface">{selectedPlan.name}</strong> ({selectedPlan.durationDays} días / {selectedPlan.maxUserSeats} puestos)
                </span>
                <span className="font-bold text-on-surface">
                  {selectedPlan.price === 0 ? "Sin costo inicial" : `${selectedPlan.price.toFixed(2)} €`}
                </span>
              </div>
            )}

            {/* Condição de Pagamento se o plano for pago */}
            {selectedPlan && selectedPlan.price > 0 && (
              <div className="flex flex-col gap-1 pt-1 border-t border-slate-border/60">
                <label className="text-[11px] font-bold text-on-surface uppercase">
                  Estado Financiero del Contrato Inicial *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentStatus: "PAID" })}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      form.paymentStatus === "PAID"
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-surface-container-lowest border-slate-border text-slate-subtext"
                    }`}
                  >
                    <span>🟢 Pagado / Al Día</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentStatus: "PENDING_PAYMENT" })}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      form.paymentStatus === "PENDING_PAYMENT"
                        ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300"
                        : "bg-surface-container-lowest border-slate-border text-slate-subtext"
                    }`}
                  >
                    <span>🟡 Boleto Pendiente</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-slate-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 px-space-md rounded-xl text-body-md font-semibold text-slate-subtext hover:bg-surface transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-space-md rounded-xl bg-primary hover:bg-primary-hover text-white text-body-md font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
              )}
              <span>{isSubmitting ? "Registrando..." : "Registrar Empresa"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
