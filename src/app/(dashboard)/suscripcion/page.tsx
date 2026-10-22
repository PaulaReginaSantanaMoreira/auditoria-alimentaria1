"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/presentation/components/Header";

export default function SuscripcionPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "enterprise">("pro");

  // SuperAdmin não possui restrições de licença e deve ser redirecionado para o painel master
  useEffect(() => {
    try {
      const session = localStorage.getItem("bioaudit_session");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.role && String(parsed.role).toLowerCase().includes("superadmin")) {
          router.replace("/superadmin");
        }
      }
    } catch {
      // ignore
    }
  }, [router]);

  return (
    <>
      <Header title="BioAudit Pro" subtitle="Suscripción & Licencia" />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full max-w-3xl mx-auto px-margin-mobile">
          {/* Header & Status Lock */}
          <div className="flex flex-col items-center text-center mt-space-sm mb-space-md">
            <div className="relative mb-space-sm">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest shadow-md flex items-center justify-center p-space-xs border border-slate-border">
                <span className="material-symbols-outlined text-[36px] text-primary">verified_user</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-status-pass text-white rounded-full p-1 shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">lock_open</span>
              </div>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-1">
              BioAudit Pro Licensing
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-dark text-slate-surface text-xs font-semibold">
              <span className="material-symbols-outlined text-[14px] text-status-pass">shield_with_heart</span>
              <span className="uppercase tracking-wider">Plan Activo • Certificación Oficial</span>
            </div>
          </div>

          {/* Compliance Banner */}
          <div className="bg-alert-amber-bg/60 dark:bg-amber-950/30 border border-alert-amber/40 dark:border-amber-800/40 rounded-xl p-space-md shadow-sm mb-space-md flex flex-col gap-space-xs">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-alert-amber text-[22px] shrink-0 mt-0.5">
                gpp_maybe
              </span>
              <div className="flex flex-col">
                <p className="font-title-md text-title-md text-on-surface leading-snug font-semibold">
                  Cumplimiento del Marco Normativo Sanitario Europeo
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 leading-relaxed text-xs">
                  Para cumplir con el marco reglamentario (<strong className="text-on-surface">RD 852/2004</strong>, <strong className="text-on-surface">ISO 22000</strong>, <strong className="text-on-surface">IFS</strong>) y garantizar la validez legal del laudo, la trazabilidad de no-conformidades y el sellado temporal de firmas digitales.
                </p>
              </div>
            </div>
          </div>

          {/* Capacidades Desbloqueadas */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm mb-space-md flex flex-col gap-3 border border-slate-border/50">
            <div className="flex items-center justify-between pb-1">
              <span className="font-label-lg text-label-lg text-on-surface font-semibold tracking-tight">
                Capacidades de Campo Certificadas
              </span>
              <span className="px-2 py-0.5 rounded bg-status-pass-bg text-status-pass font-label-sm text-label-sm font-bold">
                4 Módulos
              </span>
            </div>

            <div className="flex items-start gap-3 bg-surface-container-low p-2.5 rounded-lg text-xs">
              <div className="w-7 h-7 rounded-full bg-status-pass-bg text-status-pass flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">checklist</span>
              </div>
              <p className="text-on-surface leading-tight">
                Acceso completo a la <strong>rúbrica interactiva</strong> de 30 puntos de control sanitarios con clasificación automática de CCPs.
              </p>
            </div>

            <div className="flex items-start gap-3 bg-surface-container-low p-2.5 rounded-lg text-xs">
              <div className="w-7 h-7 rounded-full bg-status-pass-bg text-status-pass flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
              </div>
              <p className="text-on-surface leading-tight">
                Captura de <strong>evidencias fotográficas</strong> en tiempo real con georreferenciación y sellado digital inmutable.
              </p>
            </div>

            <div className="flex items-start gap-3 bg-surface-container-low p-2.5 rounded-lg text-xs">
              <div className="w-7 h-7 rounded-full bg-status-pass-bg text-status-pass flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">draw</span>
              </div>
              <p className="text-on-surface leading-tight">
                Panel de <strong>firmas digitales en pantalla táctil</strong> para inspector y auditado garantizando validez jurídica in situ.
              </p>
            </div>

            <div className="flex items-start gap-3 bg-surface-container-low p-2.5 rounded-lg text-xs">
              <div className="w-7 h-7 rounded-full bg-status-pass-bg text-status-pass flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              </div>
              <p className="text-on-surface leading-tight">
                Emisión inmediata de <strong>informe oficial formateado en A4</strong> listo para imprimir, archivar o remitir a la autoridad sanitaria.
              </p>
            </div>
          </div>

          {/* Card de Estado de Licencia y Fecha de Expiración (D+0) */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-slate-border/80 mb-space-md flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-border/60 pb-space-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-status-pass-bg text-status-pass flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[28px]">verified</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-title-md text-title-md font-bold text-slate-dark dark:text-white">
                      Plan Pro Calidad
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-status-pass-bg text-status-pass text-[11px] font-bold border border-status-pass/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-pass animate-pulse" />
                      Activo y Homologado
                    </span>
                  </div>
                  <p className="text-xs text-slate-subtext mt-0.5">
                    Licencia Oficial de Auditoría e Inspección Higiénico-Sanitaria
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-subtext font-semibold uppercase block">Estado de Licencia</span>
                <span className="text-sm font-bold text-primary font-mono">Vigente (D+0)</span>
              </div>
            </div>

            {/* Grid de Metadatos de la Suscripción y Expiración */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-surface/60 p-space-md rounded-xl border border-slate-border/50 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-slate-subtext font-semibold uppercase text-[10px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">event_available</span>
                  Fecha de Activación
                </span>
                <span className="font-bold text-slate-dark">21 de Octubre de 2026</span>
              </div>

              <div className="flex flex-col gap-1 border-y sm:border-y-0 sm:border-x border-slate-border/60 py-2 sm:py-0 sm:px-3">
                <span className="text-slate-subtext font-semibold uppercase text-[10px] flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-[14px]">event_busy</span>
                  Fecha de Expiración
                </span>
                <span className="font-extrabold text-primary text-sm">31 de Diciembre de 2027</span>
                <span className="text-[10px] text-status-pass font-semibold">Renovación anual garantizada</span>
              </div>

              <div className="flex flex-col gap-1 sm:pl-3">
                <span className="text-slate-subtext font-semibold uppercase text-[10px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                  Modalidad de Gestión
                </span>
                <span className="font-bold text-slate-dark">Gestión por Administrador</span>
                <span className="text-[10px] text-slate-subtext">Control centralizado D+0</span>
              </div>
            </div>

            {/* Aviso Informativo D+0 */}
            <div className="p-3 rounded-xl bg-slate-surface text-slate-dark border border-slate-border text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">info</span>
              <p className="leading-relaxed">
                <strong>Aviso de Licenciamiento:</strong> En esta fase inicial (D+0), la asignación, ampliación y renovación de licencias es gestionada de manera centralizada por el Administrador Oficial. Todas las capacidades de auditoría de campo de su cuenta se encuentran plenamente operativas.
              </p>
            </div>
          </div>

          {/* Selector de Planes (Ocultado para D+0 - Preservado íntegro para auto-gestión futura) */}
          <div className="hidden" aria-hidden="true">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {/* Plan 1 */}
              <div
                onClick={() => setSelectedPlan("starter")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPlan === "starter"
                    ? "border-primary bg-primary/5 shadow"
                    : "border-slate-border bg-surface-container-lowest"
                }`}
              >
                <h3 className="font-bold text-sm text-slate-dark">Inspector Autónomo</h3>
                <p className="text-2xl font-extrabold text-primary my-1">
                  29€ <span className="text-xs text-slate-subtext font-normal">/mes</span>
                </p>
                <p className="text-[11px] text-slate-subtext">Hasta 15 auditorías mensuales y almacenamiento básico.</p>
              </div>

              {/* Plan 2 */}
              <div
                onClick={() => setSelectedPlan("pro")}
                className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                  selectedPlan === "pro"
                    ? "border-primary bg-primary/5 shadow"
                    : "border-slate-border bg-surface-container-lowest"
                }`}
              >
                <span className="absolute -top-2.5 right-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  RECOMENDADO
                </span>
                <h3 className="font-bold text-sm text-slate-dark">Plan Pro Calidad</h3>
                <p className="text-2xl font-extrabold text-primary my-1">
                  79€ <span className="text-xs text-slate-subtext font-normal">/mes</span>
                </p>
                <p className="text-[11px] text-slate-subtext">Auditorías ilimitadas, modo offline PWA y soporte APPCC/ISO.</p>
              </div>

              {/* Plan 3 */}
              <div
                onClick={() => setSelectedPlan("enterprise")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPlan === "enterprise"
                    ? "border-primary bg-primary/5 shadow"
                    : "border-slate-border bg-surface-container-lowest"
                }`}
              >
                <h3 className="font-bold text-sm text-slate-dark">Multi-Planta Corp</h3>
                <p className="text-2xl font-extrabold text-primary my-1">
                  199€ <span className="text-xs text-slate-subtext font-normal">/mes</span>
                </p>
                <p className="text-[11px] text-slate-subtext">Múltiples inspectores, API de exportación y soporte prioritario.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Link
              href="/auditorias/nova"
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow hover:bg-primary-container transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">assignment</span>
              <span>Ir al Dispositivo de Auditoría</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
