import { describe, it, expect } from "vitest";
import { TenantSubscription } from "../subscription";

describe("TenantSubscription Entity", () => {
  it("should create a valid tenant subscription with seat allocations", () => {
    // Arrange
    const validFrom = new Date();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    // Act
    const subscription = new TenantSubscription({
      id: "sub-123",
      tenantId: "tenant-123",
      planTier: "PRO",
      maxUserSeats: 8,
      status: "ACTIVE",
      validFrom,
      expiresAt,
      featureFlags: {
        customRubric: true,
        offlineSync: true,
        exportPdf: true,
        analytics: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Assert
    expect(subscription.maxUserSeats).toBe(8);
    expect(subscription.isActive()).toBe(true);
    expect(subscription.isExpired()).toBe(false);
    expect(subscription.getDaysRemaining()).toBeGreaterThanOrEqual(29);
  });

  it("should reject seat allocation when configured with fewer than 1 seat", () => {
    // Arrange
    const invalidProps = {
      id: "sub-123",
      tenantId: "tenant-123",
      planTier: "STARTER" as const,
      maxUserSeats: 0,
      status: "ACTIVE" as const,
      validFrom: new Date(),
      expiresAt: new Date(Date.now() + 10000),
      featureFlags: {
        customRubric: false,
        offlineSync: true,
        exportPdf: true,
        analytics: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act & Assert
    expect(() => new TenantSubscription(invalidProps)).toThrow("El límite de usuarios/asientos debe ser al menos 1");
  });

  it("should detect expired subscriptions when the expiration date is in the past", () => {
    // Arrange
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

    // Act
    const subscription = new TenantSubscription({
      id: "sub-123",
      tenantId: "tenant-123",
      planTier: "PRO",
      maxUserSeats: 5,
      status: "ACTIVE",
      validFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      expiresAt: pastDate,
      featureFlags: {
        customRubric: true,
        offlineSync: true,
        exportPdf: true,
        analytics: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Assert
    expect(subscription.isExpired()).toBe(true);
    expect(subscription.isActive()).toBe(false);
    expect(subscription.getDaysRemaining()).toBe(0);
  });

  it("should extend subscription validity and update payment status to PENDING_PAYMENT or COURTESY", () => {
    // Arrange
    const initialExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const subscription = new TenantSubscription({
      id: "sub-extend-1",
      tenantId: "tenant-extend",
      planTier: "PRO",
      maxUserSeats: 5,
      status: "ACTIVE",
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiresAt: initialExpiry,
      featureFlags: { customRubric: true, offlineSync: true, exportPdf: true, analytics: true },
      paymentStatus: "PAID",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newTargetExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Act
    subscription.extendValidity(newTargetExpiry, "PENDING_PAYMENT");
    subscription.updateBilling({ invoiceRef: "BOL-2026-990", notes: "Boleto bancário emitido" });

    // Assert
    expect(subscription.expiresAt.getTime()).toBe(newTargetExpiry.getTime());
    expect(subscription.paymentStatus).toBe("PENDING_PAYMENT");
    expect(subscription.invoiceRef).toBe("BOL-2026-990");
    expect(subscription.notes).toBe("Boleto bancário emitido");
  });
});
