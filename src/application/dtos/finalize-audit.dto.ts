import { z } from "zod";

export const FinalizeAuditInputSchema = z.object({
  auditId: z.string().min(1, "ID da auditoria é obrigatório"),
  auditorSignatureName: z.string().min(2, "Nome do auditor obrigatório"),
  auditorSignatureDataUrl: z.string().min(10, "Assinatura do auditor obrigatória"),
  auditedSignatureName: z.string().min(2, "Nome do representante auditado obrigatório"),
  auditedSignatureDataUrl: z.string().min(10, "Assinatura do auditado obrigatória"),
});

export type FinalizeAuditInput = z.infer<typeof FinalizeAuditInputSchema>;

export interface FinalizeAuditOutput {
  auditId: string;
  status: string;
  finalScore: number;
  verdict: string;
  verdictDescription: string;
  signedAt: string;
}
