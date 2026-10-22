import { describe, it, expect } from "vitest";
import { SubscriptionContract } from "../subscription-contract";

describe("SubscriptionContract Entity", () => {
  it("should record a valid subscription renewal event with financial details", () => {
    // Arrange
    const validFrom = new Date();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const createdAt = new Date();

    // Act
    const contract = new SubscriptionContract({
      id: "contract-001",
      tenantId: "tenant-abc",
      subscriptionId: "sub-abc",
      actionType: "RENEWAL",
      validFrom,
      expiresAt,
      daysAdded: 365,
      seats: 10,
      paymentStatus: "PENDING_PAYMENT",
      amount: 1200.5,
      invoiceRef: "BOL-2026-8812",
      notes: "Renovação contratual anual com boleto pendente 30 dias",
      createdBy: "superadmin@bioaudit.pro",
      createdAt,
    });

    // Assert
    expect(contract.id).toBe("contract-001");
    expect(contract.tenantId).toBe("tenant-abc");
    expect(contract.actionType).toBe("RENEWAL");
    expect(contract.daysAdded).toBe(365);
    expect(contract.seats).toBe(10);
    expect(contract.paymentStatus).toBe("PENDING_PAYMENT");
    expect(contract.amount).toBe(1200.5);
    expect(contract.invoiceRef).toBe("BOL-2026-8812");
    expect(contract.notes).toBe("Renovação contratual anual com boleto pendente 30 dias");
    expect(contract.createdBy).toBe("superadmin@bioaudit.pro");
  });

  it("should support courtesy bonus contracts without financial amount", () => {
    // Arrange
    const validFrom = new Date();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // Act
    const courtesyContract = new SubscriptionContract({
      id: "contract-courtesy",
      tenantId: "tenant-xyz",
      actionType: "MANUAL_ADJUSTMENT",
      validFrom,
      expiresAt,
      daysAdded: 90,
      seats: 5,
      paymentStatus: "COURTESY",
      notes: "Período bonificado como cortesia comercial de implantação",
      createdBy: "commercial@bioaudit.pro",
      createdAt: new Date(),
    });

    // Assert
    expect(courtesyContract.paymentStatus).toBe("COURTESY");
    expect(courtesyContract.amount).toBeUndefined();
    expect(courtesyContract.daysAdded).toBe(90);
  });
});
