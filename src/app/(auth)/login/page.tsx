"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/infrastructure/database/supabase/supabase-client";
import { Header } from "@/presentation/components/Header";

export default function LoginPage() {
  const router = useRouter();
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validation & Error States
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
    general?: string;
    success?: string;
  }>({});

  // Password Recovery Modal State
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverSuccess, setRecoverSuccess] = useState(false);
  const [recoverError, setRecoverError] = useState("");

  useEffect(() => {
    // Limpar parâmetros sensíveis expostos por eventual GET
    if (typeof window !== "undefined" && window.location.search) {
      const search = window.location.search;
      if (search.includes("password") || search.includes("identifier")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const mode = process.env.NEXT_PUBLIC_APP_MODE;
    setIsDemoMode(mode === "demo");
    if (mode === "demo") {
      setIdentifier("auditor@bioauditpro.com");
      setPassword("Admin1234!");
    }

    // 1. Validação de Usuário Já Autenticado (Sessão Ativa e Não Expirada)
    const checkActiveSession = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const redirectParam = searchParams.get("redirect");

        // 1.1 Se estiver em modo Demo, validação local é instantânea
        if (mode === "demo") {
          const sessionRaw = localStorage.getItem("bioaudit_session");
          if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            const isExpired = session.expiresAt && Date.now() > session.expiresAt;
            if (isExpired) {
              localStorage.removeItem("bioaudit_session");
            } else if (session.role) {
              const isSuper =
                String(session.role).toLowerCase().includes("superadmin") ||
                session.role === "PLATFORM_SUPERADMIN";
              const targetUrl = isSuper
                ? "/superadmin"
                : redirectParam && redirectParam.startsWith("/") && redirectParam !== "/login"
                ? redirectParam
                : "/auditorias";
              window.location.href = targetUrl;
              return;
            }
          }
        }

        // 1.2 Validação com Supabase e API (timeout de 1.5s para nunca travar o carregamento)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch("/api/auth/session", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            const isSuper =
              String(data.user.role).toLowerCase().includes("superadmin") ||
              data.user.role === "PLATFORM_SUPERADMIN";

            const targetUrl = isSuper
              ? "/superadmin"
              : redirectParam && redirectParam.startsWith("/") && redirectParam !== "/login"
              ? redirectParam
              : "/auditorias";

            window.location.href = targetUrl;
            return;
          } else {
            // Sessão foi invalidada ou revogada no Supabase!
            localStorage.removeItem("bioaudit_session");
          }
        } else {
          // Status 401: sessão expirada ou revogada no Supabase
          localStorage.removeItem("bioaudit_session");
        }
      } catch {
        // Se a validação falhar ou der timeout, usuário permanece na tela de login sem interrupção
      }
    };

    checkActiveSession();
  }, []);

  const validateIdentifier = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  };

  const handleLogin = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const emailEl = document.getElementById("identifier") as HTMLInputElement | null;
    const passwordEl = document.getElementById("password") as HTMLInputElement | null;

    const emailVal = (identifier || emailEl?.value || "").trim();
    const passwordVal = password || passwordEl?.value || "";

    if (!emailVal) {
      setErrors({ general: "Por favor, introduce tu correo electrónico corporativo." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setErrors({
        general: "Formato de correo no válido. Introduce tu dirección completa (ej: auditor@bioauditpro.com).",
      });
      return;
    }

    if (!passwordVal) {
      setErrors({ general: "Por favor, introduce tu contraseña." });
      return;
    }

    if (passwordVal.length < 6) {
      setErrors({ general: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setErrors({});
    setIsLoading(true);

    // Autenticação oficial via API Route (emite cookie httpOnly bioaudit_token assinado)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrors({
          general: data.error || "Credenciales de acceso no válidas. Contacte a su administrador.",
        });
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Salva a sessão com o JWT assinado e expiração de 1 dia
        localStorage.setItem(
          "bioaudit_session",
          JSON.stringify({
            userId: data.user.id,
            identifier: data.user.email,
            role: data.user.role,
            token: data.token,
            expiresAt: data.expiresAt || (Date.now() + 24 * 60 * 60 * 1000),
            loginAt: new Date().toISOString(),
          })
        );
      }

      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");

      const targetUrl =
        data.redirectTo ||
        (redirectParam && redirectParam.startsWith("/") && redirectParam !== "/login"
          ? redirectParam
          : "/auditorias");

      setIsLoading(false);
      window.location.href = targetUrl;
    } catch (err: any) {
      if (isDemoMode) {
        // Fallback de contingência offline em modo demo
        localStorage.setItem(
          "bioaudit_session",
          JSON.stringify({
            identifier: emailVal,
            role: "AUDITOR",
            fullName: "Inspector Oficial Demo",
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            loginAt: new Date().toISOString(),
          })
        );
        document.cookie = "bioaudit_token=demo-token; path=/; max-age=86400; SameSite=Lax";
        setIsLoading(false);
        window.location.href = "/auditorias";
        return;
      }
      setErrors({ general: err.message || "Error al conectar con el servidor de autenticación." });
      setIsLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError("");
    if (!validateIdentifier(recoverEmail)) {
      setRecoverError("Por favor introduce un correo electrónico válido registrado.");
      return;
    }

    setRecoverLoading(true);

    if (isDemoMode) {
      setTimeout(() => {
        setRecoverLoading(false);
        setRecoverSuccess(true);
      }, 600);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(recoverEmail.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      setRecoverLoading(false);
      if (error) {
        setRecoverError(error.message);
      } else {
        setRecoverSuccess(true);
      }
    } catch (err: any) {
      setRecoverLoading(false);
      setRecoverError(err.message || "Error al procesar recuperación.");
    }
  };

  

  return (
    <>
      <Header title="BioAudit Pro" subtitle="Acceso Corporativo" planActive={false} />
      <main className="flex flex-col flex-1 relative w-full bg-surface dark:bg-slate-950 pt-24 pb-safe min-h-screen justify-center items-center py-8 transition-colors duration-150">
      <div className="flex flex-col w-full px-margin-mobile pb-space-xl max-w-md mx-auto">
        {/* Corporate Header Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-space-md flex flex-col items-center text-center border border-slate-border">
          {/* Emblem */}
          <div className="relative w-16 h-16 rounded-2xl bg-status-pass-bg flex items-center justify-center text-primary mb-space-sm shadow-sm">
            <span className="material-symbols-outlined text-[36px]">verified_user</span>
            <div className="absolute -bottom-1 -right-1 bg-status-pass text-white rounded-full p-1 shadow-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">lock</span>
            </div>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            BioAudit Pro
          </h1>
          <span className="font-label-sm text-label-sm text-slate-subtext uppercase tracking-wider mt-0.5">
            Control Oficial e Inocuidad Alimentaria
          </span>

          <div className="mt-space-sm inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm border border-slate-border/50">
            <span className="material-symbols-outlined text-[14px] text-primary">policy</span>
            <span>Reglamento (CE) 852/2004 • ISO 22000</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-slate-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLogin(e);
            }}
            action="javascript:void(0);"
            method="POST"
            noValidate
            className="flex flex-col gap-space-md"
          >
            {/* Mensagem de Erro Geral */}
            {errors.general && (
              <div className="p-space-sm bg-alert-red-bg/25 border border-alert-red/30 rounded-xl flex items-start gap-2 text-alert-red font-label-md text-label-md animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                <span>{errors.general}</span>
              </div>
            )}

            {/* Identificador / Email */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md font-bold text-on-surface" htmlFor="identifier">
                Correo Electrónico Corporativo
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-subtext text-[20px] pointer-events-none">
                  mail
                </span>
                <input
                  id="identifier"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLogin();
                    }
                  }}
                  placeholder="auditor@bioauditpro.com"
                  className="w-full h-11 pl-10 pr-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              {errors.identifier && (
                <span className="text-alert-red font-label-sm text-label-sm mt-0.5">{errors.identifier}</span>
              )}
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md font-bold text-on-surface" htmlFor="password">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => { setIsRecoverModalOpen(true); setRecoverSuccess(false); setRecoverError(""); }}
                  className="text-primary hover:underline font-label-sm text-label-sm font-semibold cursor-pointer"
                >
                  ¿Olvidaste tu clave?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-subtext text-[20px] pointer-events-none">
                  key
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLogin();
                    }
                  }}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-subtext hover:text-on-surface transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <span className="text-alert-red font-label-sm text-label-sm mt-0.5">{errors.password}</span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary text-white font-title-sm text-title-sm font-bold shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-space-xs disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  <span>Autenticando credenciales...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Autenticar y Acceder</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Modal de Recuperação */}
      {isRecoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-space-sm">
              <h2 className="font-title-md text-title-md text-on-surface font-bold">
                Recuperar Contraseña
              </h2>
              <button
                type="button"
                onClick={() => setIsRecoverModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {recoverSuccess ? (
              <div className="text-center py-space-sm">
                <span className="material-symbols-outlined text-status-pass text-[48px] mb-2">check_circle</span>
                <p className="text-body-sm text-on-surface font-semibold">Enlace de recuperación enviado</p>
                <p className="text-label-sm text-slate-subtext mt-1">Revisa tu bandeja de correo para reestablecer tu contraseña.</p>
                <button
                  type="button"
                  onClick={() => setIsRecoverModalOpen(false)}
                  className="mt-4 w-full h-10 rounded-xl bg-primary text-white font-semibold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverSubmit} className="space-y-4">
                <p className="text-body-sm text-slate-subtext">
                  Introduce tu correo registrado para recibir las instrucciones de restablecimiento.
                </p>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@sanidad.es"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  className="w-full h-11 px-space-sm rounded-xl bg-surface border border-slate-border text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {recoverError && <p className="text-xs text-alert-red">{recoverError}</p>}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRecoverModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoverLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container cursor-pointer"
                  >
                    {recoverLoading ? "Enviando..." : "Enviar Enlace"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
    </>
  );
}
