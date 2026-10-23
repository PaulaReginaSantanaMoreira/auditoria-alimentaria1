"use client";

import React, { useState } from "react";
import { NewTenantFormState } from "../types";
import { Cif } from "@/domain/value-objects/cif";

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: NewTenantFormState;
  setForm: React.Dispatch<React.SetStateAction<NewTenantFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function CreateTenantModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: CreateTenantModalProps) {
  const [clientError, setClientError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sanitizedCif = (form.cif || "").trim().toUpperCase().replace(/[\s-]/g, "");
  const isCifValid = sanitizedCif.length > 0 ? Cif.isValid(sanitizedCif) : null;

  const handleCifChange = (val: string) => {
    setClientError(null);
    setForm({ ...form, cif: val.toUpperCase().trim() });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    // 1. Razón Social
    if (!form.name || form.name.trim().length < 3) {
      setClientError("La razón social de la empresa es obligatoria y debe tener al menos 3 caracteres.");
      return;
    }

    // 2. CIF / NIF Oficial
    if (!Cif.isValid(sanitizedCif)) {
      setClientError(
        "El documento fiscal (CIF / NIF / NIE) no tiene un formato válido oficial en España (ej. B84920194, 12345678Z, X1234567Z)."
      );
      return;
    }

    // 3. Teléfono de Contacto
    if (form.phone && form.phone.trim()) {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{5,15}$/;
      if (!phoneRegex.test(form.phone.trim())) {
        setClientError(
          "El formato del teléfono contiene caracteres no permitidos. Use solo números, espacios o prefijo internacional (ej. +34 912 345 678)."
        );
        return;
      }
    }

    // 4. Administrador Inicial
    if (form.adminEmail && form.adminEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.adminEmail.trim())) {
        setClientError("El correo electrónico del administrador no es válido.");
        return;
      }
      if (!form.adminName || !form.adminName.trim()) {
        setClientError("Debe indicar el nombre del administrador de empresa si asigna su correo.");
        return;
      }
    }

    // 5. Vigencia
    if (!form.subscriptionDays || form.subscriptionDays < 1 || form.subscriptionDays > 3650) {
      setClientError("La vigencia inicial debe ser de entre 1 y 3650 días.");
      return;
    }

    // 6. Cupo
    if (!form.maxUserSeats || form.maxUserSeats < 1 || form.maxUserSeats > 200) {
      setClientError("El cupo de inspectores debe ser entre 1 y 200 puestos.");
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
            <p className="text-xs text-slate-subtext">
              Registre la empresa cliente, valide su CIF oficial y configure su contrato inicial.
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

        {clientError && (
          <div className="p-3 mb-3 rounded-xl bg-alert-red-bg/25 border border-alert-red text-alert-red text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <div className="flex-1">{clientError}</div>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            {/* Razón Social */}
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
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
              />
            </div>

            {/* CIF / NIF Oficial com Validação em Tempo Real */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  CIF / NIF Oficial *
                </label>
                {isCifValid === true && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    Válido
                  </span>
                )}
                {isCifValid === false && (
                  <span className="text-[10px] font-bold text-alert-red bg-alert-red-bg/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    Formato inválido
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={9}
                placeholder="Ej. B84920194"
                value={form.cif}
                onChange={(e) => handleCifChange(e.target.value)}
                className={`w-full h-11 px-space-sm rounded-xl bg-surface border text-on-surface text-body-md focus:outline-none focus:ring-2 font-mono uppercase tracking-wider ${
                  isCifValid === false
                    ? "border-alert-red focus:ring-alert-red/20 focus:border-alert-red"
                    : isCifValid === true
                    ? "border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500"
                    : "border-slate-border focus:ring-primary/20 focus:border-primary"
                }`}
              />
              <span className="text-[10px] text-slate-subtext">
                * 9 caracteres: CIF (B84920194), NIF (12345678Z) o NIE (X1234567Z)
              </span>
            </div>

            {/* Teléfono de Contacto */}
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

          {/* Bloco Administrador Inicial */}
          <div className="p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-emerald-400 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Administrador Principal de la Empresa (Tenant Admin)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Nombre del Administrador
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
                  Correo Corporativo (Login)
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
            </div>
            <p className="text-[11px] text-slate-subtext">
              * Se creará una cuenta de acceso segura con perfil <strong className="text-on-surface">TENANT_ADMIN</strong> y contraseña temporal autogenerada.
            </p>
          </div>

          {/* Cotas e Subscrição com Atalhos Rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Inspectores Máximos (Cupo) *
              </label>
              <input
                type="number"
                min={1}
                max={200}
                required
                value={form.maxUserSeats}
                onChange={(e) => setForm({ ...form, maxUserSeats: Number(e.target.value) })}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-bold text-on-surface uppercase">
                  Vigencia Inicial (Días) *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, subscriptionDays: 30 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      form.subscriptionDays === 30
                        ? "bg-primary text-white"
                        : "bg-surface-container text-slate-subtext hover:text-on-surface"
                    }`}
                  >
                    30d
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, subscriptionDays: 90 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      form.subscriptionDays === 90
                        ? "bg-primary text-white"
                        : "bg-surface-container text-slate-subtext hover:text-on-surface"
                    }`}
                  >
                    90d
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, subscriptionDays: 365 })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      form.subscriptionDays === 365
                        ? "bg-primary text-white"
                        : "bg-surface-container text-slate-subtext hover:text-on-surface"
                    }`}
                  >
                    365d
                  </button>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={3650}
                required
                value={form.subscriptionDays}
                onChange={(e) => setForm({ ...form, subscriptionDays: Number(e.target.value) })}
                className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
              />
            </div>
          </div>

          {/* Condição Comercial Inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Estado Financiero Inicial *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentStatus: "COURTESY" })}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    form.paymentStatus === "COURTESY"
                      ? "bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20"
                      : "bg-surface-container-lowest border-slate-border text-slate-subtext hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">card_giftcard</span>
                  <span>🎁 Bonificado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentStatus: "PAID" })}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    form.paymentStatus === "PAID"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-surface-container-lowest border-slate-border text-slate-subtext hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>🟢 Pagado / Al Día</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentStatus: "PENDING_PAYMENT" })}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    form.paymentStatus === "PENDING_PAYMENT"
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                      : "bg-surface-container-lowest border-slate-border text-slate-subtext hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                  <span>🟡 Pendiente</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Ref. Boleto o Factura
              </label>
              <input
                type="text"
                placeholder="Ej. BOL-2026-0912 o BONIF-PILOTO-01"
                value={form.invoiceRef}
                onChange={(e) => setForm({ ...form, invoiceRef: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-label-sm font-bold text-on-surface uppercase">
                Notas Comerciales / Observaciones
              </label>
              <input
                type="text"
                placeholder="Ej. Piloto inicial bonificado por 30 días para homologación sanitaria."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-space-sm border-t border-slate-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              <span>{isSubmitting ? "Registrando..." : "Registrar Empresa"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
