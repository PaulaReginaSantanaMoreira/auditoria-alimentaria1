import { describe, it, expect } from "vitest";
import { SubscriptionPlan } from "../subscription-plan";

describe("SubscriptionPlan Entity (Triple AAA Pattern)", () => {
  it("should create a valid default subscription plan with 7 days and 1 user seat", () => {
    // Arrange
    const props = {
      id: "plan-default",
      name: "Plano Piloto Bonificado",
      code: "TRIAL_7D",
      description: "Plano default de 7 dias",
      durationDays: 7,
      maxUserSeats: 1,
      price: 0,
      currency: "EUR",
      isDefault: true,
      isActive: true,
    };

    // Act
    const plan = new SubscriptionPlan(props);

    // Assert
    expect(plan.id).toBe("plan-default");
    expect(plan.name).toBe("Plano Piloto Bonificado");
    expect(plan.code).toBe("TRIAL_7D");
    expect(plan.durationDays).toBe(7);
    expect(plan.maxUserSeats).toBe(1);
    expect(plan.price).toBe(0);
    expect(plan.isDefault).toBe(true);
    expect(plan.isActive).toBe(true);
  });

  it("should reject creating a plan with non-positive duration or seats", () => {
    // Arrange & Act & Assert
    expect(
      () =>
        new SubscriptionPlan({
          id: "p1",
          name: "Plan Invalido",
          code: "INV",
          durationDays: 0,
          maxUserSeats: 1,
          price: 10,
        })
    ).toThrowError("La duración del plan debe ser superior a 0 días.");

    expect(
      () =>
        new SubscriptionPlan({
          id: "p2",
          name: "Plan Invalido",
          code: "INV2",
          durationDays: 30,
          maxUserSeats: 0,
          price: 10,
        })
    ).toThrowError("El cupo de usuarios debe ser de al menos 1 inspector.");
  });

  it("should update plan attributes properly", () => {
    // Arrange
    const plan = new SubscriptionPlan({
      id: "p-pro",
      name: "Plan Pro",
      code: "PRO",
      durationDays: 30,
      maxUserSeats: 5,
      price: 99,
    });

    // Act
    plan.update({
      name: "Plan Pro Max",
      durationDays: 60,
      maxUserSeats: 8,
      price: 179,
      isActive: false,
    });

    // Assert
    expect(plan.name).toBe("Plan Pro Max");
    expect(plan.durationDays).toBe(60);
    expect(plan.maxUserSeats).toBe(8);
    expect(plan.price).toBe(179);
    expect(plan.isActive).toBe(false);
  });
});
