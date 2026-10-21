"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Header } from "@/presentation/components/Header";
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

export default function RelatorioPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const auditId = (params?.id as string) || "audit-default";

  const companyName = searchParams.get("company") || "Alimentos del Valle S.L.";
  const companyCif = searchParams.get("cif") || "B-84920194";
  const companyAddress = searchParams.get("address") || "Pol. Ind. Las Nieves, Nave 4, Madrid";

  const [audit, setAudit] = useState<Audit | null>(null);
  const [report, setReport] = useState<AuditComplianceReport | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Tenta carregar da API
        const res = await fetch(`/api/audits/${auditId}`);
        if (res.ok) {
          const data = await res.json();
          setAudit(data.audit);
          setReport(data.report);
          return;
        }
      } catch {
        // Fallback para IndexedDB local
      }

      // Tenta buscar do localStorage como fonte de verdade imediata de campo
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

      // Constrói modelo a partir do IndexedDB ou estado local
      const offlineRecord = await offlineDb.audits.get(auditId);

      const company = new Company({
        id: "comp-local",
        name: offlineRecord?.companyName || companyName,
        cif: new Cif(offlineRecord?.companyCif || companyCif),
        address: offlineRecord?.companyAddress || companyAddress,
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
        inspectionDate: new Date(),
        evaluations,
        auditorSignature,
        auditedSignature,
      });

      const calculatedReport = ComplianceCalculatorService.calculateReport(localAudit);
      setAudit(localAudit);
      setReport(calculatedReport);
    }

    loadData();
  }, [auditId, companyName, companyCif, companyAddress]);

  if (!audit || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-slate-subtext">Generando Laudo Oficial...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="no-print">
        <Header title="BioAudit Pro" subtitle="Laudo Oficial" />
      </div>

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-16 bg-surface min-h-screen">
        <ReportView audit={audit} report={report} />
      </main>
    </>
  );
}
