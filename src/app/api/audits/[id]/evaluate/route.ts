import { NextRequest, NextResponse } from "next/server";
import { EvaluatePointUseCase } from "@/application/use-cases/evaluate-point.use-case";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { AuditRepository } from "@/infrastructure/database/repositories/audit.repository";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    const auditRepo = new AuditRepository(supabase);
    const useCase = new EvaluatePointUseCase(auditRepo);

    const result = await useCase.execute({
      ...body,
      auditId: id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao registrar avaliação do ponto" },
      { status: 400 }
    );
  }
}
