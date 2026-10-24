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
    expect(courtesyContract.isCourtesy()).toBe(true);
    expect(courtesyContract.isPendingPayment()).toBe(false);
    expect(courtesyContract.isPaid()).toBe(false);
  });

  it("should detect expired offer when paymentDueDate has passed for pending payment", () => {
    // Arrange
    const pastDueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const contract = new SubscriptionContract({
      id: "contract-pending-expired",
      tenantId: "tenant-xyz",
      actionType: "RENEWAL",
      validFrom: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      daysAdded: 30,
      seats: 5,
      paymentStatus: "PENDING_PAYMENT",
      paymentDueDate: pastDueDate,
      createdAt: new Date(),
    });

    // Act & Assert
    expect(contract.isPendingPayment()).toBe(true);
    expect(contract.isOfferExpired()).toBe(true);
  });

  it("should not mark offer as expired when paymentDueDate is in the future", () => {
    // Arrange
    const futureDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days ahead
    const contract = new SubscriptionContract({
      id: "contract-pending-future",
      tenantId: "tenant-xyz",
      actionType: "RENEWAL",
      validFrom: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      daysAdded: 30,
      seats: 5,
      paymentStatus: "PENDING_PAYMENT",
      paymentDueDate: futureDueDate,
      createdAt: new Date(),
    });

    // Act & Assert
    expect(contract.isPendingPayment()).toBe(true);
    expect(contract.isOfferExpired()).toBe(false);
  });

  it("should handle full (TOTAL) refund state and helper methods correctly", () => {
    // Arrange
    const refundedAt = new Date();
    const contract = new SubscriptionContract({
      id: "contract-full-refund",
      tenantId: "tenant-xyz",
      actionType: "RENEWAL",
      validFrom: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      daysAdded: 365,
      seats: 5,
      paymentStatus: "REFUNDED",
      amount: 450,
      refundAmount: 450,
      refundType: "TOTAL",
      refundReason: "Desistimiento legal dentro de plazo de garantía",
      refundedAt,
      createdAt: new Date(),
    });

    // Assert
    expect(contract.paymentStatus).toBe("REFUNDED");
    expect(contract.refundAmount).toBe(450);
    expect(contract.refundType).toBe("TOTAL");
    expect(contract.refundReason).toBe("Desistimiento legal dentro de plazo de garantía");
    expect(contract.refundedAt).toBe(refundedAt);
    expect(contract.isRefunded()).toBe(true);
    expect(contract.isFullyRefunded()).toBe(true);
    expect(contract.isPartiallyRefunded()).toBe(false);
  });

  it("should handle partial (PARTIAL) refund state and helper methods correctly", () => {
    // Arrange
    const refundedAt = new Date();
    const contract = new SubscriptionContract({
      id: "contract-partial-refund",
      tenantId: "tenant-xyz",
      actionType: "RENEWAL",
      validFrom: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      daysAdded: 365,
      seats: 5,
      paymentStatus: "PARTIALLY_REFUNDED",
      amount: 450,
      refundAmount: 150,
      refundType: "PARTIAL",
      refundReason: "Ajuste comercial por reducción acordada de servicios",
      refundedAt,
      createdAt: new Date(),
    });

    // Assert
    expect(contract.paymentStatus).toBe("PARTIALLY_REFUNDED");
    expect(contract.refundAmount).toBe(150);
    expect(contract.refundType).toBe("PARTIAL");
    expect(contract.isRefunded()).toBe(true);
    expect(contract.isFullyRefunded()).toBe(false);
    expect(contract.isPartiallyRefunded()).toBe(true);
  });

  describe("calculateProportionalRefund", () => {
    it("should calculate proportional refund when 2 of 10 days have elapsed", () => {
      // Contratado 10 días a 100 €, utilizados exactamente 2 días
      const validFrom = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const contract = new SubscriptionContract({
        id: "contract-prop-1",
        tenantId: "tenant-xyz",
        actionType: "RENEWAL",
        validFrom,
        expiresAt: new Date(validFrom.getTime() + 10 * 24 * 60 * 60 * 1000),
        daysAdded: 10,
        seats: 1,
        paymentStatus: "PAID",
        amount: 100,
        createdAt: validFrom,
      });

      const asOf = new Date(validFrom.getTime() + 2 * 24 * 60 * 60 * 1000);
      const stats = contract.calculateProportionalRefund(asOf);

      expect(stats.daysTotal).toBe(10);
      expect(stats.daysUsed).toBe(2);
      expect(stats.daysRemaining).toBe(8);
      expect(stats.dailyRate).toBe(10);
      expect(stats.maxProportionalRefund).toBe(80);
    });

    it("should count any fraction of a day as a full day used (half day = 1 full day)", () => {
      // Contratado 10 días a 100 €, utilizado 1 día y 4 horas (1.16 días -> cuenta como 2 días enteros)
      const validFrom = new Date("2026-10-01T00:00:00Z");
      const contract = new SubscriptionContract({
        id: "contract-prop-fraction",
        tenantId: "tenant-xyz",
        actionType: "RENEWAL",
        validFrom,
        expiresAt: new Date(validFrom.getTime() + 10 * 24 * 60 * 60 * 1000),
        daysAdded: 10,
        seats: 1,
        paymentStatus: "PAID",
        amount: 100,
        createdAt: validFrom,
      });

      // 1 día y 4 horas después
      const asOf = new Date(validFrom.getTime() + (1 * 24 + 4) * 60 * 60 * 1000);
      const stats = contract.calculateProportionalRefund(asOf);

      expect(stats.daysUsed).toBe(2);
      expect(stats.daysRemaining).toBe(8);
      expect(stats.maxProportionalRefund).toBe(80);
    });

    it("should return 0 max refundable when all days have elapsed", () => {
      // Contratado 10 días a 100 €, han pasado 12 días
      const validFrom = new Date("2026-10-01T00:00:00Z");
      const contract = new SubscriptionContract({
        id: "contract-prop-expired",
        tenantId: "tenant-xyz",
        actionType: "RENEWAL",
        validFrom,
        expiresAt: new Date(validFrom.getTime() + 10 * 24 * 60 * 60 * 1000),
        daysAdded: 10,
        seats: 1,
        paymentStatus: "PAID",
        amount: 100,
        createdAt: validFrom,
      });

      // 12 días después
      const asOf = new Date(validFrom.getTime() + 12 * 24 * 60 * 60 * 1000);
      const stats = contract.calculateProportionalRefund(asOf);

      expect(stats.daysUsed).toBe(10);
      expect(stats.daysRemaining).toBe(0);
      expect(stats.maxProportionalRefund).toBe(0);
    });

    it("should prevent refunding when contract validity is completely in the past (o que já passou)", () => {
      // Contrato que já passou completamente
      const pastFrom = new Date("2026-01-01T00:00:00Z");
      const pastExp = new Date("2026-01-15T00:00:00Z");
      const contract = new SubscriptionContract({
        id: "contract-past-expired",
        tenantId: "tenant-xyz",
        actionType: "RENEWAL",
        validFrom: pastFrom,
        expiresAt: pastExp,
        daysAdded: 14,
        seats: 2,
        paymentStatus: "PAID",
        amount: 280,
        createdAt: pastFrom,
      });

      const now = new Date("2026-02-01T00:00:00Z");
      const stats = contract.calculateProportionalRefund(now);

      expect(stats.daysRemaining).toBe(0);
      expect(stats.maxProportionalRefund).toBe(0);
    });

    it("should preserve already passed days and allow refund only for remaining future days", () => {
      // Contrato de 30 dias a 300 €, já se passaram 5 dias e 2 horas (conta como 6 dias inteiros)
      const validFrom = new Date("2026-10-01T00:00:00Z");
      const contract = new SubscriptionContract({
        id: "contract-in-progress",
        tenantId: "tenant-xyz",
        actionType: "RENEWAL",
        validFrom,
        expiresAt: new Date(validFrom.getTime() + 30 * 24 * 60 * 60 * 1000),
        daysAdded: 30,
        seats: 2,
        paymentStatus: "PAID",
        amount: 300,
        createdAt: validFrom,
      });

      const asOf = new Date(validFrom.getTime() + (5 * 24 + 2) * 60 * 60 * 1000);
      const stats = contract.calculateProportionalRefund(asOf);

      expect(stats.daysUsed).toBe(6);
      expect(stats.daysRemaining).toBe(24);
      expect(stats.maxProportionalRefund).toBe(240);
    });
  });
});
