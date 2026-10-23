"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ReportView } from "@/presentation/components/ReportView";
import { Audit } from "@/domain/entities/audit";
import { Company } from "@/domain/entities/company";
import { Auditor } from "@/domain/entities/auditor";
import { ControlPointEvaluation } from "@/domain/entities/control-point";
import { Cif } from "@/domain/value-objects/cif";
import { ComplianceCalculatorService, AuditComplianceReport } from "@/domain/services/compliance-calculator.service";
import { DEFAULT_CONTROL_POINTS } from "@/domain/constants/default-control-points";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";
import { Signature } from "@/domain/value-objects/signature";
import { EvidencePhoto } from "@/domain/value-objects/evidence-photo";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";

export default function RelatorioPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthGuard();
  const params = useParams();
  const searchParams = useSearchParams();
  const auditId = (params?.id as string) || "audit-default";

  const companyName = searchParams.get("company") || "";
  const companyCif = searchParams.get("cif") || "";
  const companyAddress = searchParams.get("address") || "";

  const [audit, setAudit] = useState<Audit | null>(null);
  const [report, setReport] = useState<AuditComplianceReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setErrorMessage(null);
    try {
      // 1. Tenta carregar da API remota
      try {
        const res = await fetch(`/api/audits/${auditId}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.audit && data?.report) {
            setAudit(data.audit);
            setReport(data.report);
            return;
          }
        }
      } catch {
        // Falha de rede ou 404: continua para fallback local/IndexedDB de campo
      }

      // 2. Busca do localStorage como verdade imediata de campo
      let localSigs: any = null;
      let localEvals: any = null;
      try {
        const raw = localStorage.getItem(`bioaudit_signatures_${auditId}`);
        if (raw) localSigs = JSON.parse(raw);
        const rawEvals = localStorage.getItem(`bioaudit_evaluations_${auditId}`);
        if (rawEvals) localEvals = JSON.parse(rawEvals);
      } catch (err) {
        console.warn("Storage signature parse warning:", err);
      }

      // 3. Constrói modelo a partir do IndexedDB ou estado local resiliente
      let offlineRecord: any = null;
      try {
        offlineRecord = await offlineDb.audits.get(auditId);
      } catch (e) {
        console.warn("IndexedDB read warning:", e);
      }

      const safeName = (offlineRecord?.companyName || companyName || "Empresa Auditada").trim() || "Empresa Auditada";
      const safeAddress = (offlineRecord?.companyAddress || companyAddress || "Instalación Operativa").trim() || "Instalación Operativa";
      const rawCif = offlineRecord?.companyCif || companyCif || "B84920194";
      const safeCif = Cif.createSafe(rawCif);

      const company = new Company({
        id: "comp-local",
        name: safeName,
        cif: safeCif,
        address: safeAddress,
      });

      const auditor = new Auditor({
        id: "aud-local",
        authUserId: "auth-local",
        fullName: localSigs?.auditorName || offlineRecord?.auditorSignatureName || "Dra. Carmen Rodríguez",
        officialId: "B-28491029",
        email: "auditor@sanidad.es",
      });

      const evaluations: ControlPointEvaluation[] = DEFAULT_CONTROL_POINTS.map((p) => {
        const offPoint = localEvals?.[p.code] || offlineRecord?.evaluations?.[p.code];
        const score = offPoint?.score !== undefined ? (offPoint.score as any) : 0;
        let photo: EvidencePhoto | undefined;
        const photoUrl = offPoint?.photoUrl || offPoint?.evidencePhotoBase64;
        if (photoUrl) {
          photo = new EvidencePhoto({ url: photoUrl });
        }
        return new ControlPointEvaluation({
          code: p.code,
          title: p.title,
          category: p.category,
          isCriticalCcp: p.isCriticalCcp,
          score,
          observations: offPoint?.observations || "",
          evidencePhoto: photo,
        });
      });

      let auditorSignature: Signature | undefined;
      const audSigData = localSigs?.auditorSignature || offlineRecord?.auditorSignatureBase64;
      const audSigName = localSigs?.auditorName || offlineRecord?.auditorSignatureName || "Dra. Carmen Rodríguez (Auditor Oficial)";
      if (audSigData) {
        auditorSignature = new Signature({
          signeeName: audSigName,
          signeeRole: "Auditor",
          signatureDataUrl: audSigData,
        });
      }

      let auditedSignature: Signature | undefined;
      const repSigData = localSigs?.auditedSignature || offlineRecord?.auditedSignatureBase64;
      const repSigName = localSigs?.auditedName || offlineRecord?.auditedSignatureName || "Representante de Planta";
      if (repSigData) {
        auditedSignature = new Signature({
          signeeName: repSigName,
          signeeRole: "Auditado",
          signatureDataUrl: repSigData,
        });
      }

      const localAudit = new Audit({
        id: auditId,
        company,
        auditor,
        inspectionDate: offlineRecord?.inspectionDate ? new Date(offlineRecord.inspectionDate) : new Date(),
        evaluations,
        auditorSignature,
        auditedSignature,
      });

      const calculatedReport = ComplianceCalculatorService.calculateReport(localAudit);
      setAudit(localAudit);
      setReport(calculatedReport);
    } catch (err: any) {
      console.error("Error al generar el laudo oficial:", err);
      setErrorMessage(err?.message || "Ocurrió un error inesperado al procesar los datos de la auditoría.");
    }
  }, [auditId, companyName, companyCif, companyAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isAuthLoading || !isAuthenticated) {
    return <AuthLoadingScreen message="Verificando sesión oficial..." />;
  }

  if (errorMessage) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-surface dark:bg-slate-950 min-h-screen text-center">
        <div className="max-w-md w-full bg-surface-container-low dark:bg-slate-900 border border-alert-red/30 rounded-2xl p-6 shadow-lg">
          <span className="material-symbols-outlined text-[48px] text-alert-red mb-3">error</span>
          <h2 className="text-lg font-bold text-slate-dark dark:text-slate-100 mb-2">
            No se pudo emitir el Laudo Oficial
          </h2>
          <p className="text-xs text-slate-subtext dark:text-slate-400 mb-6 leading-relaxed">
            {errorMessage}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push(`/auditorias/${auditId}/rubrica`)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-border text-xs font-semibold text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors"
            >
              Volver a la Rúbrica
            </button>
            <button
              onClick={() => loadData()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors shadow-sm"
            >
              Reintentar Emisión
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!audit || !report) {
    return <AuthLoadingScreen message="Generando Laudo Oficial..." />;
  }

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-16 bg-surface dark:bg-slate-950 min-h-screen">
      <ReportView audit={audit} report={report} />
    </main>
  );
}
