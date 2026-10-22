"use client";

import React, { ReactNode } from "react";
import { useAuthGuard, UseAuthGuardOptions, AuthSession } from "@/presentation/hooks/useAuthGuard";

export interface AuthLoadingScreenProps {
  message?: string;
}

/**
 * Componente visual padronizado e genérico com suporte a Dark Mode e Acessibilidade (WCAG 2.2 / aria-live)
 */
export function AuthLoadingScreen({
  message = "Verificando credenciales...",
}: AuthLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center min-h-screen bg-surface dark:bg-slate-950 transition-colors"
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <span className="text-xs text-slate-subtext dark:text-slate-400 font-medium">
          {message}
        </span>
      </div>
    </div>
  );
}

export interface AuthGuardProps extends UseAuthGuardOptions {
  children: ReactNode | ((session: AuthSession) => ReactNode);
  fallback?: ReactNode;
}

/**
 * Componente wrapper para proteção declarativa de rotas e áreas restritas.
 * Encapsula a validação do hook useAuthGuard e exibe AuthLoadingScreen durante a checagem.
 */
export function AuthGuard({
  children,
  fallback,
  ...guardOptions
}: AuthGuardProps) {
  const { isLoading, isAuthenticated, session } = useAuthGuard(guardOptions);

  if (isLoading || !isAuthenticated || !session) {
    return <>{fallback || <AuthLoadingScreen />}</>;
  }

  if (typeof children === "function") {
    return <>{children(session)}</>;
  }

  return <>{children}</>;
}
