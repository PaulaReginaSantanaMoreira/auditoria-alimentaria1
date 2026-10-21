import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { success: false, error: "La contraseña actual es obligatoria para validar su identidad." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "La nueva contraseña debe ser diferente de la contraseña actual." },
        { status: 400 }
      );
    }

    // Modo Demo
    if (process.env.NEXT_PUBLIC_APP_MODE === "demo") {
      return NextResponse.json({
        success: true,
        message: "Contraseña actualizada exitosamente (Modo Demo).",
      });
    }

    // 1. Verificar sessão ativa do usuário através dos cookies HTTP
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { success: false, error: "Sesión no válida o expirada. Por favor inicie sesión nuevamente." },
        { status: 401 }
      );
    }

    // 2. Validar se a senha atual está correta tentando autenticar contra o Supabase Auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Error de configuración del servidor de autenticación." },
        { status: 500 }
      );
    }

    const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return NextResponse.json(
        { success: false, error: "La contraseña actual introducida es incorrecta. Verifíquela e intente nuevamente." },
        { status: 400 }
      );
    }

    // 3. Senha antiga validada com sucesso! Atualizar hash no Supabase Auth via Admin Client
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Error al actualizar la contraseña: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tu contraseña ha sido actualizada con éxito.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error interno al procesar el cambio de contraseña." },
      { status: 500 }
    );
  }
}
