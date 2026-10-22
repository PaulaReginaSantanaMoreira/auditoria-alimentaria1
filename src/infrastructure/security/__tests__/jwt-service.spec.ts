import { describe, it, expect } from "vitest";
import { signSessionToken, verifySessionToken } from "../jwt-service";

describe("JWT Service (Compliance & Security)", () => {
  it("should generate a signed JWT with 24-hour expiration", async () => {
    // Arrange
    const payload = {
      sub: "usr-123",
      email: "inspector@bioauditpro.com",
      role: "AUDITOR" as const,
    };

    // Act
    const { token, expiresIn, expiresAt } = await signSessionToken(payload);
    const verified = await verifySessionToken(token);
    const now = Date.now();

    // Assert
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(expiresIn).toBe(86400); // 24 hours
    expect(expiresAt).toBeGreaterThan(now);
    expect(verified.sub).toBe("usr-123");
    expect(verified.email).toBe("inspector@bioauditpro.com");
    expect(verified.role).toBe("AUDITOR");
  });

  it("should reject tampered tokens with signature validation failure", async () => {
    // Arrange
    const { token } = await signSessionToken({
      sub: "usr-456",
      email: "admin@bioauditpro.com",
      role: "PLATFORM_SUPERADMIN",
    });

    // Act
    const tampered = token.slice(0, -5) + "abcde";

    // Assert
    await expect(verifySessionToken(tampered)).rejects.toThrow();
  });
});
