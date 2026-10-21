"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/presentation/components/Header";
import { ProgressTracker } from "@/presentation/components/ProgressTracker";
import { RubricControlCard } from "@/presentation/components/RubricControlCard";
import { SignatureModal } from "@/presentation/components/SignatureModal";
import { DEFAULT_CONTROL_POINTS } from "@/domain/constants/default-control-points";
import { EvaluationPointScore } from "@/domain/value-objects/score";
import { ControlPointCategory } from "@/domain/entities/control-point";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";

export default function RubricaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const auditId = (params?.id as string) || "audit-default";

  // Metadados da empresa
  const companyName = searchParams.get("company") || "Alimentos del Valle S.L.";
  const companyCif = searchParams.get("cif") || "B-84920194";
  const companyAddress = searchParams.get("address") || "Pol. Ind. Las Nieves, Nave 4, Madrid";

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

  const [selectedCategory, setSelectedCategory] = useState<"ALL" | ControlPointCategory | "CRITICAL">("ALL");
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega ou salva réplica no IndexedDB para suporte offline
  useEffect(() => {
    async function initOffline() {
      try {
        const existing = await offlineDb.audits.get(auditId);
        if (existing && existing.evaluations) {
          const loaded: Record<string, { score: EvaluationPointScore; observations: string; photoUrl?: string }> = {};
          for (const [code, val] of Object.entries(existing.evaluations)) {
            loaded[code] = {
              score: val.score as EvaluationPointScore,
              observations: val.observations,
              photoUrl: val.evidencePhotoBase64,
            };
          }
          setEvaluations((prev) => ({ ...prev, ...loaded }));
        }
      } catch {
        // Ignora caso erro no indexeddb
      }
    }
    initOffline();
  }, [auditId]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const list = Object.values(evaluations);
    let totalScore = 0;
    let totalMaxScore = 0;
    let parcialCount = 0;
    let noCumpleCount = 0;
    let naCount = 0;

    for (const item of list) {
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

    return {
      totalPoints: DEFAULT_CONTROL_POINTS.length,
      evaluatedCount: list.length,
      conformePercentage,
      parcialCount,
      noCumpleCount,
      naCount,
      criticalCcpCount: 3,
    };
  }, [evaluations]);

  // Lista filtrada por abas/chips
  const filteredPoints = useMemo(() => {
    if (selectedCategory === "ALL") return DEFAULT_CONTROL_POINTS;
    if (selectedCategory === "CRITICAL") return DEFAULT_CONTROL_POINTS.filter((p) => p.isCriticalCcp);
    return DEFAULT_CONTROL_POINTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

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

      // 3. Salva no banco via API
      try {
        await fetch(`/api/audits/${auditId}/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auditorSignatureName: sigData.auditorName,
            auditorSignatureDataUrl: sigData.auditorSignature,
            auditedSignatureName: sigData.auditedName,
            auditedSignatureDataUrl: sigData.auditedSignature,
          }),
        });
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

  return (
    <>
      <Header title="BioAudit Pro" subtitle="Rúbrica de Campo" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-28 bg-surface min-h-screen">
        <div className="flex flex-col w-full max-w-5xl mx-auto">
          {/* Header Contextual: Datos de Inspección de Campo */}
          <section className="px-margin-mobile pt-space-sm pb-space-xs flex flex-col gap-space-sm">
            <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm border border-slate-border/50 flex flex-col gap-space-sm">
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
              <div className="bg-slate-surface rounded-xl p-space-sm grid grid-cols-2 sm:grid-cols-4 gap-space-xs text-xs">
                <div>
                  <span className="text-slate-subtext uppercase font-semibold block">Empresa Auditada</span>
                  <span className="font-bold text-slate-dark text-sm truncate block">{companyName}</span>
                </div>
                <div>
                  <span className="text-slate-subtext uppercase font-semibold block">CIF / NIF</span>
                  <span className="font-mono text-slate-dark text-sm truncate block">{companyCif}</span>
                </div>
                <div>
                  <span className="text-slate-subtext uppercase font-semibold block">Fecha de Visita</span>
                  <span className="text-slate-dark block font-medium">
                    {new Date().toLocaleDateString("es-ES")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-subtext uppercase font-semibold block">Instalación</span>
                  <span className="text-slate-dark truncate block font-medium" title={companyAddress}>
                    {companyAddress}
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
          <div className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md p-space-sm border-t border-slate-border z-40 shadow-lg">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-space-sm px-margin-mobile">
              <div className="flex flex-col">
                <span className="text-xs text-slate-subtext font-semibold">Cumplimiento Global:</span>
                <span className="text-lg font-bold text-primary">{metrics.conformePercentage}% Conforme</span>
              </div>

              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow hover:bg-primary-container transition-all flex items-center gap-2"
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
