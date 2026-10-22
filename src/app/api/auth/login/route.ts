import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import { signSessionToken } from "@/infrastructure/security/jwt-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    const cleanEmail = typeof email === "string" ? email.trim() : "";
    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: "Por favor, introduce tu correo electrónico corporativo." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Por favor, introduce tu contraseña." },
        { status: 400 }
      );
    }

    // Modo Demo: Emite JWT assinado oficial de 24h
    if (process.env.NEXT_PUBLIC_APP_MODE === "demo") {
      const isSuper =
        cleanEmail.toLowerCase().includes("superadmin") ||
        cleanEmail.toLowerCase() === "admin@bioauditpro.com";
      const role = isSuper ? "PLATFORM_SUPERADMIN" : "AUDITOR";

      const { token, expiresAt } = await signSessionToken({
        sub: isSuper ? "demo-superadmin-id" : "demo-user-id",
        email: cleanEmail,
        role,
      });

      const res = NextResponse.json({
        success: true,
        token,
        expiresAt,
        user: { id: isSuper ? "demo-superadmin-id" : "demo-user-id", email: cleanEmail, role },
        redirectTo: isSuper ? "/superadmin" : "/auditorias/nova",
      });

      res.cookies.set("bioaudit_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 dia
        path: "/",
      });

      return res;
    }

    // 1. Autenticar usuário via Supabase Auth no servidor
    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user) {
      let errorMessage = "Credenciales de acceso no válidas. Contacte a su administrador.";
      if (authError?.message?.includes("Invalid login credentials")) {
        errorMessage = "Correo o contraseña incorrectos. Verifica tus credenciales.";
      } else if (authError?.message?.includes("Email not confirmed")) {
        errorMessage = "El correo electrónico aún no ha sido confirmado.";
      } else if (authError?.message) {
        errorMessage = authError.message;
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      );
    }

    // 2. Verificar se o usuário autenticado é SuperAdmin da plataforma
    let isSuper = false;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createAdminClient();
        const { data: superuser } = await adminClient
          .from("platform_superusers")
          .select("id")
          .eq("user_id", authData.user.id)
          .maybeSingle();
        isSuper = !!superuser;
      } else {
        const { data: superuser } = await supabase
          .from("platform_superusers")
          .select("id")
          .eq("user_id", authData.user.id)
          .maybeSingle();
        isSuper = !!superuser;
      }
    } catch {
      isSuper = false;
    }

    let role = isSuper ? "PLATFORM_SUPERADMIN" : "AUDITOR";
    let tenantId: string | undefined = undefined;

    // Se não for superadmin, busca perfil de tenant e papel atribuído no Supabase
    if (!isSuper) {
      try {
        const { data: tenantUser } = await supabase
          .from("tenant_users")
          .select("role, tenant_id")
          .eq("user_id", authData.user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (tenantUser) {
          tenantId = tenantUser.tenant_id;
          if (tenantUser.role === "TENANT_ADMIN") role = "TENANT_ADMIN";
          else if (tenantUser.role === "VIEWER") role = "VIEWER";
          else role = "AUDITOR";
        }
      } catch {
        // Fallback para AUDITOR
      }
    }

    const accessScope = isSuper ? "CONFIDENTIAL" : "TENANT";
    const redirectTo = isSuper ? "/superadmin" : "/auditorias/nova";

    // 3. Emissão de JWT corporativo assinado com expiração estrita de 1 dia (24h)
    const { token, expiresAt } = await signSessionToken({
      sub: authData.user.id,
      email: authData.user.email || cleanEmail,
      role,
      tenantId,
      scope: accessScope,
    });

    const response = NextResponse.json({
      success: true,
      token,
      expiresAt,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: isSuper ? "superadmin" : role.toLowerCase(),
        tenantId,
        scope: accessScope,
      },
      redirectTo,
    });

    // 4. Configurar Cookie HTTP-only com garantia de segurança e expiração de 1 dia (86400s)
    response.cookies.set("bioaudit_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 1 dia
      path: "/",
    });

    // 5. Garantir propagação de cookies de autenticação do Supabase (sb-*-auth-token)
    try {
      const cookieStore = await cookies();
      cookieStore.getAll().forEach((c) => {
        if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
          response.cookies.set(c.name, c.value, c);
        }
      });
    } catch {
      // Ignorar caso cookies já tenham sido injetados
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error interno al autenticar." },
      { status: 500 }
    );
  }
}
