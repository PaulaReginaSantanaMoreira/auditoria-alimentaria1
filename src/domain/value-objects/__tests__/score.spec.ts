import { describe, it, expect } from "vitest";
import { Score, AuditVerdict } from "../score";

describe("Score Value Object", () => {
  it("deve calcular a porcentagem corretamente a partir de pontos obtidos e máximos", () => {
    const score = new Score(48, 60);
    expect(score.percentage).toBe(80);
    expect(score.obtainedPoints).toBe(48);
    expect(score.maxPoints).toBe(60);
  });

  it("deve retornar FAVORABLE quando a porcentagem for >= 80% e não houver falhas críticas de CCP", () => {
    const score = new Score(54, 60); // 90%
    const verdict = score.calculateVerdict(false);
    expect(verdict).toBe(AuditVerdict.FAVORABLE);
  });

  it("deve retornar FAVORABLE_CONDITIONAL quando a porcentagem estiver entre 50% e 79%", () => {
    const score = new Score(42, 60); // 70%
    const verdict = score.calculateVerdict(false);
    expect(verdict).toBe(AuditVerdict.FAVORABLE_CONDITIONAL);
  });

  it("deve retornar UNFAVORABLE imediatamente se houver falha (0) em um CCP crítico, mesmo com >80%", () => {
    const score = new Score(58, 60); // 96.67%
    const verdict = score.calculateVerdict(true); // falha em CCP
    expect(verdict).toBe(AuditVerdict.UNFAVORABLE);
  });

  it("deve calcular o Score a partir de uma lista de notas (0, 1, 2)", () => {
    // 3 pontos com nota 2 = 6 obtidos de 6 possíveis (100%)
    const score = Score.fromEvaluationList([2, 2, 2]);
    expect(score.percentage).toBe(100);
    expect(score.obtainedPoints).toBe(6);
    expect(score.maxPoints).toBe(6);
  });
});
