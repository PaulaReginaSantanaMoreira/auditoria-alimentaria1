"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("auditor@sanidad.es");
  const [password, setPassword] = useState("Admin1234!");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"auditor" | "consultor">("auditor");
  const [isLoading, setIsLoading] = useState(false);

  // Validation States
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({});

  // Password Recovery Modal State
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverSuccess, setRecoverSuccess] = useState(false);
  const [recoverError, setRecoverError] = useState("");

  const validateIdentifier = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    // Email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Spanish NIF/NIE/CIF regex
    const nifCifRegex = /^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$|^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/i;
    return emailRegex.test(trimmed) || nifCifRegex.test(trimmed);
  };

  const validatePassword = (value: string): boolean => {
    return value.length >= 6;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { identifier?: string; password?: string; general?: string } = {};

    if (!validateIdentifier(identifier)) {
      newErrors.identifier = "Introduce un correo válido o NIF/NIE/CIF oficial (ej. auditor@sanidad.es o 12345678Z)";
    }

    if (!validatePassword(password)) {
      newErrors.password = "La clave de acceso debe contener al menos 6 caracteres";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    // Persistir datos de sesión local para demo y modo offline
    try {
      localStorage.setItem(
        "bioaudit_session",
        JSON.stringify({
          identifier: identifier.trim(),
          role: selectedRole,
          loginAt: new Date().toISOString(),
        })
      );
    } catch {
      // Ignorar fallback de storage
    }

    setTimeout(() => {
      setIsLoading(false);
      router.push("/auditorias/nova");
    }, 500);
  };

  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError("");
    if (!validateIdentifier(recoverEmail)) {
      setRecoverError("Por favor introduce un correo electrónico o NIF válido registrado.");
      return;
    }

    setRecoverLoading(true);
    setTimeout(() => {
      setRecoverLoading(false);
      setRecoverSuccess(true);
    }, 800);
  };

  return (
    <main className="flex flex-col flex-1 relative w-full bg-surface pt-safe pb-safe min-h-screen justify-center items-center py-8">
      <div className="flex flex-col w-full px-margin-mobile pb-space-xl max-w-md mx-auto">
        {/* Corporate Header Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm mb-space-lg flex flex-col items-center text-center border border-slate-border/50">
          {/* Emblem */}
          <div className="relative w-16 h-16 rounded-xl bg-status-pass-bg flex items-center justify-center text-primary mb-space-sm shadow-sm">
            <span className="material-symbols-outlined text-[36px]">verified_user</span>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[14px]">lock</span>
            </div>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">BioAudit Pro</h1>
          <p className="font-body-md text-body-md text-slate-subtext mt-0.5">
            Control e Inocuidad Alimentaria Certificada
          </p>
          {/* Inspection Context Tag */}
          <div className="mt-space-sm inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-[16px] text-primary">fact_check</span>
            <span>Portal Oficial de Inspectores & Auditorías Sanitarias</span>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm mb-space-md border border-slate-border/50">
          <form className="flex flex-col gap-space-md" onSubmit={handleLogin} noValidate>
            {/* User / Auditor ID Field */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" htmlFor="auditorIdentifier">
                <span>Identificador Oficial o Correo</span>
                <span className="font-label-sm text-label-sm text-slate-subtext">NIF / NIE / Email</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-subtext pointer-events-none material-symbols-outlined text-[20px]">
                  badge
                </span>
                <input
                  className={`w-full h-12 pl-11 pr-4 bg-surface-container-lowest border rounded-lg font-body-lg text-body-lg text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary shadow-sm transition-all ${
                    errors.identifier ? "border-red-500 bg-red-50/20" : "border-slate-border"
                  }`}
                  id="auditorIdentifier"
                  placeholder="ej. auditor@sanidad.es o 12345678Z"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }));
                  }}
                />
              </div>
              {errors.identifier && (
                <span className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors.identifier}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="passwordField">
                  Clave de Acceso Encriptada
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverEmail(identifier.includes("@") ? identifier : "");
                    setRecoverSuccess(false);
                    setRecoverError("");
                    setIsRecoverModalOpen(true);
                  }}
                  className="font-label-md text-label-md text-primary font-semibold hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-subtext pointer-events-none material-symbols-outlined text-[20px]">
                  key
                </span>
                <input
                  className={`w-full h-12 pl-11 pr-12 bg-surface-container-lowest border rounded-lg font-body-lg text-body-lg text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary shadow-sm transition-all ${
                    errors.password ? "border-red-500 bg-red-50/20" : "border-slate-border"
                  }`}
                  id="passwordField"
                  placeholder="Introduce tu clave de acceso"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
                <button
                  aria-label="Mostrar u ocultar contraseña"
                  className="absolute right-2 w-9 h-9 flex items-center justify-center text-slate-subtext hover:text-on-surface"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Role Selection */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm text-slate-subtext font-semibold uppercase tracking-wider">
                Perfil de Operación
              </span>
              <div className="grid grid-cols-2 gap-space-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRole("auditor")}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    selectedRole === "auditor"
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-slate-border text-on-surface-variant hover:bg-slate-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Inspector Oficial</span>
                    <span className="text-[10px] text-slate-subtext">Actas y Sanciones</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole("consultor")}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    selectedRole === "consultor"
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-slate-border text-on-surface-variant hover:bg-slate-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Consultor / Calidad</span>
                    <span className="text-[10px] text-slate-subtext">Autocontrol APPCC</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="w-full h-12 bg-primary text-on-primary rounded-lg font-title-md text-title-md font-bold hover:bg-primary-container shadow flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                  Validando Credenciales...
                </span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Acceder al Dispositivo de Auditoría</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Links adicionais */}
        <div className="flex items-center justify-between text-xs text-slate-subtext px-2">
          <Link href="/suscripcion" className="hover:text-primary transition-colors">
            Información de Suscripción & Planes
          </Link>
          <span>Normativa CE 852/2004</span>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {isRecoverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">lock_reset</span>
                <h3 className="font-bold text-base text-slate-dark">Recuperar Contraseña</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecoverModalOpen(false)}
                className="text-slate-subtext hover:text-slate-dark text-lg p-1 rounded-full hover:bg-slate-surface"
              >
                ✕
              </button>
            </div>

            {recoverSuccess ? (
              <div className="py-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-status-pass-bg flex items-center justify-center text-status-pass">
                  <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
                </div>
                <h4 className="font-bold text-slate-dark text-base">Instrucciones enviadas</h4>
                <p className="text-xs text-slate-subtext">
                  Hemos enviado un enlace de restablecimiento seguro a <strong>{recoverEmail}</strong>. Por favor,
                  revisa tu bandeja de entrada o carpeta de spam para renovar tu clave de acceso.
                </p>
                <button
                  type="button"
                  onClick={() => setIsRecoverModalOpen(false)}
                  className="mt-3 px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-xs shadow hover:bg-primary-container"
                >
                  Volver al Inicio de Sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverSubmit} className="py-4 flex flex-col gap-4">
                <p className="text-xs text-slate-subtext leading-relaxed">
                  Introduce tu correo corporativo oficial o el NIF/NIE con el que estás dado de alta en el censo de inspectores sanitarios:
                </p>

                <div className="flex flex-col gap-1">
                  <label htmlFor="recoverEmail" className="text-xs font-semibold text-slate-dark">
                    Correo Electrónico o NIF Oficial
                  </label>
                  <input
                    id="recoverEmail"
                    type="text"
                    required
                    placeholder="ej. auditor@sanidad.es"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    className="w-full h-11 px-3.5 border border-slate-border rounded-lg text-sm bg-surface-container-low focus:outline-none focus:border-primary"
                  />
                  {recoverError && <span className="text-xs text-red-600 mt-0.5">{recoverError}</span>}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-border">
                  <button
                    type="button"
                    onClick={() => setIsRecoverModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-slate-surface"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoverLoading}
                    className="px-5 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container flex items-center gap-1 shadow"
                  >
                    {recoverLoading ? (
                      <span>Enviando enlace...</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Enviar Enlace</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
