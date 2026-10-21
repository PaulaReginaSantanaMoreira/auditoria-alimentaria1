import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveSessionAndRole } from "../session-resolver";
import { signSessionToken } from "../jwt-service";
import { NextRequest } from "next/server";

vi.mock("@/infrastructure/database/supabase/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";

describe("Session Resolver (Supabase Session Invalidation & Scope Alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_MODE;
  });

  it("deve autenticar com sucesso quando o JWT é válido e a sessão no Supabase está ativa", async () => {
    const { token } = await signSessionToken({
      sub: "user-abc",
      email: "auditor@bioauditpro.com",
      role: "AUDITOR",
      scope: "TENANT",
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-abc", email: "auditor@bioauditpro.com" } },
          error: null,
        }),
      },
    };
    (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/audits", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const session = await resolveSessionAndRole(req);

    expect(session.isAuthenticated).toBe(true);
    expect(session.userId).toBe("user-abc");
    expect(session.role).toBe("AUDITOR");
    expect(session.scope).toBe("TENANT");
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it("deve alinhar o scope com CONFIDENTIAL para PLATFORM_SUPERADMIN", async () => {
    const { token } = await signSessionToken({
      sub: "user-super",
      email: "master@bioauditpro.com",
      role: "PLATFORM_SUPERADMIN",
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-super", email: "master@bioauditpro.com" } },
          error: null,
        }),
      },
    };
    (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/audits", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const session = await resolveSessionAndRole(req);

    expect(session.isAuthenticated).toBe(true);
    expect(session.role).toBe("PLATFORM_SUPERADMIN");
    expect(session.scope).toBe("CONFIDENTIAL");
  });

  it("deve invalidar a sessão quando ela for revogada no Supabase, mesmo com JWT formalmente válido", async () => {
    const { token } = await signSessionToken({
      sub: "user-revoked",
      email: "auditor@bioauditpro.com",
      role: "AUDITOR",
    });

    // Simula que o Supabase revogou a sessão ativa
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Auth session missing or revoked", status: 401 },
        }),
      },
    };
    (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/audits", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const session = await resolveSessionAndRole(req);

    expect(session.isAuthenticated).toBe(false);
  });

  it("em modo demo, valida o JWT localmente sem consultar o Supabase", async () => {
    process.env.NEXT_PUBLIC_APP_MODE = "demo";

    const { token } = await signSessionToken({
      sub: "demo-user",
      email: "demo@bioauditpro.com",
      role: "AUDITOR",
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };
    (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/audits", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const session = await resolveSessionAndRole(req);

    expect(session.isAuthenticated).toBe(true);
    expect(session.userId).toBe("demo-user");
    expect(session.scope).toBe("TENANT");
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
  });
});
