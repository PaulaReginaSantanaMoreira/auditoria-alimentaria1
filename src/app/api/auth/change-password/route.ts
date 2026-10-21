import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword, email } = body;

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

    // 1. Identificar usuário pela sessão HTTP (cookies) ou via email informado
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    const targetEmail = sessionUser?.email || (typeof email === "string" ? email.trim() : null);

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: "Sesión no válida o expirada. Por favor inicie sesión nuevamente." },
        { status: 401 }
      );
    }

    // 2. Validar autenticidade da senha atual no Supabase Auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Error de configuración del servidor de autenticación." },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: verifyError } = await authClient.auth.signInWithPassword({
      email: targetEmail,
      password: currentPassword,
    });

    if (verifyError || !signInData?.user) {
      return NextResponse.json(
        { success: false, error: "La contraseña actual introducida es incorrecta. Verifíquela e intente nuevamente." },
        { status: 400 }
      );
    }

    const verifiedUserId = signInData.user.id;

    // 3. Atualizar a nova senha do usuário
    let updateSuccess = false;
    let updateErrorMessage = "";

    // Tentativa 1: Admin Client via Service Role Key (privilégio total)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient();
        const { error: adminUpdateError } = await adminClient.auth.admin.updateUserById(verifiedUserId, {
          password: newPassword,
        });

        if (!adminUpdateError) {
          updateSuccess = true;
        } else {
          updateErrorMessage = adminUpdateError.message;
        }
      } catch (adminErr: any) {
        updateErrorMessage = adminErr.message;
      }
    }

    // Tentativa 2: Fallback via sessão autenticada do usuário
    if (!updateSuccess) {
      const { error: sessionUpdateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (!sessionUpdateError) {
        updateSuccess = true;
      } else {
        updateErrorMessage = updateErrorMessage || sessionUpdateError.message;
      }
    }

    if (!updateSuccess) {
      return NextResponse.json(
        { success: false, error: `Error al actualizar la contraseña: ${updateErrorMessage || "No autorizado"}` },
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
