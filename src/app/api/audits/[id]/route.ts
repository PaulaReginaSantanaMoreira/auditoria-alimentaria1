import { NextRequest, NextResponse } from "next/server";
import { GetAuditReportUseCase } from "@/application/use-cases/get-audit-report.use-case";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { SupabaseAuditRepository } from "@/infrastructure/database/supabase/repositories/supabase-audit.repository";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const auditRepo = new SupabaseAuditRepository(supabase);
    const useCase = new GetAuditReportUseCase(auditRepo);

    const result = await useCase.execute(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao buscar auditoria" },
      { status: 404 }
    );
  }
}
