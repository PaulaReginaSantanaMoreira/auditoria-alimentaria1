import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/infrastructure/security/jwt-service";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos, rotas internas do Next e assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/icons") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // Se estiver no modo demo (offline/mock), permitir navegação
  if (process.env.NEXT_PUBLIC_APP_MODE === "demo") {
    return NextResponse.next();
  }

  // Rotas públicas que não requerem autenticação
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/session" ||
    pathname === "/api/auth/logout" ||
    pathname === "/termos-de-uso" ||
    pathname === "/politica-de-privacidade" ||
    pathname === "/api/consent";

  let response = NextResponse.next({
    request,
  });

  // Helper para preservar cookies em redirecionamentos do middleware
  const redirectWithCookies = (url: URL | string) => {
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => {
      res.cookies.set(c.name, c.value, c);
    });
    return res;
  };

  // 1. Verificar se existe JWT corporativo assinado (bioaudit_token)
  const bioauditToken = request.cookies.get("bioaudit_token")?.value;
  let verifiedJwtUser: { id: string; email: string; role: string } | null = null;

  if (bioauditToken) {
    try {
      const payload = await verifySessionToken(bioauditToken);
      verifiedJwtUser = {
        id: payload.sub,
        email: payload.email,
        role: String(payload.role),
      };
    } catch {
      // Token expirado ou adulterado - remover cookie
      response.cookies.delete("bioaudit_token");
    }
  }

  // 2. Validação da sessão com o Supabase Auth (caso configurado)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabaseUser = null;
  let supabase = null;

  if (supabaseUrl && supabaseAnonKey) {
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        // Se o Supabase informou erro ou o usuário não foi encontrado
        // e o cliente possuía cookies sb-* ou bioauditToken, a sessão foi ativamente invalidada no Supabase!
        const hasSupabaseCookies = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
        if (hasSupabaseCookies || error) {
          verifiedJwtUser = null;
          response.cookies.delete("bioaudit_token");
        }
      } else {
        supabaseUser = data.user;
      }
    } catch {
      // Falha transitória de rede (modo contingência offline)
    }
  }

  const currentUser = verifiedJwtUser || supabaseUser;

  // 3. Se usuário autenticado tentar acessar /login, redirecionar com base na role
  if (currentUser && pathname === "/login") {
    let isSuper = false;
    if (verifiedJwtUser) {
      isSuper =
        verifiedJwtUser.role === "PLATFORM_SUPERADMIN" ||
        verifiedJwtUser.role.toLowerCase().includes("superadmin");
    } else if (supabase && supabaseUser) {
      try {
        const { data: superuser } = await supabase
          .from("platform_superusers")
          .select("id")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();
        isSuper = !!superuser;
      } catch {
        isSuper = false;
      }
    }

    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";

    if (isSuper) {
      redirectUrl.pathname = "/superadmin";
    } else {
      redirectUrl.pathname =
        redirectParam && redirectParam.startsWith("/") && redirectParam !== "/login"
          ? redirectParam
          : "/auditorias/nova";
    }
    return redirectWithCookies(redirectUrl);
  }

  // 4. Bloqueio de rotas protegidas se NÃO autenticado
  if (!currentUser && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado. Sessão expirada ou não autenticada." },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithCookies(loginUrl);
  }

  // 5. Proteção de rotas do SuperAdmin (/superadmin e /api/superadmin)
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/api/superadmin")) {
    let isSuper = false;
    if (verifiedJwtUser) {
      isSuper =
        verifiedJwtUser.role === "PLATFORM_SUPERADMIN" ||
        verifiedJwtUser.role.toLowerCase().includes("superadmin");
    } else if (supabase && supabaseUser) {
      try {
        const { data: superuser } = await supabase
          .from("platform_superusers")
          .select("id")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();
        isSuper = !!superuser;
      } catch {
        isSuper = false;
      }
    }

    if (!isSuper) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: "Acesso Proibido: Este recurso requer privilégios de SuperAdministrador.",
          },
          { status: 403 }
        );
      }
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/auditorias/nova";
      forbiddenUrl.searchParams.set("error", "unauthorized_superadmin");
      return redirectWithCookies(forbiddenUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
