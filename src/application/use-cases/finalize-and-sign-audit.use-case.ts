import { FinalizeAuditInput, FinalizeAuditInputSchema, FinalizeAuditOutput } from "../dtos/finalize-audit.dto";
import { IAuditRepository } from "../../domain/repositories/audit-repository.interface";
import { Signature } from "../../domain/value-objects/signature";
import { ComplianceCalculatorService } from "../../domain/services/compliance-calculator.service";

export class FinalizeAndSignAuditUseCase {
  constructor(private readonly auditRepository: IAuditRepository) {}

  public async execute(rawInput: FinalizeAuditInput): Promise<FinalizeAuditOutput> {
    const input = FinalizeAuditInputSchema.parse(rawInput);

    const audit = await this.auditRepository.findById(input.auditId);
    if (!audit) {
      throw new Error(`Auditoria não encontrada com ID: '${input.auditId}'`);
    }

    const auditorSignature = new Signature({
      signeeName: input.auditorSignatureName,
      signeeRole: "Auditor",
      signatureDataUrl: input.auditorSignatureDataUrl,
    });

    const auditedSignature = new Signature({
      signeeName: input.auditedSignatureName,
      signeeRole: "Auditado",
      signatureDataUrl: input.auditedSignatureDataUrl,
    });

    audit.sign(auditorSignature, auditedSignature);
    audit.finalize(30);

    await this.auditRepository.update(audit);

    const report = ComplianceCalculatorService.calculateReport(audit);

    return {
      auditId: audit.id,
      status: audit.status,
      finalScore: report.globalPercentage,
      verdict: report.verdict,
      verdictDescription: report.verdictDescription,
      signedAt: audit.updatedAt.toISOString(),
    };
  }
}
