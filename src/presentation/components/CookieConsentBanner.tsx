"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cookie, Settings2, Check, X, Info } from "lucide-react";

export interface CookiePreferencesState {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
}

const STORAGE_KEY = "bioaudit_cookie_consent_v1";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferencesState>({
    essential: true,
    analytics: false,
    functional: false,
  });

  useEffect(() => {
    // Check if consent has already been given
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so it animates in smoothly without jarring the page load
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      }
    } catch {
      setIsVisible(true);
    }

    // Allow other components/footer links to trigger opening the cookie banner
    const handleReopen = () => {
      setIsVisible(true);
      setIsCustomizing(true);
    };

    window.addEventListener("open-cookie-settings", handleReopen);
    return () => window.removeEventListener("open-cookie-settings", handleReopen);
  }, []);

  const saveConsent = async (prefs: CookiePreferencesState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      setIsVisible(false);
      setIsCustomizing(false);

      // Async log to backend if reachable
      if (process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
        fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consentType: "COOKIE_POLICY",
            documentVersion: "v1.0",
            acceptedCategories: prefs,
          }),
        }).catch(() => {
          // Silent fallback in case offline or api not mounted yet
        });
      }
    } catch {
      setIsVisible(false);
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, analytics: true, functional: true };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const handleAcceptEssentialOnly = () => {
    const essentials = { essential: true, analytics: false, functional: false };
    setPreferences(essentials);
    saveConsent(essentials);
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Gestión de Privacidad y Cookies"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 md:p-6 pointer-events-none flex justify-center animate-in fade-in slide-in-from-bottom-6 duration-300"
    >
      <div className="pointer-events-auto w-full max-w-4xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 text-stone-800 dark:text-stone-100 transition-all">
        {/* Banner Header */}
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-xl shrink-0">
            <Cookie className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">
                Control de Privacidad y Cookies
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                GDPR &amp; LGPD
              </span>
            </div>

            <p className="mt-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              En <strong>BioAudit Pro</strong> utilizamos cookies técnicas esenciales para garantizar la autenticación segura, la integridad de las auditorías sanitarias y el funcionamiento sin conexión. Opcionalmente, utilizamos cookies para mejorar su experiencia y recopilar estadísticas de rendimiento agregadas de acuerdo con el Reglamento (UE) 2016/679 (RGPD) y la Ley 13.709/2018 (LGPD).
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <Link href="/politica-de-privacidade" className="hover:underline flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Política de Privacidad
              </Link>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <Link href="/termos-de-uso" className="hover:underline flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Términos del Servicio
              </Link>
            </div>
          </div>
        </div>

        {/* Panel de Personalización Granular */}
        {isCustomizing && (
          <div className="mt-5 pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3 animate-in fade-in duration-200">
            {/* 1. Cookies Técnicas Necesarias */}
            <div className="flex items-start justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-900 dark:text-white">
                    Cookies Técnicas y Sanitarias (Esenciales)
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded">
                    Obligatorias
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Imprescindibles para iniciar sesión, gestionar la base de datos local (IndexedDB) y preservar firmas digitales y evidencias de auditoría. No se pueden desactivar.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="mt-1 w-4 h-4 text-emerald-600 rounded cursor-not-allowed opacity-75"
              />
            </div>

            {/* 2. Preferencias y Funcionalidad */}
            <div className="flex items-start justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
              <div className="pr-4">
                <span className="text-sm font-semibold text-stone-900 dark:text-white">
                  Cookies de Preferencias y Personalización
                </span>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Recuerdan su configuración visual, idioma preferido y filtros de auditoría activos para agilizar su trabajo en campo.
                </p>
              </div>
              <input
                type="checkbox"
                id="cookie-functional"
                checked={preferences.functional}
                onChange={(e) =>
                  setPreferences({ ...preferences, functional: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* 3. Analítica y Rendimiento */}
            <div className="flex items-start justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
              <div className="pr-4">
                <span className="text-sm font-semibold text-stone-900 dark:text-white">
                  Cookies de Análisis y Rendimiento
                </span>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Permiten medir métricas anónimas de latencia y tiempos de generación de informes para optimizar la velocidad del sistema.
                </p>
              </div>
              <input
                type="checkbox"
                id="cookie-analytics"
                checked={preferences.analytics}
                onChange={(e) =>
                  setPreferences({ ...preferences, analytics: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200/80 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            {isCustomizing ? "Ocultar configuración" : "Personalizar opciones"}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {isCustomizing ? (
              <button
                type="button"
                onClick={handleSaveCustom}
                className="text-xs sm:text-sm font-medium px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
              >
                Guardar selección
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAcceptEssentialOnly}
                className="text-xs sm:text-sm font-medium px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
              >
                Solo necesarias
              </button>
            )}

            <button
              type="button"
              onClick={handleAcceptAll}
              className="text-xs sm:text-sm font-semibold px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Aceptar todas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
