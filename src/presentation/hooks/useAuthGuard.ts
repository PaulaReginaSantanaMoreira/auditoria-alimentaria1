"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface AuthSession {
  userId?: string;
  identifier: string;
  role: string;
  tenantId?: string;
  fullName?: string;
  token?: string;
  expiresAt?: number;
  loginAt?: string;
}

export interface UseAuthGuardOptions {
  requiredRole?: string;
  router?: { replace: (url: string) => void; push?: (url: string) => void };
  pathname?: string;
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export function useAuthGuard(options?: UseAuthGuardOptions) {
  let defaultRouter: any = null;
  let defaultPathname = "";

  try {
    defaultRouter = useRouter();
    defaultPathname = usePathname();
  } catch {
    // Context fallback fora do Next Router
  }

  const injectedRouter = options?.router;
  const router = injectedRouter || defaultRouter;
  const pathname = options?.pathname || defaultPathname;
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const performRedirect = (targetUrl: string) => {
    if (injectedRouter?.replace) {
      injectedRouter.replace(targetUrl);
      return;
    }

    if (typeof window !== "undefined") {
      try {
        window.location.replace(targetUrl);
      } catch {
        window.location.href = targetUrl;
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function evaluateAuth() {
      try {
        // 1. Tentar ler do localStorage primeiro (cache rápido para evitar waterfall)
        const rawSession = localStorage.getItem("bioaudit_session");
        if (rawSession) {
          try {
            const parsed: AuthSession = JSON.parse(rawSession);
            const isExpired = parsed.expiresAt ? Date.now() > parsed.expiresAt : false;

            if (!isExpired) {
              if (options?.requiredRole) {
                const userRole = String(parsed.role).toUpperCase();
                const required = options.requiredRole.toUpperCase();
                if (required === "PLATFORM_SUPERADMIN" && !userRole.includes("SUPERADMIN")) {
                  performRedirect("/auditorias/nova?error=unauthorized_role");
                  return;
                }
              }

              if (isMounted) {
                setSession(parsed);
                setIsLoading(false);
              }
              return;
            } else {
              localStorage.removeItem("bioaudit_session");
            }
          } catch {
            localStorage.removeItem("bioaudit_session");
          }
        }

        // 2. Se não estiver no localStorage ou estiver expirado, verificar se existe token válido no cookie via /api/auth/session
        const fetcher =
          options?.fetchFn ||
          (typeof window !== "undefined" ? window.fetch.bind(window) : globalThis.fetch);

        if (typeof fetcher === "function") {
          try {
            const res = await fetcher("/api/auth/session");
            if (res && res.ok) {
              const data = await res.json().catch(() => null);
              if (data && data.authenticated && data.user) {
                const userRole = String(data.user.role || "").toUpperCase();
                const normalizedRole = userRole.includes("SUPERADMIN")
                  ? "PLATFORM_SUPERADMIN"
                  : userRole || "AUDITOR";

                const syncedSession: AuthSession = {
                  userId: data.user.id,
                  identifier: data.user.email || data.user.identifier || "",
                  role: normalizedRole,
                  expiresAt: Date.now() + 24 * 60 * 60 * 1000,
                  loginAt: new Date().toISOString(),
                };

                try {
                  localStorage.setItem("bioaudit_session", JSON.stringify(syncedSession));
                } catch {
                  // ignore storage quota error
                }

                if (options?.requiredRole) {
                  const required = options.requiredRole.toUpperCase();
                  if (required === "PLATFORM_SUPERADMIN" && !normalizedRole.includes("SUPERADMIN")) {
                    performRedirect("/auditorias/nova?error=unauthorized_role");
                    return;
                  }
                }

                if (isMounted) {
                  setSession(syncedSession);
                  setIsLoading(false);
                }
                return;
              }
            }
          } catch {
            // Em caso de erro de rede, prossegue para redirecionar
          }
        }

        // 3. Se não tem token nem sessão válida no cookie/servidor: vai pro login!
        localStorage.removeItem("bioaudit_session");
        const redirectParam = encodeURIComponent(pathname || "/auditorias/nova");
        performRedirect(`/login?redirect=${redirectParam}`);
      } catch {
        localStorage.removeItem("bioaudit_session");
        performRedirect("/login");
      }
    }

    evaluateAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, options?.requiredRole]);

  return { session, isLoading, isAuthenticated: !!session };
}
