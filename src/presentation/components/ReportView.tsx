"use client";

import React, { useState, useEffect } from "react";
import { Audit } from "@/domain/entities/audit";
import { AuditComplianceReport } from "@/domain/services/compliance-calculator.service";

interface ReportViewProps {
  audit: Audit;
  report: AuditComplianceReport;
}

export function ReportView({ audit, report }: ReportViewProps) {
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    // Listener de segurança para garantir modo claro durante Ctrl+P / Cmd+P
    const handleBeforePrint = () => {
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-was-dark", "true");
      }
    };

    const handleAfterPrint = () => {
      if (document.documentElement.getAttribute("data-was-dark") === "true") {
        document.documentElement.classList.add("dark");
        document.documentElement.removeAttribute("data-was-dark");
      }
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const handlePrint = () => {
    // 1. Desativa temporariamente o dark mode para que a engine de impressão calcule 100% em modo claro
    const wasDark = document.documentElement.classList.contains("dark");
    if (wasDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-was-dark", "true");
    }

    // Pequeno atraso para re-renderização síncrona do layout antes de invocar o diálogo nativo
    setTimeout(() => {
      window.print();

      // Restaura o dark mode após a conclusão ou fechamento da caixa de diálogo
      setTimeout(() => {
        if (document.documentElement.getAttribute("data-was-dark") === "true") {
          document.documentElement.classList.add("dark");
          document.documentElement.removeAttribute("data-was-dark");
        }
      }, 500);
    }, 50);
  };

  const handleShare = async () => {
    try {
      // O link compartilhado é SEMPRE forçado com parâmetro ?theme=light para garantir visualização oficial limpa
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set("theme", "light");

      const companyName = audit.company?.name || "Empresa";
      const verdict = report?.verdict || "Dictamen Oficial";
      const score = report?.globalPercentage !== undefined ? `${report.globalPercentage}%` : "";

      const shareData = {
        title: `Acta Oficial de Inspección - ${companyName}`,
        text: `Acta Oficial de Inspección Higiénico-Sanitaria (BioAudit Pro) para ${companyName}. Dictamen: ${verdict} (${score} de cumplimiento).`,
        url: shareUrl.toString(),
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }

      // Fallback para área de transferência caso Web Share não seja suportado
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl.toString());
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3500);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return; // Usuário cancelou o share nativo
      console.warn("Share fallback warning:", err);
    }
  };

  // Ordenar los 30 puntos normativos para garantizar secuencia correlativa (1.1 a 3.10)
  const sortedEvaluations = [...audit.evaluations].sort((a, b) => {
    const parseCode = (c: string) => {
      const parts = c.replace(/^q/, "").split("_");
      return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
    };
    const [secA, itemA] = parseCode(a.code);
    const [secB, itemB] = parseCode(b.code);
    if (secA !== secB) return secA - secB;
    return itemA - itemB;
  });

  const getSectionTitle = (code: string) => {
    if (code.startsWith("q1_")) return "Área 1 · Infraestructura, Instalaciones y Equipos (RD 852/2004, ISO 22000)";
    if (code.startsWith("q2_")) return "Área 2 · Higiene Personal, Buenas Prácticas y Manipulación (Codex / RD 1021/2022)";
    if (code.startsWith("q3_")) return "Área 3 · Cadena de Frío, Trazabilidad y Sistema APPCC (RD 562/2025, IFS)";
    return "Puntos Normativos";
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full p-4 sm:p-8">
      {/* Botões Superiores no-print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-border">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-surface text-slate-dark text-sm font-semibold hover:bg-slate-border transition-colors self-start"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Volver a la Rúbrica
        </button>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-surface text-slate-dark border border-slate-border font-semibold text-sm shadow-sm hover:bg-slate-border/70 transition-all cursor-pointer"
            title="Compartir enlace oficial en modo claro"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">share</span>
            <span>Compartir</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm shadow hover:bg-primary-container transition-all cursor-pointer"
            title="Imprimir o guardar como PDF oficial en formato claro"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback de Compartilhamento */}
      {copiedToast && (
        <div className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-fade-in">
          <span className="material-symbols-outlined text-status-pass text-[18px]">check_circle</span>
          <span>Enlace oficial copiado en <strong>modo claro</strong> listo para compartir.</span>
        </div>
      )}

      {/* Documento Oficial A4 (Printable & Screen) */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-border text-slate-dark print:p-0 print:border-none print:shadow-none print-doc">
        {/* Cabecalho Institucional */}
        <div className="flex items-start justify-between border-b-2 border-primary pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-status-pass-bg text-primary flex items-center justify-center font-bold text-2xl">
              <span className="material-symbols-outlined text-[32px]">verified_user</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-dark">
                ACTA OFICIAL DE INSPECCIÓN HIGIÉNICO-SANITARIA
              </h1>
              <p className="text-xs text-slate-subtext font-mono">
                SISTEMA APPCC / HACCP · REGLAMENTO (CE) Nº 852/2004 · ISO 22000
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded bg-slate-surface font-mono text-xs font-bold text-slate-dark">
              EXP: {audit.id.slice(0, 8).toUpperCase()}
            </span>
            <p className="text-[11px] text-slate-subtext mt-1">
              Fecha: {new Date(audit.inspectionDate).toLocaleDateString("es-ES")}
            </p>
          </div>
        </div>

        {/* Quadro de Metadados da Empresa */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-surface p-4 rounded-xl mb-6 text-xs">
          <div>
            <span className="text-slate-subtext uppercase font-semibold block">Empresa Auditada</span>
            <strong className="text-slate-dark text-sm block truncate">{audit.company.name}</strong>
          </div>
          <div>
            <span className="text-slate-subtext uppercase font-semibold block">CIF / NIF</span>
            <strong className="text-slate-dark text-sm block font-mono">
              {typeof audit.company?.cif === "string"
                ? audit.company.cif
                : audit.company?.cif?.value || (audit.company?.cif as any)?._value || "B-84920194"}
            </strong>
          </div>
          <div>
            <span className="text-slate-subtext uppercase font-semibold block">Instalación</span>
            <span className="text-slate-dark block truncate">{audit.company.address}</span>
          </div>
          <div>
            <span className="text-slate-subtext uppercase font-semibold block">Inspector Responsable</span>
            <span className="text-slate-dark block font-medium">{audit.auditor.fullName}</span>
          </div>
        </div>

        {/* Dictamen e Pontuação Global */}
        <div className="border border-slate-border rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-slate-subtext tracking-wider">
              Dictamen Final de Conformidad
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-lg font-bold px-3 py-1 rounded-lg ${
                  report.verdict === "FAVORABLE"
                    ? "bg-status-pass-bg text-status-pass"
                    : report.verdict === "FAVORABLE_CONDICIONAL"
                    ? "bg-alert-amber-bg text-alert-amber"
                    : "bg-alert-red-bg text-alert-red"
                }`}
              >
                {report.verdict === "FAVORABLE"
                  ? "DICTAMEN FAVORABLE"
                  : report.verdict === "FAVORABLE_CONDICIONAL"
                  ? "FAVORABLE CONDICIONADO"
                  : "DICTAMEN DESFAVORABLE"}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2 max-w-lg leading-relaxed">
              {report.verdictDescription}
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end shrink-0">
            <span className="text-xs text-slate-subtext uppercase font-semibold">Índice Global de Cumplimiento</span>
            <span className="text-4xl font-extrabold text-primary tracking-tight">
              {report.globalPercentage}%
            </span>
            <span className="text-[11px] text-slate-subtext">
              {report.conformeCount} Conformes · {report.parcialCount} Parciales · {report.noCumpleCount} Incumplimientos
            </span>
          </div>
        </div>

        {/* Resumo por Categorias */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-dark mb-2">
            Desglose Normativo por Áreas Evaluadas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-border rounded-lg">
              <thead className="bg-slate-surface text-slate-subtext uppercase font-semibold">
                <tr>
                  <th className="p-2.5 border-b border-slate-border">Dimensión Sanitaria</th>
                  <th className="p-2.5 border-b border-slate-border text-center">Puntos Evaluados</th>
                  <th className="p-2.5 border-b border-slate-border text-center">Puntos Obtenidos</th>
                  <th className="p-2.5 border-b border-slate-border text-right">% Conformidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border">
                {Object.values(report.categoryBreakdown).map((cat) => (
                  <tr key={cat.category}>
                    <td className="p-2.5 font-medium">{cat.categoryLabel}</td>
                    <td className="p-2.5 text-center">{cat.totalPoints}</td>
                    <td className="p-2.5 text-center">{cat.obtainedScore} / {cat.maxScore}</td>
                    <td className="p-2.5 text-right font-bold text-primary">{cat.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Registro Completo de Puntos Evaluados de Campo (Los 30 puntos en su totalidad) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-dark flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">checklist</span>
              Registro Completo de Puntos Auditados de Campo ({sortedEvaluations.length} Puntos Normativos)
            </h2>
            <span className="text-[11px] text-slate-subtext font-mono no-print">
              Totalidad de requisitos verificados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-border rounded-lg border-collapse">
              <thead className="bg-slate-surface text-slate-subtext uppercase font-semibold">
                <tr>
                  <th className="p-2.5 border-b border-slate-border text-center w-14">Punto</th>
                  <th className="p-2.5 border-b border-slate-border">Criterio / Requisito Normativo</th>
                  <th className="p-2.5 border-b border-slate-border text-center w-28">Calificación</th>
                  <th className="p-2.5 border-b border-slate-border w-52">Observaciones Técnicas</th>
                  <th className="p-2.5 border-b border-slate-border text-center w-20">Evidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border">
                {sortedEvaluations.map((ev, idx) => {
                  const currentSection = ev.code.split("_")[0];
                  const prevSection = idx > 0 ? sortedEvaluations[idx - 1].code.split("_")[0] : null;
                  const isNewSection = currentSection !== prevSection;
                  const displayNumber = ev.code.replace(/^q/, "").replace("_", ".");

                  return (
                    <React.Fragment key={ev.code}>
                      {isNewSection && (
                        <tr className="bg-slate-surface/90 text-primary font-bold border-b border-t-2 border-slate-border text-xs print:bg-slate-100">
                          <td colSpan={5} className="py-2 px-3 tracking-wider uppercase font-semibold">
                            {getSectionTitle(ev.code)}
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`align-top hover:bg-slate-surface/30 transition-colors ${
                          ev.score === 0
                            ? "bg-alert-red-bg/15 print:bg-red-50/50"
                            : ev.score === 1
                            ? "bg-alert-amber-bg/15 print:bg-amber-50/50"
                            : ""
                        }`}
                      >
                        <td className="p-2.5 font-mono font-bold text-center border-b border-slate-border/60">
                          <span className="block text-slate-dark">{displayNumber}</span>
                          {ev.isCriticalCcp && (
                            <span className="inline-block mt-0.5 px-1 py-0.2 rounded text-[9px] font-extrabold uppercase bg-alert-red-bg text-alert-red border border-alert-red/30">
                              PCC
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 border-b border-slate-border/60">
                          <div className="font-medium text-slate-dark text-xs leading-snug">
                            {ev.title}
                          </div>
                        </td>
                        <td className="p-2.5 text-center border-b border-slate-border/60 whitespace-nowrap">
                          {ev.score === 2 ? (
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-status-pass-bg text-status-pass border border-status-pass/20 print:border-status-pass">
                              2 · Conforme
                            </span>
                          ) : ev.score === 1 ? (
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-alert-amber-bg text-alert-amber border border-alert-amber/30 print:border-alert-amber">
                              1 · Parcial
                            </span>
                          ) : ev.score === 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-alert-red-bg text-alert-red border border-alert-red/30 print:border-alert-red">
                              0 · No Cumple
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-slate-surface text-slate-subtext border border-slate-border">
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 border-b border-slate-border/60 text-xs">
                          {ev.observations ? (
                            <span className="text-slate-dark italic">{ev.observations}</span>
                          ) : ev.score === 2 ? (
                            <span className="text-slate-subtext text-[11px] italic">
                              Conforme. Verificado sin desviaciones.
                            </span>
                          ) : ev.score === 1 ? (
                            <span className="text-alert-amber text-[11px] italic">
                              Desviación parcial registrada.
                            </span>
                          ) : ev.score === 0 ? (
                            <span className="text-alert-red text-[11px] italic">
                              No conformidad identificada.
                            </span>
                          ) : (
                            <span className="text-slate-subtext text-[11px] italic">
                              Criterio no aplicable.
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center border-b border-slate-border/60">
                          {ev.evidencePhoto && ev.evidencePhoto.url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={ev.evidencePhoto.url}
                              alt={`Evidencia punto ${displayNumber}`}
                              className="w-14 h-11 object-cover rounded border border-slate-border mx-auto shadow-sm"
                            />
                          ) : (
                            <span className="text-slate-subtext text-[10px] italic">Sin foto</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bloco de Assinaturas Digitais Ratificadas */}
        <div className="border-t-2 border-slate-border pt-6 mt-8 grid grid-cols-2 gap-8 avoid-break">
          {/* Assinatura do Auditor */}
          <div className="flex flex-col items-center text-center">
            <span className="text-xs text-slate-subtext font-semibold uppercase mb-2">
              Inspector Oficial / Sanidad
            </span>
            <div className="w-full h-24 border border-dashed border-slate-border rounded-lg bg-slate-surface/50 flex items-center justify-center p-2 mb-2 print:border-solid print:border-black/50 print:bg-white">
              {audit.auditorSignature && audit.auditorSignature.signatureDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={audit.auditorSignature.signatureDataUrl}
                  alt="Firma del auditor"
                  className="max-h-full max-w-full object-contain print:h-20"
                />
              ) : (
                <span className="text-slate-subtext text-xs italic">Firma pendiente</span>
              )}
            </div>
            <strong className="text-xs text-slate-dark block">
              {audit.auditorSignature?.signeeName || audit.auditor.fullName}
            </strong>
            <span className="text-[10px] text-slate-subtext block">
              NIF/NIE: {audit.auditor.officialId} · Sello Digital de Campo
            </span>
          </div>

          {/* Assinatura do Auditado */}
          <div className="flex flex-col items-center text-center">
            <span className="text-xs text-slate-subtext font-semibold uppercase mb-2">
              Representante de la Empresa Auditada
            </span>
            <div className="w-full h-24 border border-dashed border-slate-border rounded-lg bg-slate-surface/50 flex items-center justify-center p-2 mb-2 print:border-solid print:border-black/50 print:bg-white">
              {audit.auditedSignature && audit.auditedSignature.signatureDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={audit.auditedSignature.signatureDataUrl}
                  alt="Firma del auditado"
                  className="max-h-full max-w-full object-contain print:h-20"
                />
              ) : (
                <span className="text-slate-subtext text-xs italic">Firma pendiente</span>
              )}
            </div>
            <strong className="text-xs text-slate-dark block">
              {audit.auditedSignature?.signeeName || "Representante de Planta"}
            </strong>
            <span className="text-[10px] text-slate-subtext block">
              Conforme con la inspección realizada y notificada
            </span>
          </div>
        </div>

        {/* Rodapé Legal */}
        <div className="mt-8 pt-4 border-t border-slate-border text-[10px] text-slate-subtext text-center font-mono">
          Documento expedido y validado digitalmente por BioAudit Pro. Certificación de inocuidad alimentaria conforme al Reglamento (CE) 852/2004.
        </div>
      </div>
    </div>
  );
}
