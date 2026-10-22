"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/presentation/components/Header";
import { offlineDb } from "@/infrastructure/offline/offline-audit.db";
import { AuditAccessScope } from "@/domain/security/roles-and-permissions";

interface ActiveDraft {
  id: string;
  companyName: string;
  companyCif: string;
  companyAddress: string;
  sanitaryRegistryNumber?: string;
  scope?: string;
  normative: string;
  updatedAt: string;
  answeredCount?: number;
  accessScope?: AuditAccessScope;
}

export default function NovaAuditoriaPage() {
  const router = useRouter();

  // Active Draft on Device State
  const [activeDraft, setActiveDraft] = useState<ActiveDraft | null>(null);
  const [isCheckingDraft, setIsCheckingDraft] = useState(true);
  const [draftAlertMessage, setDraftAlertMessage] = useState<string | null>(null);

  // Form State (Identificação Oficial)
  const [companyName, setCompanyName] = useState("Alimentos del Valle S.L.");
  const [cif, setCif] = useState("B-84920194");
  const [address, setAddress] = useState("Pol. Ind. Las Nieves, Nave 4, Madrid");
  const [rgseaa, setRgseaa] = useState("RGSEAA 26.04918/M");
  const [scope, setScope] = useState("Planta Completa de Procesado y Envasado");
  const [inspectionDate, setInspectionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const normative = "Reglamento (CE) 852/2004 · APPCC / ISO 22000";
  const [auditorName, setAuditorName] = useState("auditor@sanidad.es");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check on mount if there is an in-progress draft on this device
  useEffect(() => {
    async function checkExistingDraft() {
      try {
        // 1. Check LocalStorage
        const localDraftRaw = localStorage.getItem("bioaudit_active_draft");
        if (localDraftRaw) {
          const parsed = JSON.parse(localDraftRaw);
          setActiveDraft(parsed);
          setIsCheckingDraft(false);
          return;
        }

        // 2. Check IndexedDB offline audits
        const pendingAudits = await offlineDb.audits.where("status").equals("IN_PROGRESS").toArray();
        if (pendingAudits && pendingAudits.length > 0) {
          const lastPending = pendingAudits[pendingAudits.length - 1];
          const evaluatedCount = lastPending.evaluations
            ? Object.values(lastPending.evaluations).filter((e: any) => e.score !== undefined).length
            : 0;

          setActiveDraft({
            id: lastPending.id,
            companyName: lastPending.companyName,
            companyCif: lastPending.companyCif,
            companyAddress: lastPending.companyAddress,
            normative: "Reglamento (CE) 852/2004 · APPCC",
            updatedAt: lastPending.updatedAt || new Date().toISOString(),
            answeredCount: evaluatedCount,
            accessScope: lastPending.accessScope,
          });
        }
      } catch (err) {
        console.error("Error al comprobar borrador local:", err);
      } finally {
        setIsCheckingDraft(false);
      }
    }

    // Carregar usuário logado da sessão se existir
    try {
      const session = localStorage.getItem("bioaudit_session");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.identifier) setAuditorName(parsed.identifier);
        if (parsed.role) {
          const roleLower = String(parsed.role).toLowerCase();
          setIsSuperAdmin(roleLower === "superadmin" || roleLower.includes("superadmin"));
        }
      }
    } catch {
      // Ignorar fallback
    }

    checkExistingDraft();
  }, []);

  // Handler para Continuar a Auditoria em Andamento
  const handleResumeDraft = () => {
    if (!activeDraft) return;
    router.push(
      `/auditorias/${activeDraft.id}/rubrica?company=${encodeURIComponent(
        activeDraft.companyName
      )}&cif=${encodeURIComponent(activeDraft.companyCif)}&address=${encodeURIComponent(
        activeDraft.companyAddress
      )}`
    );
  };

  // Handler para Anular / Descartar a Auditoria em Andamento
  const handleDiscardDraft = async () => {
    if (!activeDraft) return;
    const confirmCancel = window.confirm(
      `¿Está seguro de que desea anular el formulario en curso de "${activeDraft.companyName}"?\nSe cancelará el borrador actual en este dispositivo.`
    );
    if (!confirmCancel) return;

    try {
      // Remover do localStorage
      localStorage.removeItem("bioaudit_active_draft");
      // Remover ou marcar como CANCELLED no IndexedDB
      await offlineDb.audits.delete(activeDraft.id);

      setActiveDraft(null);
      setDraftAlertMessage("Formulario anterior anulado correctamente. Puede iniciar una nueva auditoría.");
      setTimeout(() => setDraftAlertMessage(null), 4000);
    } catch (e) {
      console.error("Error al anular borrador:", e);
      localStorage.removeItem("bioaudit_active_draft");
      setActiveDraft(null);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = "El nombre o razón social de la empresa es obligatorio";
    if (!cif.trim()) errors.cif = "El CIF / NIF oficial es obligatorio";
    if (!address.trim()) errors.address = "La dirección de la instalación es obligatoria";
    if (!rgseaa.trim()) errors.rgseaa = "El número de registro sanitario (RGSEAA) es obligatorio";
    if (!inspectionDate) errors.inspectionDate = "La fecha de inspección es obligatoria";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const newAuditId = crypto.randomUUID();

    // Guardar borrador activo en localStorage para continuidad inmediata
    const accessScope: AuditAccessScope = isSuperAdmin ? "CONFIDENTIAL" : "TENANT";

    const draftPayload: ActiveDraft = {
      id: newAuditId,
      companyName: companyName.trim(),
      companyCif: cif.trim(),
      companyAddress: address.trim(),
      sanitaryRegistryNumber: rgseaa.trim(),
      scope: scope.trim(),
      normative,
      updatedAt: new Date().toISOString(),
      answeredCount: 0,
      accessScope,
    };

    try {
      localStorage.setItem("bioaudit_active_draft", JSON.stringify(draftPayload));

      // Guardar también en IndexedDB local
      await offlineDb.audits.put({
        id: newAuditId,
        companyName: companyName.trim(),
        companyCif: cif.trim(),
        companyAddress: address.trim(),
        inspectionDate,
        status: "IN_PROGRESS",
        evaluations: {},
        accessScope,
        createdByRole: isSuperAdmin ? "PLATFORM_SUPERADMIN" : "AUDITOR",
        createdByEmail: auditorName,
        isSynced: false,
        updatedAt: new Date().toISOString(),
      });

      // Notificar API (con fallback offline transparente)
      try {
        await fetch("/api/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auditorId: auditorName,
            companyName: companyName.trim(),
            companyCif: cif.trim(),
            companyAddress: address.trim(),
            sanitaryRegistryNumber: rgseaa.trim(),
            normativeFramework: normative,
            accessScope,
          }),
        });
      } catch {
        // En modo offline continúa con almacenamiento local
      }

      router.push(
        `/auditorias/${newAuditId}/rubrica?company=${encodeURIComponent(
          companyName.trim()
        )}&cif=${encodeURIComponent(cif.trim())}&address=${encodeURIComponent(address.trim())}`
      );
    } catch (err: any) {
      alert("Error al inicializar la auditoría: " + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header title="BioAudit Pro" subtitle="Identificación Oficial" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-20 bg-surface dark:bg-slate-950 min-h-screen">
        <div className="flex flex-col w-full max-w-3xl mx-auto px-margin-mobile">
          {/* Mensagem de Feedback ao Anular */}
          {draftAlertMessage && (
            <div className="p-3.5 my-2 rounded-xl bg-status-pass-bg border border-status-pass/30 text-status-pass text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{draftAlertMessage}</span>
            </div>
          )}

          {/* Banner de Borrador Activo Detectado */}
          {!isCheckingDraft && activeDraft && (
            <section
              aria-label="Auditoría en curso detectada"
              className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400/80 rounded-2xl p-space-md shadow-md my-space-sm animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <span className="material-symbols-outlined text-[24px]">pending_actions</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                        Formulario en Curso en este Dispositivo
                      </span>
                      {activeDraft.answeredCount !== undefined && activeDraft.answeredCount > 0 && (
                        <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-300/40">
                          {activeDraft.answeredCount} de 30 puntos evaluados
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-dark dark:text-white mt-1 leading-tight">
                      {activeDraft.companyName}
                    </h3>
                    <div className="text-xs text-slate-subtext dark:text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">CIF: {activeDraft.companyCif}</span>
                      <span>•</span>
                      <span>Última modificación: {new Date(activeDraft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones de Continuidad o Anulación */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-3.5 py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Anular Formulario</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResumeDraft}
                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-container text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>Continuar Auditoría</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Encabezado Principal */}
          <section className="bg-surface-container-low p-space-md rounded-2xl shadow-sm border border-slate-border/50 my-space-sm">
            <div className="flex items-center gap-space-xs mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-status-pass-bg text-status-pass font-label-sm text-label-sm uppercase tracking-wider font-bold">
                <span className="material-symbols-outlined text-[14px]">fact_check</span>
                Protocolo de Inspección Sanitaria Oficial
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-dark text-white font-label-sm text-label-sm">
                30 Puntos · 3 CCPs
              </span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Identificación Oficial de la Instalación & Empresa
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              La rúbrica evalúa de forma integral los 3 bloques normativos (Infraestructura, Higiene y APPCC).
              Complete los datos legales del acta antes de iniciar la verificación de campo.
            </p>
          </section>

          {/* Alerta de Modo SuperAdmin Confidencial */}
          {isSuperAdmin && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-200 font-semibold mb-2 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <p className="leading-relaxed">
                <strong>Inspección Sanitaria de Administrador:</strong> Esta auditoría quedará clasificada con visibilidade confidencial. Exclusivamente usted como Administrador Master podrá visualizar sus registros e informes.
              </p>
            </div>
          )}

          {/* Formulario Unificado de Identificación */}
          <form onSubmit={handleStartAudit} className="flex flex-col gap-space-md" noValidate>
            <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-slate-border/50 flex flex-col gap-space-md">
              <h2 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-2 border-b border-slate-border/60 pb-2">
                <span className="material-symbols-outlined text-primary text-[20px]">store</span>
                <span>Datos del Operador Alimentario & Instalación</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {/* Nombre de la Empresa */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="companyNameInput" className="text-xs font-bold text-slate-dark flex justify-between">
                    <span>1.1. Razón Social / Nombre Comercial *</span>
                    <span className="text-slate-subtext font-normal text-[11px]">Obligatorio</span>
                  </label>
                  <input
                    id="companyNameInput"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (formErrors.companyName) setFormErrors((prev) => ({ ...prev, companyName: "" }));
                    }}
                    placeholder="Ej: Matadero Insular de Tenerife / Alimentos del Valle S.L."
                    className={`h-11 px-3 rounded-lg border text-sm bg-surface-container-low focus:outline-none focus:border-primary transition-all ${
                      formErrors.companyName ? "border-red-500 bg-red-50/20" : "border-slate-border"
                    }`}
                  />
                  {formErrors.companyName && (
                    <span className="text-[11px] text-red-600 font-medium">{formErrors.companyName}</span>
                  )}
                </div>

                {/* CIF / NIF */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="cifInput" className="text-xs font-bold text-slate-dark flex justify-between">
                    <span>1.2. CIF / NIF Oficial *</span>
                    <span className="text-slate-subtext font-normal text-[11px]">NIF empresa</span>
                  </label>
                  <input
                    id="cifInput"
                    type="text"
                    required
                    value={cif}
                    onChange={(e) => {
                      setCif(e.target.value);
                      if (formErrors.cif) setFormErrors((prev) => ({ ...prev, cif: "" }));
                    }}
                    placeholder="Ej: B-84920194"
                    className={`h-11 px-3 rounded-lg border text-sm bg-surface-container-low focus:outline-none focus:border-primary font-mono transition-all ${
                      formErrors.cif ? "border-red-500 bg-red-50/20" : "border-slate-border"
                    }`}
                  />
                  {formErrors.cif && (
                    <span className="text-[11px] text-red-600 font-medium">{formErrors.cif}</span>
                  )}
                </div>

                {/* Fecha de la Inspección */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="fechaInput" className="text-xs font-bold text-slate-dark flex justify-between">
                    <span>Fecha Oficial de la Auditoría *</span>
                  </label>
                  <input
                    id="fechaInput"
                    type="date"
                    required
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="h-11 px-3 rounded-lg border border-slate-border text-sm bg-surface-container-low focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Registro Sanitario RGSEAA */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="rgseaaInput" className="text-xs font-bold text-slate-dark flex justify-between">
                    <span>Nº Registro Sanitario (RGSEAA / RSIPAC) *</span>
                    <span className="text-slate-subtext font-normal text-[11px]">Obligatorio</span>
                  </label>
                  <input
                    id="rgseaaInput"
                    type="text"
                    required
                    value={rgseaa}
                    onChange={(e) => {
                      setRgseaa(e.target.value);
                      if (formErrors.rgseaa) setFormErrors((prev) => ({ ...prev, rgseaa: "" }));
                    }}
                    placeholder="Ej: RGSEAA 26.04918/M"
                    className={`h-11 px-3 rounded-lg border text-sm bg-surface-container-low focus:outline-none focus:border-primary transition-all ${
                      formErrors.rgseaa ? "border-red-500 bg-red-50/20" : "border-slate-border"
                    }`}
                  />
                  {formErrors.rgseaa && (
                    <span className="text-[11px] text-red-600 font-medium">{formErrors.rgseaa}</span>
                  )}
                </div>

                {/* Dirección Completa */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label htmlFor="addressInput" className="text-xs font-bold text-slate-dark flex justify-between">
                    <span>1.3. Dirección Física del Establecimiento / Instalación *</span>
                  </label>
                  <input
                    id="addressInput"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: "" }));
                    }}
                    placeholder="Ej: Pol. Ind. Las Nieves, Nave 4, 28000 Madrid / Calle San Francisco, Nº 4, Tenerife"
                    className={`h-11 px-3 rounded-lg border text-sm bg-surface-container-low focus:outline-none focus:border-primary transition-all ${
                      formErrors.address ? "border-red-500 bg-red-50/20" : "border-slate-border"
                    }`}
                  />
                  {formErrors.address && (
                    <span className="text-[11px] text-red-600 font-medium">{formErrors.address}</span>
                  )}
                </div>

                {/* Alcance de Actividad */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label htmlFor="scopeInput" className="text-xs font-bold text-slate-dark">
                    Alcance / Actividades Objeto de Inspección
                  </label>
                  <input
                    id="scopeInput"
                    type="text"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="Ej: Elaboración, envasado y almacenamiento frigorífico de productos cárnicos y derivados"
                    className="h-11 px-3 rounded-lg border border-slate-border text-sm bg-surface-container-low focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* CTA Final: Inicializar Rúbrica */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-subtext">
                <span className="w-2 h-2 rounded-full bg-status-pass" />
                <span>Dispositivo Habilitado para Inspección Offline</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow hover:bg-primary-container flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                    Inicializando Rúbrica de Campo...
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">assignment</span>
                    <span>Abrir Rúbrica Oficial de Inspección (30 Puntos)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
