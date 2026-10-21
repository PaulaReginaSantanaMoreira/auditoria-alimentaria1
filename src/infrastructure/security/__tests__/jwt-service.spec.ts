import { describe, it, expect } from "vitest";
import { signSessionToken, verifySessionToken } from "../jwt-service";

describe("JWT Service (Compliance & Security)", () => {
  it("deve gerar um JWT assinado com expiração de 1 dia (86400s)", async () => {
    const { token, expiresIn, expiresAt } = await signSessionToken({
      sub: "usr-123",
      email: "inspector@bioauditpro.com",
      role: "AUDITOR",
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(expiresIn).toBe(86400); // 24 horas

    const now = Date.now();
    expect(expiresAt).toBeGreaterThan(now);
    expect(expiresAt - now).toBeLessThanOrEqual(86400 * 1000 + 1000);

    const verified = await verifySessionToken(token);
    expect(verified.sub).toBe("usr-123");
    expect(verified.email).toBe("inspector@bioauditpro.com");
    expect(verified.role).toBe("AUDITOR");
  });

  it("deve rejeitar tokens adulterados com erro de assinatura", async () => {
    const { token } = await signSessionToken({
      sub: "usr-456",
      email: "admin@bioauditpro.com",
      role: "PLATFORM_SUPERADMIN",
    });

    // Adulterar os bytes finais do token
    const tampered = token.slice(0, -5) + "abcde";

    await expect(verifySessionToken(tampered)).rejects.toThrow();
  });
});
