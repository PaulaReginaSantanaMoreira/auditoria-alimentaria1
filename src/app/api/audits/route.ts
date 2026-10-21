import { NextRequest, NextResponse } from "next/server";
import { CreateAuditUseCase } from "@/application/use-cases/create-audit.use-case";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { SupabaseAuditRepository } from "@/infrastructure/database/supabase/repositories/supabase-audit.repository";
import { SupabaseCompanyRepository } from "@/infrastructure/database/supabase/repositories/supabase-company.repository";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    const auditRepo = new SupabaseAuditRepository(supabase);
    const companyRepo = new SupabaseCompanyRepository(supabase);
    const useCase = new CreateAuditUseCase(auditRepo, companyRepo);

    const result = await useCase.execute(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao criar auditoria" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const auditorId = searchParams.get("auditorId") || "default-auditor";

    const auditRepo = new SupabaseAuditRepository(supabase);
    const audits = await auditRepo.findByAuditorId(auditorId);

    return NextResponse.json(audits, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao listar auditorias" },
      { status: 500 }
    );
  }
}
