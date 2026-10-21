import { z } from "zod";

export const EvaluatePointInputSchema = z.object({
  auditId: z.string().min(1, "ID da auditoria é obrigatório"),
  code: z.string().min(1, "Código do ponto é obrigatório"),
  score: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal("na")]),
  observations: z.string().optional(),
  evidencePhotoUrl: z.string().optional(),
});

export type EvaluatePointInput = z.infer<typeof EvaluatePointInputSchema>;

export interface EvaluatePointOutput {
  auditId: string;
  code: string;
  score: number | "na";
  observations: string;
  hasPhoto: boolean;
  currentGlobalScore: number;
  evaluatedCount: number;
  totalPoints: number;
}
