import { IAuditRepository } from "../../domain/repositories/audit-repository.interface";
import { ComplianceCalculatorService, AuditComplianceReport } from "../../domain/services/compliance-calculator.service";
import { Audit } from "../../domain/entities/audit";

export interface GetAuditReportOutput {
  audit: Audit;
  report: AuditComplianceReport;
}

export class GetAuditReportUseCase {
  constructor(private readonly auditRepository: IAuditRepository) {}

  public async execute(auditId: string): Promise<GetAuditReportOutput> {
    const audit = await this.auditRepository.findById(auditId);
    if (!audit) {
      throw new Error(`Auditoria não encontrada: '${auditId}'`);
    }

    const report = ComplianceCalculatorService.calculateReport(audit);

    return {
      audit,
      report,
    };
  }
}
