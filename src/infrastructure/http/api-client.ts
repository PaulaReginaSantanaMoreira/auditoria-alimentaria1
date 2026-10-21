/**
 * BIOAUDIT PRO — CLIENTE HTTP AUTENTICADO COM JWT
 * Garante que toda comunicação com a API carregue o token JWT assinado e trate expiração.
 */

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    try {
      const sessionRaw = localStorage.getItem("bioaudit_session");
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        // Verifica se a sessão local não expirou
        if (session.expiresAt && Date.now() > session.expiresAt) {
          localStorage.removeItem("bioaudit_session");
        } else {
          token = session.token || null;
        }
      }
    } catch {
      // Ignora falha de parse
    }
  }

  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Se a API retornar 401 Unauthorized (token expirado ou inválido)
  if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    localStorage.removeItem("bioaudit_session");
    const currentPath = window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  }

  return response;
}
