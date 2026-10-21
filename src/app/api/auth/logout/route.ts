import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let signoutScope: "global" | "local" | "others" = "global";

    try {
      const body = await request.json().catch(() => ({}));
      if (body?.scope === "local" || body?.scope === "others" || body?.scope === "global") {
        signoutScope = body.scope;
      }
    } catch {
      // Sem body JSON
    }

    // 1. Invalidação da sessão ativa no Supabase Auth com alinhamento de escopo (global / local)
    try {
      if (process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
        const supabase = await createServerSupabaseClient();
        await supabase.auth.signOut({ scope: signoutScope });
      }
    } catch {
      // Ignorar caso Supabase esteja offline ou inacessível
    }

    const response = NextResponse.json({
      success: true,
      message: "Sessão invalidada e encerrada com sucesso.",
      scope: signoutScope,
    });

    // 2. Limpar o cookie corporativo assinado bioaudit_token
    response.cookies.set("bioaudit_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      expires: new Date(0),
    });

    // 3. Limpar todos os cookies de sessão do Supabase (sb-*-auth-token)
    cookieStore.getAll().forEach((c) => {
      if (
        c.name.startsWith("sb-") ||
        c.name.includes("auth-token") ||
        c.name === "bioaudit_token"
      ) {
        response.cookies.set(c.name, "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      }
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao encerrar a sessão." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const postRes = await POST(request);
  const url = new URL("/login", request.url);
  const redirectRes = NextResponse.redirect(url);
  postRes.cookies.getAll().forEach((c) => {
    redirectRes.cookies.set(c.name, c.value, c);
  });
  return redirectRes;
}
