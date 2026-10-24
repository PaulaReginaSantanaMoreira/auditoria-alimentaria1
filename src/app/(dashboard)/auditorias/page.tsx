"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";
import { AuditsTable, AuditListItem } from "@/presentation/components/audits/AuditsTable";
import { hasPermission } from "@/domain/security/roles-and-permissions";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";
import { OfflineSyncService } from "@/infrastructure/offline/offline-sync.service";
import { DEFAULT_CONTROL_POINTS } from "@/domain/constants/default-control-points";
import { ComplianceCalculatorService } from "@/domain/services/compliance-calculator.service";
import { Audit } from "@/domain/entities/audit";
import { Company } from "@/domain/entities/company";
import { Auditor } from "@/domain/entities/auditor";
import { ControlPointEvaluation } from "@/domain/entities/control-point";
import { Cif } from "@/domain/value-objects/cif";

function computeLocalAuditSummary(rec: any) {
  if (!rec.evaluations || Object.keys(rec.evaluations).length === 0) {
    const isFinalized = rec.status === "FINALIZED" || Boolean(rec.auditorSignatureBase64 && rec.auditedSignatureBase64);
    return {
      score: undefined,
      verdict: undefined,
      status: isFinalized ? "FINALIZED" : (rec.status || "IN_PROGRESS"),
    };
  }

  try {
    const evaluations: ControlPointEvaluation[] = DEFAULT_CONTROL_POINTS.map((p) => {
      const ev = rec.evaluations[p.code];
      const score = ev?.score !== undefined ? ev.score : 0;
      return new ControlPointEvaluation({
        code: p.code,
        title: p.title,
        category: p.category,
        isCriticalCcp: p.isCriticalCcp,
        score,
        observations: ev?.observations || "",
      });
    });

    const tempAudit = new Audit({
      id: rec.id,
      company: new Company({
        id: "comp-local",
        name: rec.companyName || "Empresa Auditada",
        cif: Cif.createSafe(rec.companyCif || "B84920194"),
        address: rec.companyAddress || "",
      }),
      auditor: new Auditor({
        id: "aud-local",
        authUserId: "auth-local",
        fullName: rec.auditorSignatureName || "Auditor Oficial BioAudit",
        officialId: "B-SANIDAD",
        email: "auditor@sanidad.es",
      }),
      inspectionDate: rec.inspectionDate ? new Date(rec.inspectionDate) : new Date(),
      normativeFramework: "Reglamento (CE) 852/2004 · APPCC / ISO 22000",
      evaluations,
    });

    const report = ComplianceCalculatorService.calculateReport(tempAudit);
    const isFinalized =
      rec.status === "FINALIZED" ||
      Boolean(rec.auditorSignatureBase64 && rec.auditedSignatureBase64);

    return {
      score: report.globalPercentage,
      verdict: report.verdict,
      status: isFinalized ? "FINALIZED" : (rec.status || "IN_PROGRESS"),
    };
  } catch (err) {
    console.warn("Error computing local audit summary:", err);
    return {
      score: undefined,
      verdict: undefined,
      status: rec.status || "IN_PROGRESS",
    };
  }
}

