import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos, rotas internas do Next e favicon
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
    pathname === "/termos-de-uso" ||
    pathname === "/politica-de-privacidade" ||
    pathname === "/api/consent";

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Obter usuário da sessão criptografada
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper para preservar cookies em redirecionamentos do middleware
  const redirectWithCookies = (url: URL | string) => {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => {
      res.cookies.set(c.name, c.value, c);
    });
    return res;
  };

  // 1. Bloqueio de rotas protegidas se o usuário NÃO estiver autenticado
  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado. Faça login primeiro." },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithCookies(loginUrl);
  }

  // Helper para verificar superusuário com máxima confiabilidade
  const checkIsSuperuser = async (userId: string): Promise<boolean> => {
    try {
      const { data: superuser } = await supabase
        .from("platform_superusers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      return !!superuser;
    } catch {
      return false;
    }
  };

  // 2. Proteção estrita de rotas do SuperAdmin (/superadmin e /api/superadmin)
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/api/superadmin")) {
    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "Acesso não autorizado. Faça login primeiro." },
          { status: 401 }
        );
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return redirectWithCookies(loginUrl);
    }

    const isSuper = await checkIsSuperuser(user.id);

    if (!isSuper) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: "Acesso Proibido: Este recurso requer privilégios de SuperAdministrador da plataforma.",
          },
          { status: 403 }
        );
      }

      // Redireciona usuários convencionais para a tela inicial de inspeção
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/auditorias/nova";
      forbiddenUrl.searchParams.set("error", "unauthorized_superadmin");
      return redirectWithCookies(forbiddenUrl);
    }
  }

  // 3. Se o usuário já estiver logado e tentar acessar /login, redirecionar
  if (user && pathname === "/login") {
    const isSuper = await checkIsSuperuser(user.id);
    const redirectParam = request.nextUrl.searchParams.get("redirect");

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";
    if (isSuper) {
      redirectUrl.pathname = "/superadmin";
    } else {
      redirectUrl.pathname = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/auditorias/nova";
    }
    return redirectWithCookies(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
