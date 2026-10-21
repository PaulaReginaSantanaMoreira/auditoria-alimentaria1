import { describe, it, expect } from "vitest";
import { TenantSubscription } from "../subscription";

describe("TenantSubscription Entity", () => {
  it("debe crear una subscripción de tenant con sus límites de asientos", () => {
    const validFrom = new Date();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

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

    expect(subscription.maxUserSeats).toBe(8);
    expect(subscription.isActive()).toBe(true);
    expect(subscription.isExpired()).toBe(false);
    expect(subscription.getDaysRemaining()).toBeGreaterThanOrEqual(29);
  });

  it("debe rechazar asientos menores a 1", () => {
    expect(() => {
      new TenantSubscription({
        id: "sub-123",
        tenantId: "tenant-123",
        planTier: "STARTER",
        maxUserSeats: 0,
        status: "ACTIVE",
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
      });
    }).toThrow("El límite de usuarios/asientos debe ser al menos 1");
  });

  it("debe detectar expiración de suscripción pasada la fecha límite", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Ayer

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

    expect(subscription.isExpired()).toBe(true);
    expect(subscription.isActive()).toBe(false);
    expect(subscription.getDaysRemaining()).toBe(0);
  });
});
