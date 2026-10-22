import { describe, it, expect } from "vitest";
import { Score, AuditVerdict } from "../score";

describe("Score Value Object", () => {
  it("should calculate percentage accurately from obtained and maximum points", () => {
    // Arrange & Act
    const score = new Score(48, 60);

    // Assert
    expect(score.percentage).toBe(80);
    expect(score.obtainedPoints).toBe(48);
    expect(score.maxPoints).toBe(60);
  });

  it("should return FAVORABLE when score is >= 80% without critical CCP failures", () => {
    // Arrange
    const score = new Score(54, 60); // 90%

    // Act
    const verdict = score.calculateVerdict(false);

    // Assert
    expect(verdict).toBe(AuditVerdict.FAVORABLE);
  });

  it("should return FAVORABLE_CONDITIONAL when score is between 50% and 79%", () => {
    // Arrange
    const score = new Score(42, 60); // 70%

    // Act
    const verdict = score.calculateVerdict(false);

    // Assert
    expect(verdict).toBe(AuditVerdict.FAVORABLE_CONDITIONAL);
  });

  it("should immediately return UNFAVORABLE when any critical CCP fails, even with >80%", () => {
    // Arrange
    const score = new Score(58, 60); // 96.67%

    // Act
    const verdict = score.calculateVerdict(true); // critical CCP failure

    // Assert
    expect(verdict).toBe(AuditVerdict.UNFAVORABLE);
  });

  it("should construct Score instance from a list of evaluation scores", () => {
    // Arrange & Act
    const score = Score.fromEvaluationList([2, 2, 2]);

    // Assert
    expect(score.percentage).toBe(100);
    expect(score.obtainedPoints).toBe(6);
    expect(score.maxPoints).toBe(6);
  });
});
