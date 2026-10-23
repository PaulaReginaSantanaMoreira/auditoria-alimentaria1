"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ActionMenu, ActionMenuItem } from "@/presentation/components/ui/ActionMenu";

export interface AuditListItem {
  id: string;
  companyName: string;
  companyCif: string;
  inspectionDate: string;
  normativeFramework?: string;
  complianceScore?: number;
  verdict?: "FAVORABLE" | "DESFAVORABLE" | string;
  status: "DRAFT" | "IN_PROGRESS" | "EVALUATED" | "SIGNED" | "FINALIZED" | "INVALIDATED" | string;
  accessScope?: "TENANT" | "CONFIDENTIAL" | "PRIVATE" | string;
  auditorName?: string;
}

interface AuditsTableProps {
  audits: AuditListItem[];
  isLoading: boolean;
  onRefresh: () => void;
  canInvalidate?: boolean;
  onInvalidateAudit?: (audit: AuditListItem) => void;
}

export function AuditsTable({
  audits,
  isLoading,
  onRefresh,
  canInvalidate = false,
  onInvalidateAudit,
}: AuditsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      // Filtro de Status
      if (statusFilter !== "ALL" && audit.status !== statusFilter) {
        return false;
      }

      // Busca por texto
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchCompany = audit.companyName?.toLowerCase().includes(term);
      const matchCif = audit.companyCif?.toLowerCase().includes(term);
      const matchNormative = audit.normativeFramework?.toLowerCase().includes(term);
      const matchAuditor = audit.auditorName?.toLowerCase().includes(term);

      return Boolean(matchCompany || matchCif || matchNormative || matchAuditor);
    });
  }, [audits, statusFilter, searchTerm]);

  const handleCopyLink = (auditId: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/auditorias/${auditId}/relatorio`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(auditId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
      {/* Header com Busca & Filtros Rápidos */}
      <div className="p-space-md border-b border-slate-border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-subtext text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por empresa, CIF, auditor ou norma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container/60 dark:bg-slate-800/80 border border-slate-border/80 text-xs text-on-surface placeholder:text-slate-subtext focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-subtext hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Todas" },
              { id: "FINALIZED", label: "Finalizadas" },
              { id: "IN_PROGRESS", label: "En Curso" },
              { id: "INVALIDATED", label: "Anuladas" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {copiedId && (
            <span className="text-[11px] font-semibold text-status-pass bg-status-pass-bg px-2.5 py-1 rounded-lg animate-in fade-in">
              ¡Enlace copiado!
            </span>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-dark dark:text-slate-200 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Actualizar listado de inspecciones"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tabela de Auditorias */}
      <div className="overflow-x-auto">
        {isLoading && audits.length === 0 ? (
          <div className="py-20 text-center text-slate-subtext">
            <span className="material-symbols-outlined text-[36px] animate-spin mb-2">sync</span>
            <p className="text-body-sm">Cargando inspecciones sanitarias...</p>
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-3 text-slate-subtext">
              <span className="material-symbols-outlined text-[36px]">assignment_turned_in</span>
            </div>
            <h3 className="font-title-md text-title-md text-on-surface font-bold">
              No se encontraron inspecciones
            </h3>
            <p className="text-body-sm text-slate-subtext mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "ALL"
                ? "Ninguna inspección coincide con los filtros aplicados. Intente limpiar la búsqueda."
                : "No hay auditorías registradas en este momento. Puede iniciar una nueva inspección."}
            </p>
            <Link
              href="/auditorias/nova"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs uppercase shadow-sm hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Iniciar Nueva Inspección</span>
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container text-xs font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
              <tr>
                <th className="py-3 px-space-md">Empresa / Entidad</th>
                <th className="py-3 px-space-md">Fecha Inspección</th>
                <th className="py-3 px-space-md">Normativa</th>
                <th className="py-3 px-space-md">Puntuación / Veredicto</th>
                <th className="py-3 px-space-md">Estado</th>
                <th className="py-3 px-space-md text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
              {filteredAudits.map((a) => {
                const isFinalized = a.status === "FINALIZED" || a.status === "SIGNED";
                const isInvalidated = a.status === "INVALIDATED";
                const isFavorable = a.verdict === "FAVORABLE";

                const menuItems: ActionMenuItem[] = [
                  {
                    id: "view-report",
                    label: "Ver Laudo Oficial",
                    icon: "description",
                    title: "Visualizar informe técnico e imprimir",
                    onClick: () => {
                      window.location.href = `/auditorias/${a.id}/relatorio`;
                    },
                  },
                ];

                if (!isFinalized && !isInvalidated) {
                  menuItems.push({
                    id: "continue-rubric",
                    label: "Continuar Rúbrica",
                    icon: "edit_note",
                    title: "Evaluar puntos de control en campo",
                    onClick: () => {
                      window.location.href = `/auditorias/${a.id}/rubrica`;
                    },
                  });
                }

                menuItems.push({
                  id: "copy-link",
                  label: "Copiar Enlace al Laudo",
                  icon: "link",
                  title: "Copiar enlace permanente del laudo",
                  onClick: () => handleCopyLink(a.id),
                });

                if (canInvalidate && !isInvalidated && onInvalidateAudit) {
                  menuItems.push({
                    id: "invalidate",
                    label: "Anular Inspección",
                    icon: "cancel",
                    variant: "danger",
                    separator: true,
                    title: "Anular oficialmente esta auditoría",
                    onClick: () => onInvalidateAudit(a),
                  });
                }

                return (
                  <tr
                    key={a.id}
                    className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {/* Empresa / Entidade */}
                    <td className="py-space-md px-space-md">
                      <div className="font-bold text-on-surface text-sm">{a.companyName}</div>
                      <div className="text-label-sm text-slate-subtext font-mono mt-0.5">
                        CIF: {a.companyCif}
                      </div>
                      {a.accessScope === "CONFIDENTIAL" && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          Confidencial Oficial
                        </span>
                      )}
                    </td>

                    {/* Data de Inspeção */}
                    <td className="py-space-md px-space-md">
                      <div className="text-body-sm font-medium">
                        {new Date(a.inspectionDate).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    {/* Marco Normativo */}
                    <td className="py-space-md px-space-md">
                      <span className="text-label-sm px-2 py-1 rounded-md bg-surface-container font-mono text-on-surface-variant font-semibold">
                        {a.normativeFramework || "CE 852/2004"}
                      </span>
                    </td>

                    {/* Puntuación / Veredicto */}
                    <td className="py-space-md px-space-md">
                      {a.complianceScore !== undefined && a.complianceScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">{a.complianceScore}%</span>
                          {a.verdict && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isFavorable
                                  ? "bg-status-pass-bg text-status-pass"
                                  : "bg-alert-red-bg/25 text-alert-red"
                              }`}
                            >
                              {a.verdict}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-subtext text-xs italic">Pendiente de evaluación</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-space-md px-space-md">
                      {isInvalidated ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-alert-red-bg/25 text-alert-red inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">cancel</span>
                          Anulada
                        </span>
                      ) : isFinalized ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-status-pass-bg text-status-pass inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">verified</span>
                          Finalizada
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          En Progreso
                        </span>
                      )}
                    </td>

                    {/* Acciones (ActionMenu 3 Pontinhos) */}
                    <td className="py-space-md px-space-md text-right">
                      <div className="flex items-center justify-end">
                        <ActionMenu
                          label={`Acciones para inspección de ${a.companyName}`}
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
