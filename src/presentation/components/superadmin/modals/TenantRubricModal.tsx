"use client";

import React, { useState } from "react";
import { ControlPointTemplate } from "@/domain/constants/default-control-points";
import { TenantItem, CATEGORY_OPTIONS } from "../types";
import { useConfirm } from "@/presentation/components/ui/ConfirmDialog";

interface TenantRubricModalProps {
  tenant: TenantItem | null;
  onClose: () => void;
  points: ControlPointTemplate[];
  setPoints: React.Dispatch<React.SetStateAction<ControlPointTemplate[]>>;
  isCustomized: boolean;
  isLoading: boolean;
  onCloneBase: () => Promise<void>;
  onCreateBlank: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function TenantRubricModal({
  tenant,
  onClose,
  points,
  setPoints,
  isCustomized,
  isLoading,
  onCloneBase,
  onCreateBlank,
  onSave,
  isSaving,
}: TenantRubricModalProps) {
  const [filter, setFilter] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPoint, setNewPoint] = useState({
    number: "",
    title: "",
    category: "INFRAESTRUCTURA",
    legalReference: "",
    isCriticalCcp: false,
  });

  const { confirm, ConfirmDialogComponent } = useConfirm();

  if (!tenant) return null;

  const handleToggleActive = (idx: number) => {
    const updated = [...points];
    const current = updated[idx];
    updated[idx] = { ...current, isActive: current.isActive === false ? true : false };
    setPoints(updated);
  };

  const handleDelete = async (idx: number) => {
    const target = points[idx];
    const ok = await confirm({
      title: "¿Eliminar Punto de Control?",
      message: (
        <span>
          ¿Seguro que desea eliminar el punto <strong>{target?.number || `#${idx + 1}`} - {target?.title || "sin título"}</strong> de la rúbrica de esta empresa?
        </span>
      ),
      confirmLabel: "Sí, Eliminar Punto",
      cancelLabel: "Cancelar",
      variant: "danger",
      icon: "delete",
    });
    if (!ok) return;
    const updated = points.filter((_, i) => i !== idx);
    setPoints(updated);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catObj = CATEGORY_OPTIONS.find((c) => c.category === newPoint.category) || CATEGORY_OPTIONS[0];
    const created: ControlPointTemplate = {
      code: `q_${Date.now()}`,
      number: newPoint.number.trim(),
      category: newPoint.category as any,
      categoryLabel: catObj.label,
      legalReference: newPoint.legalReference.trim() || "Reglamento (CE) 852/2004",
      title: newPoint.title.trim(),
      isCriticalCcp: newPoint.isCriticalCcp,
      isActive: true,
    };
    setPoints([...points, created]);
    setNewPoint({
      number: "",
      title: "",
      category: "INFRAESTRUCTURA",
      legalReference: "",
      isCriticalCcp: false,
    });
    setShowAddForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-4xl bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-border dark:border-slate-800 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-border/70 pb-3 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Personalización de Rúbrica • Empresa Específica</span>
            </div>
            <h2 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2 flex-wrap">
              <span>{tenant.name}</span>
              {isCustomized ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                  Rúbrica Exclusiva Customizada ({points.length} Puntos)
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Usa Rúbrica Base Oficial ({points.length} Puntos)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-subtext mt-0.5">
              CIF: <span className="font-mono font-semibold text-on-surface">{tenant.cif}</span> •
              Personalice los puntos de control de este cliente sin alterar la rúbrica base global ni a otras empresas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Banner se o tenant ainda NÃO possui rúbrica customizada */}
        {!isCustomized ? (
          <div className="p-4 my-3 rounded-xl bg-surface border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                <span>Esta empresa está sincronizada con la Rúbrica Base Oficial</span>
              </div>
              <p className="text-xs text-slate-subtext mt-1 max-w-xl">
                Para agregar puntos específicos de la operativa de este cliente, editar textos o quitar puntos que no apliquen, clone la base oficial o inicie una desde cero.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCloneBase}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>Clonar Base para Personalizar</span>
              </button>

              <button
                type="button"
                onClick={onCreateBlank}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">note_add</span>
                <span>Desde Cero</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Toolbar / Filtro / Adicionar Ponto para o Tenant */}
        <div className="py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-border/50">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined text-slate-subtext text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por número, título o categoría..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-surface border border-slate-border text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showAddForm ? "remove" : "add_circle"}
              </span>
              <span>{showAddForm ? "Ocultar Formulario" : "Añadir Punto"}</span>
            </button>

            <button
              type="button"
              onClick={onCloneBase}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-subtext hover:text-primary hover:bg-primary/10 border border-slate-border inline-flex items-center gap-1 cursor-pointer transition-colors"
              title="Restablecer copiando la Rúbrica Base Oficial actual"
            >
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span>Reclonar Base</span>
            </button>
          </div>
        </div>

