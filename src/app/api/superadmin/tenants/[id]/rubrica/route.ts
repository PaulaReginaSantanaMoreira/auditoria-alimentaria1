import { NextResponse } from "next/server";
import { RubricRepository } from "@/infrastructure/database/repositories/rubric.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const rubricRepo = new RubricRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id } = await params;
    const info = await rubricRepo.getRubricForTenant(id);

    return NextResponse.json({
      success: true,
      rubric: info,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id } = await params;
    const body = await request.json();

    if (!body.templates || !Array.isArray(body.templates)) {
      return NextResponse.json(
        { success: false, error: "A lista de pontos de controle é obrigatória." },
        { status: 400 }
      );
    }

    await rubricRepo.customizeRubricForTenant(id, body.templates);

    const updated = await rubricRepo.getRubricForTenant(id);

    return NextResponse.json({
      success: true,
      message: "Rubrica personalizada gravada com sucesso para o tenant.",
      rubric: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id } = await params;
    await rubricRepo.resetRubricToDefault(id);

    const defaultRubric = await rubricRepo.getRubricForTenant(null);

    return NextResponse.json({
      success: true,
      message: "Rubrica da empresa restaurada para os 30 pontos padrão da plataforma.",
      rubric: defaultRubric,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
