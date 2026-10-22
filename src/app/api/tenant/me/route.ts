import { NextRequest, NextResponse } from "next/server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: userAuth, error: authError } = await adminClient.auth.admin.getUserById(session.userId);

    if (authError || !userAuth.user) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const user = userAuth.user;
    const metadata = user.user_metadata || {};

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: metadata.full_name || metadata.name || user.email?.split("@")[0] || "Usuario",
        phone: metadata.phone || user.phone || "",
        documentNumber: metadata.document_number || metadata.cif || metadata.nif || "No registrado",
        role: session.role,
        tenantId: session.tenantId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();

    // REGRA DE SEGURANÇA MANDATÓRIA:
    // O documento de identificação oficial do usuário (DNI / NIE / NIF) só pode ser alterado por SuperAdmin
    if (body.documentNumber !== undefined || body.cif !== undefined || body.nif !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESTRICCIÓN DE SEGURIDAD: El documento identificativo oficial no puede ser modificado por autoservicio. Contacte a un SuperAdministrador para rectificaciones de identidad.",
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { fullName, phone, email } = body;

    const updates: any = {
      user_metadata: {},
    };

    if (fullName !== undefined) {
      updates.user_metadata.full_name = fullName.trim();
    }
    if (phone !== undefined) {
      updates.user_metadata.phone = phone.trim();
    }
    if (email !== undefined && email.trim().toLowerCase() !== session.email?.toLowerCase()) {
      updates.email = email.trim().toLowerCase();
    }

    const { data: updated, error } = await adminClient.auth.admin.updateUserById(
      session.userId,
      updates
    );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado con éxito.",
      user: {
        id: updated.user.id,
        email: updated.user.email,
        fullName: updated.user.user_metadata?.full_name || fullName,
        phone: updated.user.user_metadata?.phone || phone,
        role: session.role,
        tenantId: session.tenantId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
