"use client";

import React from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, FileText } from "lucide-react";

export function LegalFooter() {
  const openCookiePreferences = () => {
    window.dispatchEvent(new CustomEvent("open-cookie-settings"));
  };

  return (
    <footer className="w-full border-t border-stone-200/80 dark:border-stone-800 bg-white/50 dark:bg-stone-950/50 py-4 px-4 text-xs text-stone-500 dark:text-stone-400 mt-auto print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} BioAudit Pro. Inocuidad y Seguridad Alimentaria.</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/termos-de-uso"
            className="hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Términos del Servicio
          </Link>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <Link
            href="/politica-de-privacidade"
            className="hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Política de Privacidad (GDPR/LGPD)
          </Link>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Cookie className="w-3.5 h-3.5" />
            Configuración de Cookies
          </button>
        </div>
      </div>
    </footer>
  );
}
