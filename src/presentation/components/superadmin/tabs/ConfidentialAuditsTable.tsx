"use client";

import React from "react";
import Link from "next/link";
import { AdminAuditItem } from "../types";

interface ConfidentialAuditsTableProps {
  audits: AdminAuditItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ConfidentialAuditsTable({
  audits,
  isLoading,
  onRefresh,
}: ConfidentialAuditsTableProps) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-slate-border shadow-sm overflow-hidden animate-in fade-in duration-150">
      <div className="p-space-md border-b border-slate-border flex items-center justify-between">
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-bold">
            Mis Inspecciones Sanitarias Oficiales
          </h3>
          <p className="text-xs text-slate-subtext mt-0.5">
            Visibilidad confidencial protegida exclusivamente para su perfil de SuperAdministrador.
          </p>
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
        {audits.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-3 text-slate-subtext">
              <span className="material-symbols-outlined text-[36px]">assignment_turned_in</span>
            </div>
            <h3 className="font-title-md text-title-md text-on-surface font-bold">
              No hay inspecciones privadas registradas
            </h3>
            <p className="text-body-sm text-slate-subtext mt-1 max-w-sm mx-auto">
              Las auditorías realizadas desde su perfil oficial se guardan con escopo confidencial y aparecerán listadas aquí.
            </p>
            <Link
              href="/auditorias/nova"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs uppercase"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Iniciar Nueva Inspección</span>
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container text-xs font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
              <tr>
                <th className="py-3 px-space-md">Empresa Inspeccionada</th>
                <th className="py-3 px-space-md">Fecha de Inspección</th>
                <th className="py-3 px-space-md">Puntuación / Veredicto</th>
                <th className="py-3 px-space-md">Estado</th>
                <th className="py-3 px-space-md text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-border/60 text-on-surface font-body-sm">
              {audits.map((a) => (
                <tr key={a.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-space-md px-space-md">
                    <div className="font-bold text-on-surface">{a.companyName}</div>
                    <div className="text-label-sm text-slate-subtext font-mono">CIF: {a.companyCif}</div>
                  </td>

                  <td className="py-space-md px-space-md">
                    <div className="text-body-sm">
                      {new Date(a.inspectionDate).toLocaleDateString("es-ES")}
                    </div>
                  </td>

                  <td className="py-space-md px-space-md">
                    {a.complianceScore !== undefined && a.complianceScore !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">{a.complianceScore}%</span>
                        {a.verdict && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              a.verdict === "FAVORABLE"
                                ? "bg-status-pass-bg text-status-pass"
                                : "bg-alert-red-bg/25 text-alert-red"
                            }`}
                          >
                            {a.verdict}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-subtext text-xs">En evaluación</span>
                    )}
                  </td>

                  <td className="py-space-md px-space-md">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                      {a.status === "FINALIZED" ? "Finalizada" : "En Curso"}
                    </span>
                  </td>

                  <td className="py-space-md px-space-md text-right">
                    <div className="flex items-center justify-end gap-2">
                      {a.status === "FINALIZED" ? (
                        <Link
                          href={`/auditorias/${a.id}/relatorio?company=${encodeURIComponent(
                            a.companyName
                          )}&cif=${encodeURIComponent(a.companyCif)}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Ver Laudo
                        </Link>
                      ) : (
                        <Link
                          href={`/auditorias/${a.id}/rubrica?company=${encodeURIComponent(
                            a.companyName
                          )}&cif=${encodeURIComponent(a.companyCif)}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                        >
                          Continuar Rúbrica
                        </Link>
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
