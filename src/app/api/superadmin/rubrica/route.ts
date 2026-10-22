import { NextResponse } from "next/server";
import { RubricRepository } from "@/infrastructure/database/repositories/rubric.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const rubricRepo = new RubricRepository();

export async function GET() {
  try {
    await ensureSuperAdmin();
    const info = await rubricRepo.getRubricForTenant(null, true);

    return NextResponse.json({
      success: true,
      rubric: info,
    });
  } catch (error: any) {
    console.error("Erro ao carregar rubrica base global:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar rubrica base" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSuperAdmin();
    const body = await request.json();

    if (!body.templates || !Array.isArray(body.templates)) {
      return NextResponse.json(
        { success: false, error: "A lista de pontos de controle é obrigatória." },
        { status: 400 }
      );
    }

    await rubricRepo.updateGlobalBaseRubric(body.templates);
    const updated = await rubricRepo.getRubricForTenant(null, true);

    return NextResponse.json({
      success: true,
      message: "Rúbrica base global atualizada com sucesso.",
      rubric: updated,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar rubrica base global:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar rubrica base" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await ensureSuperAdmin();
    await rubricRepo.resetGlobalBaseRubric();
    const defaultRubric = await rubricRepo.getRubricForTenant(null, true);

    return NextResponse.json({
      success: true,
      message: "Rúbrica base restaurada para os 30 pontos padrão da plataforma.",
      rubric: defaultRubric,
    });
  } catch (error: any) {
    console.error("Erro ao restaurar rubrica base global:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao restaurar rubrica base" },
      { status: 500 }
    );
  }
}
