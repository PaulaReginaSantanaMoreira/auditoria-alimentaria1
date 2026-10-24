import { CreateAuditInput, CreateAuditInputSchema, CreateAuditOutput } from "../dtos/create-audit.dto";
import { IAuditRepository } from "../../domain/repositories/audit-repository.interface";
import { ICompanyRepository } from "../../domain/repositories/company-repository.interface";
import { Audit } from "../../domain/entities/audit";
import { Company } from "../../domain/entities/company";
import { Auditor } from "../../domain/entities/auditor";
import { ControlPointEvaluation } from "../../domain/entities/control-point";
import { Cif } from "../../domain/value-objects/cif";
import { DEFAULT_CONTROL_POINTS } from "../../domain/constants/default-control-points";

export class CreateAuditUseCase {
  constructor(
    private readonly auditRepository: IAuditRepository,
    private readonly companyRepository: ICompanyRepository
  ) {}

  public async execute(rawInput: CreateAuditInput): Promise<CreateAuditOutput> {
    const input = CreateAuditInputSchema.parse(rawInput);

    const cif = new Cif(input.companyCif);

    // Busca empresa por CIF ou instancia nova
    let company = await this.companyRepository.findByCif(cif.value);
    if (!company) {
      company = new Company({
        id: crypto.randomUUID(),
        name: input.companyName,
        cif,
        address: input.companyAddress,
        sanitaryRegistryNumber: input.sanitaryRegistryNumber,
      });
      await this.companyRepository.save(company);
    }

    const accessScope = input.accessScope ?? "TENANT";
    const isConfidential = accessScope === "CONFIDENTIAL";

    const isUuid = (str?: string) =>
      typeof str === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

    const safeAuditorId = isUuid(input.auditorId)
      ? (input.auditorId as string)
      : crypto.randomUUID();

    // Instancia o Auditor atribuído
    const auditor = new Auditor({
      id: safeAuditorId,
      authUserId: safeAuditorId,
      fullName: isConfidential ? "Administrador Master BioAudit" : "Auditor Oficial BioAudit",
      officialId: isConfidential ? "B-SUPERADMIN" : `B-${safeAuditorId.slice(0, 8).toUpperCase()}`,
      email: input.auditorId && input.auditorId.includes("@") ? input.auditorId : "auditor@sanidad.es",
    });

    const auditId = input.id || crypto.randomUUID();
    const inspectionDate = input.inspectionDate ? new Date(input.inspectionDate) : new Date();

    const audit = new Audit({
      id: auditId,
      company,
      auditor,
      inspectionDate,
      normativeFramework: input.normativeFramework || "Reglamento (CE) 852/2004 · APPCC / ISO 22000",
      accessScope,
    });

    // Inicializa os 30 pontos de controle oficiais na auditoria (padrão 0 - Não Cumpre como precaução)
    for (const template of DEFAULT_CONTROL_POINTS) {
      audit.addOrUpdateEvaluation(
        new ControlPointEvaluation({
          code: template.code,
          title: template.title,
          category: template.category,
          isCriticalCcp: template.isCriticalCcp,
          score: 0,
        })
      );
    }

    // Persiste auditoria completa com seus 30 pontos
    await this.auditRepository.save(audit, { tenantId: input.tenantId });

    return {
      auditId: audit.id,
      companyId: company.id,
      inspectionDate: audit.inspectionDate.toISOString(),
      status: audit.status,
      normativeFramework: audit.normativeFramework,
      totalControlPoints: audit.evaluations.length,
    };
  }
}
