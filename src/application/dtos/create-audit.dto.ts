import { z } from "zod";

export const CreateAuditInputSchema = z.object({
  id: z.string().optional(),
  auditorId: z.string().min(1, "O ID do auditor é obrigatório"),
  companyName: z.string().min(2, "O nome da empresa deve ter pelo menos 2 caracteres"),
  companyCif: z.string().min(8, "CIF/NIF obrigatório"),
  companyAddress: z.string().min(3, "Endereço da instalação é obrigatório"),
  sanitaryRegistryNumber: z.string().optional(),
  inspectionDate: z.string().or(z.date()).optional(),
  normativeFramework: z.string().optional(),
  accessScope: z.enum(["TENANT", "CONFIDENTIAL", "PRIVATE"]).optional(),
  tenantId: z.string().nullable().optional(),
  controlPoints: z.array(z.any()).optional(),
});

export type CreateAuditInput = z.infer<typeof CreateAuditInputSchema>;

export interface CreateAuditOutput {
  auditId: string;
  companyId: string;
  inspectionDate: string;
  status: string;
  normativeFramework: string;
  totalControlPoints: number;
}
