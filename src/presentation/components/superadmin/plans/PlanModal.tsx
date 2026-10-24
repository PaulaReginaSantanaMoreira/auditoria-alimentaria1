"use client";

import React, { useState, useEffect } from "react";
import { PlanItem } from "../types";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planToEdit?: PlanItem | null;
  onSave: (planData: Partial<PlanItem>) => Promise<void>;
  isSaving: boolean;
}

export function PlanModal({
  isOpen,
  onClose,
  planToEdit,
  onSave,
  isSaving,
}: PlanModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [maxUserSeats, setMaxUserSeats] = useState(1);
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState("EUR");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name);
      setCode(planToEdit.code);
      setDescription(planToEdit.description || "");
      setDurationDays(planToEdit.durationDays);
      setMaxUserSeats(planToEdit.maxUserSeats);
      setPrice(planToEdit.price);
      setCurrency(planToEdit.currency || "EUR");
      setIsDefault(planToEdit.isDefault);
      setIsActive(planToEdit.isActive);
    } else {
      setName("");
      setCode("");
      setDescription("");
      setDurationDays(30);
      setMaxUserSeats(1);
      setPrice(0);
      setCurrency("EUR");
      setIsDefault(false);
      setIsActive(true);
    }
    setError(null);
  }, [planToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre del plan es obligatorio.");
      return;
    }
    if (!code.trim()) {
      setError("El código de referencia es obligatorio (ej. PRO_30D).");
      return;
    }
    if (durationDays <= 0) {
      setError("La duración en días debe ser mayor a 0.");
      return;
    }
    if (maxUserSeats <= 0) {
      setError("El cupo de usuarios debe ser de al menos 1 inspector.");
      return;
    }
    if (price < 0) {
      setError("El precio no puede ser negativo.");
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase().replace(/\s+/g, "_"),
        description: description.trim(),
        durationDays: Number(durationDays),
        maxUserSeats: Number(maxUserSeats),
        price: Number(price),
        currency,
        isDefault,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar el plan de suscripción.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-border dark:border-slate-800 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-border">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">
              {planToEdit ? "edit_calendar" : "add_box"}
            </span>
            <h2 className="font-title-md text-title-md text-on-surface font-bold">
              {planToEdit ? "Editar Plan de Suscripción" : "Nuevo Plan de Suscripción"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-subtext hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-alert-red-bg/25 border border-alert-red/30 text-alert-red text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-bold text-on-surface uppercase">
                Nombre del Plan *
              </label>
              <input
                type="text"
                placeholder="Ej. Plan Piloto Bonificado"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface uppercase">
                Código de Referencia *
              </label>
              <input
                type="text"
                placeholder="TRIAL_7D"
                value={code}
                disabled={Boolean(planToEdit)}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface uppercase">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="BRL">BRL (R$)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-bold text-on-surface uppercase">
                Descripción / Beneficios
              </label>
              <textarea
                rows={2}
                placeholder="Detalles sobre el alcance, homologaciones o soporte de este plan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface uppercase">
                Duración (Días) *
              </label>
              <input
                type="number"
                min={1}
                max={3650}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface uppercase">
                Cupo de Inspectores *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxUserSeats}
                onChange={(e) => setMaxUserSeats(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-bold text-on-surface uppercase">
                Valor Comercial ({currency}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-slate-border text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
                {price === 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-full">
                    🎁 Gratuito / Bonificado
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-border/80 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-slate-border focus:ring-primary"
              />
              <span>Marcar como Plan Default (Preseleccionado para nuevas empresas)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-slate-border focus:ring-primary"
              />
              <span>Plan Activo (Disponible para contratación)</span>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Guardando..." : planToEdit ? "Actualizar Plan" : "Crear Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
