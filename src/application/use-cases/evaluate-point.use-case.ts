import { EvaluatePointInput, EvaluatePointInputSchema, EvaluatePointOutput } from "../dtos/evaluate-point.dto";
import { IAuditRepository } from "../../domain/repositories/audit-repository.interface";
import { EvidencePhoto } from "../../domain/value-objects/evidence-photo";

export class EvaluatePointUseCase {
  constructor(private readonly auditRepository: IAuditRepository) {}

  public async execute(rawInput: EvaluatePointInput): Promise<EvaluatePointOutput> {
    const input = EvaluatePointInputSchema.parse(rawInput);

    const audit = await this.auditRepository.findById(input.auditId);
    if (!audit) {
      throw new Error(`Auditoria não encontrada com ID: '${input.auditId}'`);
    }

    const currentPoint = audit.getEvaluationByCode(input.code);
    if (!currentPoint) {
      throw new Error(`Ponto de controle '${input.code}' não pertence a esta auditoria.`);
    }

    let photo: EvidencePhoto | undefined = currentPoint.evidencePhoto;
    if (input.evidencePhotoUrl) {
      photo = new EvidencePhoto({
        url: input.evidencePhotoUrl,
        timestamp: new Date(),
      });
    }

    currentPoint.updateEvaluation({
      score: input.score,
      observations: input.observations,
      evidencePhoto: photo,
    });

    audit.addOrUpdateEvaluation(currentPoint);
    await this.auditRepository.update(audit);

    const score = audit.recalculateScore();

    return {
      auditId: audit.id,
      code: currentPoint.code,
      score: currentPoint.score,
      observations: currentPoint.observations,
      hasPhoto: Boolean(currentPoint.evidencePhoto),
      currentGlobalScore: score.percentage,
      evaluatedCount: audit.evaluations.length,
      totalPoints: 30,
    };
  }
}
