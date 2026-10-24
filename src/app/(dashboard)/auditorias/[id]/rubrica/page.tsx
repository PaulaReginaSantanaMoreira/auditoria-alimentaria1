"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProgressTracker } from "@/presentation/components/ProgressTracker";
import { RubricControlCard } from "@/presentation/components/RubricControlCard";
import { SignatureModal } from "@/presentation/components/SignatureModal";
import { DEFAULT_CONTROL_POINTS, ControlPointTemplate } from "@/domain/constants/default-control-points";
import { EvaluationPointScore } from "@/domain/value-objects/score";
import { ControlPointCategory } from "@/domain/entities/control-point";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";
import { useAuthGuard } from "@/presentation/hooks/useAuthGuard";
import { AuthLoadingScreen } from "@/presentation/components/AuthGuard";
import { ControlPointSorterService } from "@/domain/services/control-point-sorter.service";

export default function RubricaPage() {
  const { session, isAuthenticated, isLoading: isAuthLoading } = useAuthGuard();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const auditId = (params?.id as string) || "audit-default";

  // Metadados da empresa
  const [companyName, setCompanyName] = useState(() => searchParams.get("company") || "");
  const [companyCif, setCompanyCif] = useState(() => searchParams.get("cif") || "");
  const [companyAddress, setCompanyAddress] = useState(() => searchParams.get("address") || "");

  // Estado das avaliações dos 30 pontos
  const [evaluations, setEvaluations] = useState<
    Record<
      string,
      {
        score: EvaluationPointScore;
        observations: string;
        photoUrl?: string;
      }
    >
  >(() => {
    // Por padrão regulatório, inicia com 0 (Não cumpre) como precaução
    const init: Record<string, { score: EvaluationPointScore; observations: string; photoUrl?: string }> = {};
    for (const p of DEFAULT_CONTROL_POINTS) {
      init[p.code] = { score: 0, observations: "" };
    }
    return init;
  });

  const [controlPoints, setControlPoints] = useState<ControlPointTemplate[]>(DEFAULT_CONTROL_POINTS);
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | ControlPointCategory | "CRITICAL">("ALL");
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega ou salva réplica no IndexedDB para suporte offline e sincroniza rúbricas ativas do tenant
  useEffect(() => {
    async function initOfflineAndRubric() {
      let dynamicPoints: ControlPointTemplate[] = DEFAULT_CONTROL_POINTS;
      try {
        const res = await fetch(`/api/tenant/rubrica?auditId=${encodeURIComponent(auditId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.rubric?.templates?.length > 0) {
            dynamicPoints = json.rubric.templates;
            setControlPoints(json.rubric.templates);
            if (json.evaluations) {
              setEvaluations((prev) => ({ ...json.evaluations, ...prev }));
            }
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic rubric from API:", err);
      }

      try {
        const existing = await offlineDb.audits.get(auditId);
        if (existing) {
          if (existing.companyName) setCompanyName(existing.companyName);
          if (existing.companyCif) setCompanyCif(existing.companyCif);
          if (existing.companyAddress) setCompanyAddress(existing.companyAddress);
        }
        if (existing && existing.evaluations) {
          const loaded: Record<string, { score: EvaluationPointScore; observations: string; photoUrl?: string }> = {};
          for (const [code, val] of Object.entries(existing.evaluations)) {
            loaded[code] = {
              score: val.score as EvaluationPointScore,
              observations: val.observations,
              photoUrl: val.evidencePhotoBase64,
            };
          }
          setEvaluations((prev) => ({ ...loaded, ...prev }));
        } else {
          setEvaluations((prev) => {
            const next = { ...prev };
            for (const p of dynamicPoints) {
              if (!next[p.code]) {
                next[p.code] = { score: 0, observations: "" };
              }
            }
            return next;
          });
        }
      } catch {
        // Ignora caso erro no indexeddb
      }
    }
    initOfflineAndRubric();
  }, [auditId]);

  // Contadores por categoría dinámica
  const categoryCounts = useMemo(() => {
    let infra = 0;
    let higiene = 0;
    let appcc = 0;
    for (const p of controlPoints) {
      if (p.category === "INFRAESTRUCTURA") infra++;
      else if (p.category === "HIGIENE_PERSONAL") higiene++;
      else if (p.category === "APPCC_FRIO_PROCESOS") appcc++;
    }
    return { infra, higiene, appcc };
  }, [controlPoints]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    let totalScore = 0;
    let totalMaxScore = 0;
    let parcialCount = 0;
    let noCumpleCount = 0;
    let naCount = 0;
    let evaluatedCount = 0;

    for (const p of controlPoints) {
      const item = evaluations[p.code];
      if (!item) continue;
      evaluatedCount++;
      if (item.score === "na") {
        naCount++;
      } else {
        totalScore += item.score;
        totalMaxScore += 2;
        if (item.score === 1) parcialCount++;
        if (item.score === 0) noCumpleCount++;
      }
    }

    const conformePercentage =
      totalMaxScore > 0 ? Number(((totalScore / totalMaxScore) * 100).toFixed(1)) : 100;

    const criticalCcpCount = controlPoints.filter((p) => p.isCriticalCcp).length;

    return {
      totalPoints: controlPoints.length,
      evaluatedCount,
      conformePercentage,
      parcialCount,
      noCumpleCount,
      naCount,
      criticalCcpCount,
    };
  }, [evaluations, controlPoints]);

  // Lista filtrada por abas/chips com ordenação numérica natural (1.1, 1.2, ..., 1.10)
  const filteredPoints = useMemo(() => {
    let list = controlPoints;
    if (selectedCategory === "CRITICAL") list = controlPoints.filter((p) => p.isCriticalCcp);
    else if (selectedCategory !== "ALL") list = controlPoints.filter((p) => p.category === selectedCategory);
    return ControlPointSorterService.sortNaturally(list);
  }, [selectedCategory, controlPoints]);

  const handleScoreChange = (code: string, score: EvaluationPointScore) => {
    setEvaluations((prev) => {
      const updated = {
        ...prev,
        [code]: {
          ...prev[code],
          score,
        },
      };

      // Sincroniza borrador activo en localStorage
      try {
        localStorage.setItem(
          "bioaudit_active_draft",
          JSON.stringify({
            id: auditId,
            companyName,
            companyCif,
            companyAddress,
            normative: "Reglamento (CE) 852/2004 · APPCC",
            updatedAt: new Date().toISOString(),
            answeredCount: Object.values(updated).length,
          })
        );
      } catch {
        // Fallback
      }

      // Grava no IndexedDB em background
      offlineDb.audits.put({
        id: auditId,
        companyName,
        companyCif,
        companyAddress,
        inspectionDate: new Date().toISOString(),
        status: "IN_PROGRESS",
        evaluations: updated as any,
        isSynced: false,
        updatedAt: new Date().toISOString(),
      });
      return updated;
    });
  };

  const handleObservationsChange = (code: string, observations: string) => {
    setEvaluations((prev) => {
      const updated = {
        ...prev,
        [code]: {
          ...prev[code],
          observations,
        },
      };
      try {
        localStorage.setItem(`bioaudit_evaluations_${auditId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handlePhotoUploaded = (code: string, photoUrl: string) => {
    setEvaluations((prev) => {
      const updated = {
        ...prev,
        [code]: {
          ...prev[code],
          photoUrl,
        },
      };
      try {
        localStorage.setItem(`bioaudit_evaluations_${auditId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handlePhotoRemoved = (code: string) => {
    setEvaluations((prev) => {
      const updated = {
        ...prev,
        [code]: {
          ...prev[code],
          photoUrl: undefined,
        },
      };
      try {
        localStorage.setItem(`bioaudit_evaluations_${auditId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSignaturesConfirm = async (sigData: {
    auditorName: string;
    auditorSignature: string;
    auditedName: string;
    auditedSignature: string;
  }) => {
    setIsSaving(true);
    try {
      // 1. Salvar no localStorage para passagem imediata e infalível
      try {
        localStorage.setItem(
          `bioaudit_signatures_${auditId}`,
          JSON.stringify({
            auditorName: sigData.auditorName,
            auditorSignature: sigData.auditorSignature,
            auditedName: sigData.auditedName,
            auditedSignature: sigData.auditedSignature,
            signedAt: new Date().toISOString(),
          })
        );
        localStorage.setItem(
          `bioaudit_evaluations_${auditId}`,
          JSON.stringify(evaluations)
        );
      } catch (err) {
        console.warn("Storage warning:", err);
      }

      // 2. Atualizar no IndexedDB com as assinaturas, nomes e todas as avaliações
      try {
        await offlineDb.audits.update(auditId, {
          status: "FINALIZED",
          evaluations: evaluations as any,
          auditorSignatureBase64: sigData.auditorSignature,
          auditorSignatureName: sigData.auditorName,
          auditedSignatureBase64: sigData.auditedSignature,
          auditedSignatureName: sigData.auditedName,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("IndexedDB update warning:", err);
      }

      // 3. Salva no banco via API (sincronização de campo completa)
      try {
        const syncRes = await fetch("/api/audits/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: auditId,
            companyName,
            companyCif,
            companyAddress,
            evaluations,
            auditorSignatureName: sigData.auditorName,
            auditorSignatureBase64: sigData.auditorSignature,
            auditedSignatureName: sigData.auditedName,
            auditedSignatureBase64: sigData.auditedSignature,
            status: "FINALIZED",
          }),
        });
        if (syncRes.ok) {
          await offlineDb.audits.update(auditId, { isSynced: true });
        }
      } catch {
        // Continua offline
      }

      // Limpa borrador ativo do localStorage ao finalizar
      localStorage.removeItem("bioaudit_active_draft");
    } finally {
      setIsSaving(false);
      setIsSignatureModalOpen(false);
      router.push(`/auditorias/${auditId}/relatorio?company=${encodeURIComponent(companyName)}&cif=${encodeURIComponent(companyCif)}&address=${encodeURIComponent(companyAddress)}`);
    }
  };

  if (isAuthLoading || !isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  if (session?.role === "VIEWER") {
    router.replace(`/auditorias/${auditId}/relatorio?company=${encodeURIComponent(companyName)}&cif=${encodeURIComponent(companyCif)}&address=${encodeURIComponent(companyAddress)}`);
    return <AuthLoadingScreen message="Redirigiendo a consulta de laudo oficial..." />;
  }

  return (
    <>
      
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-28 bg-surface min-h-screen">
        <div className="flex flex-col w-full max-w-5xl mx-auto">
          {/* Header Contextual: Datos de Inspección de Campo */}
          <section className="px-margin-mobile pt-space-sm pb-space-xs flex flex-col gap-space-sm">
            <div className="bg-surface-container-lowest dark:bg-slate-900/90 p-space-md rounded-2xl shadow-sm border border-slate-border/50 dark:border-slate-800 flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-on-primary">
                    <span className="material-symbols-outlined text-[20px]">assignment</span>
                  </span>
                  <div>
                    <h1 className="font-title-md text-title-md text-on-surface font-bold leading-tight">
                      Inspección Sanitaria de Campo
                    </h1>
                    <p className="font-label-sm text-label-sm text-slate-subtext">
                      30 Puntos de Control Normativo (RD 852/2004 · APPCC · ISO 22000)
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-pass-bg text-status-pass text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-status-pass animate-pulse" />
                  En Inspección
                </div>
              </div>

              {/* Empresa Auditada Grid */}
              <div className="bg-slate-surface dark:bg-slate-950/60 rounded-xl p-space-sm grid grid-cols-2 sm:grid-cols-4 gap-space-xs text-xs border border-transparent dark:border-slate-800/80">
                <div>
                  <span className="text-slate-subtext dark:text-slate-400 uppercase font-semibold block">Empresa Auditada</span>
                  <span className="font-bold text-slate-dark dark:text-slate-100 text-sm truncate block">{companyName || "Empresa en Proceso de Auditoría"}</span>
                </div>
                <div>
                  <span className="text-slate-subtext dark:text-slate-400 uppercase font-semibold block">CIF / NIF</span>
                  <span className="font-mono text-slate-dark dark:text-slate-100 text-sm truncate block">{companyCif || "Pendiente de CIF"}</span>
                </div>
                <div>
                  <span className="text-slate-subtext dark:text-slate-400 uppercase font-semibold block">Fecha de Visita</span>
                  <span className="text-slate-dark dark:text-slate-200 block font-medium">
                    {new Date().toLocaleDateString("es-ES")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-subtext dark:text-slate-400 uppercase font-semibold block">Instalación</span>
                  <span className="text-slate-dark dark:text-slate-200 truncate block font-medium" title={companyAddress || "Instalación en Verificación"}>
                    {companyAddress || "Instalación en Verificación"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Sticky Dynamic Progress Tracker & Category Chips */}
          <ProgressTracker
            totalPoints={metrics.totalPoints}
            evaluatedCount={metrics.evaluatedCount}
            conformePercentage={metrics.conformePercentage}
            parcialCount={metrics.parcialCount}
            noCumpleCount={metrics.noCumpleCount}
            naCount={metrics.naCount}
            criticalCcpCount={metrics.criticalCcpCount}
            categoryCounts={categoryCounts}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Lista de Puntos de Control Sanitarios */}
          <div className="px-margin-mobile flex flex-col gap-space-md mt-space-sm">
            {filteredPoints.map((point) => (
              <RubricControlCard
                key={point.code}
                point={point}
                currentScore={evaluations[point.code]?.score ?? 0}
                currentObservations={evaluations[point.code]?.observations ?? ""}
                currentPhotoUrl={evaluations[point.code]?.photoUrl}
                onScoreChange={(score) => handleScoreChange(point.code, score)}
                onObservationsChange={(obs) => handleObservationsChange(point.code, obs)}
                onPhotoUploaded={(url) => handlePhotoUploaded(point.code, url)}
                onPhotoRemoved={() => handlePhotoRemoved(point.code)}
              />
            ))}
          </div>

          {/* Barra Flutuante de Ação Inferior */}
          <div className="fixed bottom-0 inset-x-0 bg-surface/95 dark:bg-[#0b1120]/95 backdrop-blur-md p-space-sm border-t border-slate-border dark:border-slate-800 z-40 shadow-lg transition-colors">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-space-sm px-margin-mobile">
              <div className="flex flex-col">
                <span className="text-xs text-slate-subtext dark:text-slate-400 font-semibold">Cumplimiento Global:</span>
                <span className="text-lg font-bold text-primary dark:text-emerald-400">{metrics.conformePercentage}% Conforme</span>
              </div>

              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-container dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">draw</span>
                <span>Finalizar y Firmar Auditoría</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Assinaturas */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onConfirm={handleSignaturesConfirm}
      />
    </>
  );
}
