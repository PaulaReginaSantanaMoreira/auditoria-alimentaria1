"use client";

import React, { useState, useEffect } from "react";
import { TenantItem, NewTenantFormState, EditTenantFormState, PlanItem } from "../types";
import { Cif } from "@/domain/value-objects/cif";
import { FormValidatorService } from "@/domain/services/form-validator.service";

export interface TenantModalProps {
  mode: "create" | "edit";
  isOpen?: boolean; // For create mode
  tenant?: TenantItem | null; // For edit mode (or null when closed)
  onClose: () => void;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  plans?: PlanItem[];
}

export function TenantModal({
  mode,
  isOpen = true,
  tenant,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
  plans: propPlans,
}: TenantModalProps) {
  const [clientError, setClientError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [availablePlans, setAvailablePlans] = useState<PlanItem[]>(propPlans || []);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // No modo edit, abre se tenant != null. No modo create, abre se isOpen === true
  const isVisible = mode === "edit" ? !!tenant : isOpen;

  // Carregar planos se não forem passados via props (modo create)
  useEffect(() => {
    if (mode !== "create") return;
    if (propPlans && propPlans.length > 0) {
      setAvailablePlans(propPlans);
      return;
    }

    if (isVisible) {
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
  }, [isVisible, propPlans, mode]);

  // Pré-selecionar o plano default quando os planos forem carregados (modo create)
  useEffect(() => {
    if (mode === "create" && isVisible && availablePlans.length > 0 && !form.planId) {
      const defaultPlan = availablePlans.find((p) => p.isDefault) || availablePlans[0];
      if (defaultPlan) {
        setForm((prev: any) => ({
          ...prev,
          planId: defaultPlan.id,
          planName: defaultPlan.name,
          planCode: defaultPlan.code,
          planTier: defaultPlan.name,
          subscriptionDays: defaultPlan.durationDays,
          maxUserSeats: defaultPlan.maxUserSeats,
          paymentStatus: defaultPlan.price === 0 ? "COURTESY" : prev.paymentStatus || "PAID",
        }));
      }
    }
  }, [mode, isVisible, availablePlans, form.planId, setForm]);

  // Limpa erros ao fechar/abrir
  useEffect(() => {
    if (isVisible) {
      setClientError(null);
      setFieldErrors({});
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const isCreate = mode === "create";
  const sanitizedCif = (form.cif || "").trim().toUpperCase().replace(/[\s-]/g, "");
  const isCifValid = sanitizedCif.length > 0 ? Cif.isValid(sanitizedCif) : null;
  const selectedPlan = availablePlans.find((p) => p.id === form.planId);

  const handleCifChange = (val: string) => {
    setClientError(null);
    setFieldErrors((prev) => ({ ...prev, cif: "" }));
    setForm({ ...form, cif: val.toUpperCase().trim() });
  };

  const handleSelectPlan = (plan: PlanItem) => {
    setClientError(null);
    setForm({
      ...form,
      planId: plan.id,
      planName: plan.name,
      planCode: plan.code,
      planTier: plan.name,
      subscriptionDays: plan.durationDays,
      maxUserSeats: plan.maxUserSeats,
      paymentStatus: plan.price === 0 ? "COURTESY" : form.paymentStatus === "COURTESY" ? "PAID" : form.paymentStatus || "PAID",
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    const errors: Record<string, string> = {};

    // 1. Razón Social
    const nameVal = FormValidatorService.validateRequiredText(form.name, "La razón social de la empresa", 3);
    if (!nameVal.isValid) {
      errors.name = nameVal.error || "Razón social obligatoria.";
    }

    // 2. CIF / NIF Oficial (Apenas no modo create, pois no edit é readonly)
    if (isCreate) {
      const cifVal = FormValidatorService.validateCif(form.cif, true);
      if (!cifVal.isValid) {
        errors.cif = cifVal.error || "CIF / NIF no válido.";
      }
    }

    // 3. Teléfono de Contacto
    if (form.phone && form.phone.trim()) {
      const phoneVal = FormValidatorService.validatePhone(form.phone, false);
      if (!phoneVal.isValid) {
        errors.phone = phoneVal.error || "Teléfono no válido.";
      }
    }

    // 4. Administrador Inicial (Apenas no modo create se fornecido)
    if (isCreate && form.adminEmail && form.adminEmail.trim()) {
      const emailVal = FormValidatorService.validateEmail(form.adminEmail, true);
      if (!emailVal.isValid) {
        errors.adminEmail = emailVal.error || "Correo electrónico no válido.";
      }
      const adminNameVal = FormValidatorService.validateRequiredText(form.adminName, "El nombre del administrador de empresa", 2);
      if (!adminNameVal.isValid) {
        errors.adminName = adminNameVal.error || "Nombre del administrador obligatorio.";
      }
      if (form.adminPhone && form.adminPhone.trim()) {
        const adminPhoneVal = FormValidatorService.validatePhone(form.adminPhone, false);
        if (!adminPhoneVal.isValid) {
          errors.adminPhone = adminPhoneVal.error || "Teléfono del administrador no válido.";
        }
      }
      if (form.adminDocumentNumber && form.adminDocumentNumber.trim()) {
        const docVal = FormValidatorService.validatePersonalDocument(form.adminDocumentNumber, false);
        if (!docVal.isValid) {
          errors.adminDocumentNumber = docVal.error || "Documento del administrador no válido.";
        }
      }
    }

    // 5. No modo edit, se houver adminEmail
    if (!isCreate && form.adminEmail && form.adminEmail.trim()) {
      const emailVal = FormValidatorService.validateEmail(form.adminEmail, false);
      if (!emailVal.isValid) {
        errors.adminEmail = emailVal.error || "Correo corporativo no válido.";
      }
    }

    // 6. Plano Selecionado (Apenas modo create)
    if (isCreate && !form.planId && availablePlans.length > 0) {
      errors.planId = "Por favor seleccione un plan de suscripción para la empresa.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setClientError(firstError);
      return;
    }

    // Validação aprovada, submeter sem interferência do browser
    onSubmit(e);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-xl bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-lg shadow-xl border border-slate-border dark:border-slate-800 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Unificado */}
        <div className="flex items-center justify-between mb-space-sm border-b border-slate-border/70 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">
                {isCreate ? "domain_add" : "edit_note"}
              </span>
              <span>{isCreate ? "Alta de Empresa" : "Gobernanza Corporativa"}</span>
            </div>
            <h2 className="font-title-md text-title-md text-on-surface font-bold">
              {isCreate ? "Dar de Alta Nueva Empresa (Tenant)" : `Editar: ${tenant?.name || form.name}`}
            </h2>
            <p className="text-body-sm text-slate-subtext">
              {isCreate
                ? "Registre la empresa cliente, valide su CIF oficial y vincule su plan inicial."
                : "Actualice la información corporativa. Por normativa legal, el documento fiscal es inmutable."}
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

        {/* Mensagem de Erro de Validação Local Desacoplada do HTML */}
        {clientError && (
          <div className="mb-4 p-3 rounded-xl bg-alert-red-bg/25 border border-alert-red/30 text-alert-red text-xs flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-semibold">{clientError}</span>
          </div>
        )}

        {/* Formulário com noValidate para suprimir tooltip do navegador */}
        <form noValidate onSubmit={handleFormSubmit} className="space-y-space-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            {/* Razón Social */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase flex items-center justify-between">
                <span>Razón Social de la Empresa *</span>
                {fieldErrors.name && (
                  <span className="text-[11px] text-alert-red font-semibold lowercase tracking-normal">
                    {fieldErrors.name}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, name: "" }));
                  setForm({ ...form, name: e.target.value });
                }}
                placeholder="Ej. Embutidos y Quesos Ibéricos S.L."
                className={`w-full h-11 px-space-sm rounded-xl bg-surface border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold ${
                  fieldErrors.name ? "border-alert-red ring-1 ring-alert-red/30" : "border-slate-border"
                }`}
              />
            </div>

            {/* CIF / NIF Oficial (Editable em Create, Readonly em Edit) */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-bold uppercase flex items-center gap-1 text-on-surface">
                  {!isCreate && (
                    <span className="material-symbols-outlined text-[15px] text-amber-500">lock</span>
                  )}
                  <span>{isCreate ? "CIF / NIF Oficial *" : "Documento Oficial (CIF / NIF) — Inmutable"}</span>
                </label>

                {isCreate ? (
                  isCifValid === true ? (
                    <span className="text-label-sm font-semibold text-status-pass flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      Válido
                    </span>
                  ) : isCifValid === false ? (
                    <span className="text-label-sm font-semibold text-alert-red flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                      No válido
                    </span>
                  ) : null
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Solo Lectura
                  </span>
                )}
              </div>

              {isCreate ? (
                <input
                  type="text"
                  value={form.cif}
                  onChange={(e) => handleCifChange(e.target.value)}
                  placeholder="Ej. B84920194, 12345678Z, X1234567Z"
                  className={`w-full h-11 px-space-sm rounded-xl bg-surface border text-on-surface text-body-md font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                    fieldErrors.cif ? "border-alert-red ring-1 ring-alert-red/30" : "border-slate-border"
                  }`}
                />
              ) : (
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
              )}

              <p className="text-[11px] text-slate-subtext mt-0.5">
                {isCreate
                  ? "* 9 caracteres: CIF (B84920194), NIF (12345678Z) o NIE (X1234567Z)"
                  : "* El documento fiscal no es modificable para salvaguardar la validez jurídica de las actas de inspección oficial emitidas."}
              </p>
            </div>

            {/* Teléfono de Contacto */}
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-bold text-on-surface uppercase flex items-center justify-between">
                <span>Teléfono de Contacto</span>
                {fieldErrors.phone && (
                  <span className="text-[10px] text-alert-red font-semibold lowercase tracking-normal">
                    {fieldErrors.phone}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, phone: "" }));
                  setForm({ ...form, phone: e.target.value });
                }}
                placeholder="Ej. +34 912 345 678"
                className={`w-full h-11 px-space-sm rounded-xl bg-surface border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  fieldErrors.phone ? "border-alert-red ring-1 ring-alert-red/30" : "border-slate-border"
                }`}
              />
            </div>

            {/* Cupo de Inspectores (No modo Edit) */}
            {!isCreate && (
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Cupo de Inspectores Activos
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.maxUserSeats}
                  onChange={(e) => setForm({ ...form, maxUserSeats: Number(e.target.value) || 1 })}
                  className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                />
              </div>
            )}

            {/* Dirección */}
            <div className={`flex flex-col gap-1 ${isCreate ? "sm:col-span-2" : "sm:col-span-2"}`}>
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Dirección de las Instalaciones / Sede
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ej. Polígono Industrial Las Mercedes, Nave 4, Madrid"
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* SEÇÃO: ADMINISTRADOR PRINCIPAL (Apenas no Modo Create) */}
          {isCreate && (
            <div className="p-space-sm rounded-xl bg-surface-container-low border border-slate-border/80 space-y-space-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Administrador Principal de la Empresa (Tenant Admin)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-on-surface uppercase flex items-center justify-between">
                    <span>Nombre del Administrador *</span>
                    {fieldErrors.adminName && (
                      <span className="text-[10px] text-alert-red font-semibold lowercase tracking-normal">
                        {fieldErrors.adminName}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.adminName}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, adminName: "" }));
                      setForm({ ...form, adminName: e.target.value });
                    }}
                    placeholder="Ej. Carlos Mendoza García"
                    className={`w-full h-10 px-space-sm rounded-lg bg-surface border text-on-surface text-body-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                      fieldErrors.adminName ? "border-alert-red" : "border-slate-border"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-on-surface uppercase flex items-center justify-between">
                    <span>Correo Corporativo (Login) *</span>
                    {fieldErrors.adminEmail && (
                      <span className="text-[10px] text-alert-red font-semibold lowercase tracking-normal">
                        {fieldErrors.adminEmail}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.adminEmail}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, adminEmail: "" }));
                      setForm({ ...form, adminEmail: e.target.value });
                    }}
                    placeholder="Ej. carlos.mendoza@empresa.com"
                    className={`w-full h-10 px-space-sm rounded-lg bg-surface border text-on-surface text-body-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                      fieldErrors.adminEmail ? "border-alert-red" : "border-slate-border"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-on-surface uppercase">
                    DNI / NIE / NIF del Administrador
                  </label>
                  <input
                    type="text"
                    value={form.adminDocumentNumber || ""}
                    onChange={(e) => setForm({ ...form, adminDocumentNumber: e.target.value.toUpperCase() })}
                    placeholder="Ej. 12345678Z"
                    className="w-full h-10 px-space-sm rounded-lg bg-surface border border-slate-border text-on-surface text-body-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-on-surface uppercase">
                    Teléfono Móvil
                  </label>
                  <input
                    type="text"
                    value={form.adminPhone || ""}
                    onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                    placeholder="Ej. +34 600 123 456"
                    className="w-full h-10 px-space-sm rounded-lg bg-surface border border-slate-border text-on-surface text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-subtext pt-1">
                * Se creará una cuenta con perfil <strong>TENANT_ADMIN</strong>, acceso a todas las auditorías de su empresa y contraseña temporal autogenerada.
              </p>
            </div>
          )}

          {/* SEÇÃO: PLAN DE SUSCRIPCIÓN INICIAL (Apenas no Modo Create) */}
          {isCreate && (
            <div className="p-space-sm rounded-xl bg-surface-container-low border border-slate-border/80 space-y-space-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">loyalty</span>
                  <span>Plan de Suscripción Inicial *</span>
                </div>
                <span className="text-[11px] text-slate-subtext">
                  {availablePlans.length} planes disponibles
                </span>
              </div>

              {isLoadingPlans ? (
                <div className="py-4 text-center text-xs text-slate-subtext">Cargando catálogo de planes...</div>
              ) : availablePlans.length === 0 ? (
                <div className="py-2 text-xs text-slate-subtext">No hay planes activos configurados.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {availablePlans.map((plan) => {
                    const isSelected = form.planId === plan.id;
                    const isZero = Number(plan.price) === 0;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 dark:bg-emerald-950/40 shadow-sm ring-1 ring-primary"
                            : "border-slate-border/80 bg-surface hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-on-surface truncate" title={plan.name}>
                            {plan.name}
                          </span>
                          {plan.isDefault && (
                            <span className="text-[9px] font-bold text-status-pass bg-status-pass-bg px-1.5 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-subtext mt-0.5">
                          {plan.durationDays} días • {plan.maxUserSeats} {plan.maxUserSeats === 1 ? "usuario" : "usuarios"}
                        </div>

                        <div className="mt-1 flex items-baseline justify-between">
                          <span className={`text-xs font-extrabold ${isZero ? "text-primary" : "text-on-surface"}`}>
                            {isZero ? (
                              <span className="inline-flex items-center gap-1">
                                <span>🎁 Bonificado (0,00 €)</span>
                              </span>
                            ) : (
                              `${Number(plan.price).toFixed(2)} €`
                            )}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[15px]">check_circle</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedPlan && (
                <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-border/50 text-slate-subtext">
                  <span>
                    Plan: <strong className="text-on-surface">{selectedPlan.name}</strong> ({selectedPlan.durationDays} días / {selectedPlan.maxUserSeats} puestos)
                  </span>
                  <span className="font-bold text-primary">
                    {Number(selectedPlan.price) === 0 ? "Sin costo inicial" : `${Number(selectedPlan.price).toFixed(2)} €`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação do Rodapé */}
          <div className="flex items-center justify-end gap-space-xs pt-space-xs border-t border-slate-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-space-md py-2.5 rounded-xl border border-slate-border text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-label-md text-label-md font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>{isCreate ? "Registrando..." : "Guardando..."}</span>
                </>
              ) : (
                <span>{isCreate ? "Registrar Empresa" : "Guardar Cambios"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Aliases para compatibilidade total de código existente
export function CreateTenantModal(props: Omit<TenantModalProps, "mode">) {
  return <TenantModal mode="create" {...props} />;
}

export function EditTenantModal(props: Omit<TenantModalProps, "mode">) {
  return <TenantModal mode="edit" {...props} />;
}
