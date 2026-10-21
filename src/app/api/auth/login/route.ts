import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";

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

    // Modo Demo
    if (process.env.NEXT_PUBLIC_APP_MODE === "demo") {
      return NextResponse.json({
        success: true,
        user: { email: cleanEmail, role: "auditor" },
        redirectTo: "/auditorias/nova",
      });
    }

    // 1. Autenticar usuário via Supabase Auth no servidor (configura cookies HTTP de sessão automaticamente)
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

    const redirectTo = isSuper ? "/superadmin" : "/auditorias/nova";

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: isSuper ? "superadmin" : "auditor",
      },
      redirectTo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error interno al autenticar." },
      { status: 500 }
    );
  }
}