export default function AuditoriasPage() {
  const { session, isAuthenticated, isLoading: isAuthLoading } = useAuthGuard();

  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invalidation Modal State
  const [invalidationAudit, setInvalidationAudit] = useState<AuditListItem | null>(null);
  const [invalidationReason, setInvalidationReason] = useState("");
  const [isInvalidating, setIsInvalidating] = useState(false);
  const [invalidationError, setInvalidationError] = useState<string | null>(null);

  const userRole = session?.role || "AUDITOR";
  const canInvalidate =
    userRole === "PLATFORM_SUPERADMIN" ||
    userRole === "TENANT_ADMIN" ||
    hasPermission(userRole, "audit:invalidate");

  const loadAudits = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Obtém auditorias remotas do Supabase
      let remoteAudits: AuditListItem[] = [];
      try {
        const res = await fetch("/api/audits");
        if (res.ok) {
          const data = await res.json();
          remoteAudits = (data || []).map((a: any) => ({
            id: a.id,
            companyName: a.company?.name || a.companyName || "Empresa Sin Nombre",
            companyCif: a.company?.cif || a.companyCif || "N/A",
            inspectionDate: a.inspection_date || a.inspectionDate || a.createdAt || new Date().toISOString(),
            normativeFramework: a.normative_framework || a.normativeFramework || "CE 852/2004",
            complianceScore: a.compliance_score ?? a.score?.percentage ?? undefined,
            verdict: a.verdict,
            status: a.status || "DRAFT",
            accessScope: a.access_scope || a.accessScope || "TENANT",
            auditorName: a.auditor?.fullName || a.auditor_signature_name || a.auditorName,
            auditorId: a.auditor?.authUserId || a.auditor?.id || a.auditor_id || a.auditorId,
            tenantId: a.tenant_id || a.tenantId,
            tenantName: a.tenant?.name || a.tenantName,
            isSynced: true,
          }));
        }
      } catch (err) {
        console.warn("Fallo en consulta remota de auditorías:", err);
      }

      // 2. Obtém réplicas locais do IndexedDB (Dexie)
      let localAudits: AuditListItem[] = [];
      let rawLocalRecords: any[] = [];
      try {
        rawLocalRecords = await offlineDb.audits.toArray();
        localAudits = rawLocalRecords.map((rec) => {
          const summary = computeLocalAuditSummary(rec);
          return {
            id: rec.id,
            companyName: rec.companyName || "Empresa Sin Nombre",
            companyCif: rec.companyCif || "N/A",
            inspectionDate: rec.inspectionDate || rec.updatedAt || new Date().toISOString(),
            normativeFramework: "CE 852/2004",
            complianceScore: summary.score,
            verdict: summary.verdict,
            status: summary.status,
            accessScope: rec.accessScope || "TENANT",
            auditorName: rec.auditorSignatureName || rec.createdByEmail,
            auditorId: rec.auditorId,
            tenantId: rec.tenantId,
            tenantName: rec.tenantName,
            isSynced: Boolean(rec.isSynced),
          };
        });
      } catch (err) {
        console.warn("Fallo al leer réplica local Dexie:", err);
      }

      // 3. Mescla remota e local deduplicando por ID com prioridade de completude
      const mergedMap = new Map<string, AuditListItem>();

      for (const ra of remoteAudits) {
        mergedMap.set(ra.id, ra);
      }

      for (const la of localAudits) {
        const existing = mergedMap.get(la.id);
        if (!existing) {
          mergedMap.set(la.id, la);
        } else {
          // Se o registro local foi finalizado ou contém nota calculada e o remoto está pendente/DRAFT
          if (
            la.status === "FINALIZED" ||
            (la.complianceScore !== undefined && existing.complianceScore === undefined)
          ) {
            mergedMap.set(la.id, {
              ...existing,
              ...la,
              companyName:
                la.companyName !== "Empresa Sin Nombre" ? la.companyName : existing.companyName,
              companyCif:
                la.companyCif !== "N/A" ? la.companyCif : existing.companyCif,
              tenantId: existing.tenantId || la.tenantId,
              tenantName: existing.tenantName || la.tenantName,
              auditorId: existing.auditorId || la.auditorId,
              isSynced: existing.isSynced || la.isSynced,
            });
          }
        }
      }

      const combined = Array.from(mergedMap.values());
      // Ordena por data decrescente
      combined.sort(
        (a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()
      );

      setAudits(combined);

      // 4. Sincronização em background imediata de registros locais na primeira oportunidade
      OfflineSyncService.syncPendingAudits().catch((e) =>
        console.warn("[AuditoriasPage] Sincronización automática diferida:", e)
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cargar las inspecciones sanitarias.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAudits();
    }
  }, [isAuthenticated, loadAudits]);

  // Recarga reactivamente cuando concluya cualquier ciclo de sincronización en segundo plano
  useEffect(() => {
    const handleSyncCompleted = () => {
      loadAudits();
    };
    window.addEventListener("bioaudit:sync-completed", handleSyncCompleted);
    return () => {
      window.removeEventListener("bioaudit:sync-completed", handleSyncCompleted);
    };
  }, [loadAudits]);

  const handleConfirmInvalidate = async () => {
    if (!invalidationAudit) return;
    if (!invalidationReason.trim()) {
      setInvalidationError("Es obligatorio registrar el motivo técnico/legal para anular la inspección.");
      return;
    }

    setIsInvalidating(true);
    setInvalidationError(null);
    try {
      const res = await fetch(`/api/audits/${invalidationAudit.id}/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: invalidationReason.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al anular la inspección");
      }

      // Marca também no Dexie como INVALIDATED
      try {
        await offlineDb.audits.update(invalidationAudit.id, { status: "INVALIDATED" });
      } catch {
        // Ignora
      }

      setInvalidationAudit(null);
      setInvalidationReason("");
      await loadAudits();
    } catch (err: any) {
      setInvalidationError(err.message || "Error al anular la auditoría");
    } finally {
      setIsInvalidating(false);
    }
  };

  if (isAuthLoading) {
    return <AuthLoadingScreen message="Comprobando autorización..." />;
  }

  // Estatísticas Rápidas
  const totalAudits = audits.length;
  const finalizedAudits = audits.filter((a) => a.status === "FINALIZED" || a.status === "SIGNED").length;
  const favorableCount = audits.filter((a) => a.verdict === "FAVORABLE").length;
  const favorableRate = finalizedAudits > 0 ? Math.round((favorableCount / finalizedAudits) * 100) : 0;
  const inProgressCount = audits.filter((a) => a.status === "IN_PROGRESS" || a.status === "DRAFT").length;

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16 space-y-6">
        {/* Banner de Título & CTA Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-slate-border shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary mb-2">
              <span className="material-symbols-outlined text-[14px]">shield_with_heart</span>
              <span>Control Sanitario Oficial</span>
            </div>
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Historial de Inspecciones
            </h1>
            <p className="text-xs text-slate-subtext mt-1 max-w-xl">
              Consulte informes oficiales, supervise evaluaciones higiénico-sanitarias y acceda
              a la documentación técnica de cumplimiento normativo (CE 852/2004 &amp; APPCC).
            </p>
          </div>

          {userRole !== "VIEWER" && (
            <Link
              href="/auditorias/nova"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Nueva Inspección</span>
            </Link>
          )}
        </div>

        {/* Métricas / Cards Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">Total Inspecciones</div>
            <div className="text-2xl font-black text-on-surface mt-1">{totalAudits}</div>
            <div className="text-[11px] text-slate-subtext mt-1">Registradas en plataforma</div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">Concluidas</div>
            <div className="text-2xl font-black text-status-pass mt-1">{finalizedAudits}</div>
            <div className="text-[11px] text-slate-subtext mt-1">Firmadas y con laudo</div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">Tasa Favorable</div>
            <div className="text-2xl font-black text-primary mt-1">{favorableRate}%</div>
            <div className="text-[11px] text-slate-subtext mt-1">{favorableCount} conformes</div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-slate-border shadow-sm">
            <div className="text-xs text-slate-subtext font-medium">En Curso / Campo</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {inProgressCount}
            </div>
            <div className="text-[11px] text-slate-subtext mt-1">Pendientes de cierre</div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-alert-red-bg/25 border border-alert-red/30 text-alert-red text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabela de Auditorias Reutilizável com ActionMenu */}
        <AuditsTable
          audits={audits}
          isLoading={isLoading}
          onRefresh={loadAudits}
          canInvalidate={canInvalidate}
          onInvalidateAudit={(audit) => {
            setInvalidationAudit(audit);
            setInvalidationReason("");
            setInvalidationError(null);
          }}
          currentUserRole={userRole}
          currentUserId={session?.userId}
          currentEmail={session?.identifier}
        />
      </main>

      {/* Modal de Anulação Oficial de Inspeção */}
      {invalidationAudit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl border border-slate-border shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-alert-red mb-3">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="font-title-md text-title-md font-bold">
                Anular Inspección Sanitaria
              </h3>
            </div>

            <p className="text-xs text-slate-subtext leading-relaxed">
              Esta acción anula el informe oficial de la empresa{" "}
              <strong className="text-on-surface">{invalidationAudit.companyName}</strong> (CIF:{" "}
              {invalidationAudit.companyCif}). La auditoría quedará marcada permanentemente como
              inválida para fines regulatorios.
            </p>

            {invalidationError && (
              <div className="mt-3 p-3 rounded-xl bg-alert-red-bg/25 border border-alert-red/30 text-alert-red text-xs">
                {invalidationError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                Motivo Técnico / Legal de la Anulación *
              </label>
              <textarea
                value={invalidationReason}
                onChange={(e) => setInvalidationReason(e.target.value)}
                rows={3}
                placeholder="Describa el motivo técnico por el cual se anula este informe oficial..."
                className="w-full p-3 rounded-xl bg-surface-container border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-alert-red/40"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInvalidationAudit(null)}
                disabled={isInvalidating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInvalidate}
                disabled={isInvalidating || !invalidationReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-alert-red text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isInvalidating ? "Anulando..." : "Confirmar Anulación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