        {/* Formulário de Adicionar Ponto para o Tenant */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-3.5 my-2 rounded-xl bg-surface border border-primary/30 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-[16px]">add_task</span>
                <span>Añadir Punto Exclusivo para {tenant.name}</span>
              </span>
              <span className="text-[11px] text-slate-subtext">No afectará a otras empresas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">Número *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 1.8 o 6.1"
                  value={newPoint.number}
                  onChange={(e) => setNewPoint({ ...newPoint, number: e.target.value })}
                  className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">Categoría Normativa *</label>
                <select
                  value={newPoint.category}
                  onChange={(e) => setNewPoint({ ...newPoint, category: e.target.value as any })}
                  className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">Referencia Legal</label>
                <input
                  type="text"
                  placeholder="Ej. Manual APPCC Cliente"
                  value={newPoint.legalReference}
                  onChange={(e) => setNewPoint({ ...newPoint, legalReference: e.target.value })}
                  className="h-9 px-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-subtext uppercase">Título / Requisito *</label>
              <textarea
                required
                rows={2}
                placeholder="Descripción del requisito normativo para este cliente..."
                value={newPoint.title}
                onChange={(e) => setNewPoint({ ...newPoint, title: e.target.value })}
                className="p-2.5 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPoint.isCriticalCcp}
                  onChange={(e) => setNewPoint({ ...newPoint, isCriticalCcp: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-alert-red">
                  Es Punto de Control Crítico (Veto Inmediato)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container"
                >
                  Insertar Punto
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Lista de Pontos da Rúbrica do Tenant */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs text-slate-subtext">Cargando rúbrica de la empresa...</span>
            </div>
          ) : (
            points
              .map((point, originalIdx) => ({ point, originalIdx }))
              .filter(({ point }) => {
                if (!filter) return true;
                const q = filter.toLowerCase();
                return (
                  point.number.toLowerCase().includes(q) ||
                  point.title.toLowerCase().includes(q) ||
                  point.categoryLabel.toLowerCase().includes(q) ||
                  point.legalReference.toLowerCase().includes(q)
                );
              })
              .map(({ point, originalIdx }) => (
                <div
                  key={point.code || originalIdx}
                  className={`p-3 rounded-xl border transition-all ${
                    point.isActive === false
                      ? "bg-surface-container/40 border-slate-border/50 opacity-60"
                      : "bg-surface border-slate-border hover:border-slate-border/80 shadow-sm"
                  }`}
                >
                  {editingIndex === originalIdx ? (
                    /* Modo Edição Inline Tenant */
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] font-bold text-slate-subtext uppercase">Número</label>
                          <input
                            type="text"
                            value={point.number}
                            onChange={(e) => {
                              const updated = [...points];
                              updated[originalIdx] = { ...updated[originalIdx], number: e.target.value };
                              setPoints(updated);
                            }}
                            className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs font-bold"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-subtext uppercase">Categoría</label>
                          <select
                            value={point.category}
                            onChange={(e) => {
                              const catObj = CATEGORY_OPTIONS.find((c) => c.category === e.target.value) || CATEGORY_OPTIONS[0];
                              const updated = [...points];
                              updated[originalIdx] = {
                                ...updated[originalIdx],
                                category: e.target.value as any,
                                categoryLabel: catObj.label,
                              };
                              setPoints(updated);
                            }}
                            className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs font-semibold"
                          >
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c.category} value={c.category}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] font-bold text-slate-subtext uppercase">Ref. Legal</label>
                          <input
                            type="text"
                            value={point.legalReference}
                            onChange={(e) => {
                              const updated = [...points];
                              updated[originalIdx] = { ...updated[originalIdx], legalReference: e.target.value };
                              setPoints(updated);
                            }}
                            className="h-8 px-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-bold text-slate-subtext uppercase">Título / Requisito</label>
                        <textarea
                          rows={2}
                          value={point.title}
                          onChange={(e) => {
                            const updated = [...points];
                            updated[originalIdx] = { ...updated[originalIdx], title: e.target.value };
                            setPoints(updated);
                          }}
                          className="p-2 rounded-lg bg-surface-container-lowest border border-slate-border text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={point.isCriticalCcp}
                            onChange={(e) => {
                              const updated = [...points];
                              updated[originalIdx] = { ...updated[originalIdx], isCriticalCcp: e.target.checked };
                              setPoints(updated);
                            }}
                            className="w-4 h-4 rounded text-primary"
                          />
                          <span className="text-[11px] font-bold text-alert-red">
                            Veto Crítico APPCC
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container"
                        >
                          Listo
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Modo Visualização Tenant */
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="font-mono font-black text-xs px-2 py-1 rounded-md bg-surface-container text-on-surface shrink-0 mt-0.5">
                          {point.number}
                        </span>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-on-surface leading-snug">{point.title}</p>
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="text-slate-subtext font-medium">{point.categoryLabel}</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-slate-subtext font-mono">{point.legalReference}</span>
                            {point.isCriticalCcp && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-alert-red-bg/25 text-alert-red">
                                Veto APPCC
                              </span>
                            )}
                            {point.isActive === false ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Oculto
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-pass-bg text-status-pass">
                                Activo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(originalIdx)}
                          className={`h-7 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            point.isActive === false
                              ? "bg-status-pass-bg text-status-pass hover:bg-status-pass/20"
                              : "bg-surface-container text-slate-subtext hover:text-on-surface"
                          }`}
                          title={point.isActive === false ? "Activar punto para esta empresa" : "Ocultar punto"}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {point.isActive === false ? "visibility" : "visibility_off"}
                          </span>
                          <span>{point.isActive === false ? "Activar" : "Ocultar"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingIndex(originalIdx)}
                          className="h-7 px-2 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary text-on-surface inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Modificar texto o clasificación del punto"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(originalIdx)}
                          className="h-7 w-7 rounded-lg text-slate-subtext hover:bg-alert-red-bg/25 hover:text-alert-red flex items-center justify-center cursor-pointer transition-colors"
                          title="Eliminar este punto de la rúbrica de esta empresa"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-border/60 mt-2">
          <span className="text-[11px] text-slate-subtext">
            * Guardar registrará la rúbrica personalizada exclusivamente para <strong>{tenant.name}</strong>.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isSaving ? "Guardando..." : "Guardar Rúbrica de la Empresa"}</span>
            </button>
          </div>
        </div>
      </div>
      {ConfirmDialogComponent}
    </div>
  );
}
