"use client";

import React, { useState } from "react";
import { GeneratedCredentialsState } from "../types";

interface CredentialsModalProps {
  credentials: GeneratedCredentialsState | null;
  onClose: () => void;
}

export function CredentialsModal({ credentials, onClose }: CredentialsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const handleCopy = () => {
    const text = `BioAudit Pro - Acceso Oficial\nUsuario: ${credentials.email}\nContraseña Temporal: ${credentials.password}\nRol: ${credentials.role}\nNombre: ${credentials.fullName}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-2xl border border-primary/30 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 text-primary mb-2">
          <span className="material-symbols-outlined text-[28px]">key</span>
          <h3 className="font-title-md text-title-md font-bold text-on-surface">
            {credentials.title}
          </h3>
        </div>

        {credentials.subtitle && (
          <p className="text-xs text-slate-subtext mb-4 leading-relaxed">
            {credentials.subtitle}
          </p>
        )}

        <div className="p-3.5 rounded-xl bg-surface border border-slate-border/80 space-y-2 mb-4 font-mono text-xs">
          <div>
            <span className="text-slate-subtext uppercase font-sans text-[10px] font-bold block">
              Usuario / Correo
            </span>
            <span className="text-on-surface font-bold text-sm">{credentials.email}</span>
          </div>

          <div>
            <span className="text-slate-subtext uppercase font-sans text-[10px] font-bold block">
              Contraseña Temporal
            </span>
            <span className="text-primary font-bold text-base bg-primary/10 px-2 py-0.5 rounded tracking-wider">
              {credentials.password}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-border/50 text-[11px] font-sans">
            <span className="text-slate-subtext">Perfil Asignado:</span>
            <span className="font-bold text-on-surface">{credentials.role}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-sans">
            <span className="text-slate-subtext">Nombre Completo:</span>
            <span className="font-bold text-on-surface">{credentials.fullName}</span>
          </div>
        </div>

        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
          <span>Por motivos de seguridad, esta clave no se volverá a mostrar. Cópiela y envíela al usuario.</span>
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? "check" : "content_copy"}
            </span>
            <span>{copied ? "Copiado" : "Copiar Credenciales"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container shadow-sm cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
