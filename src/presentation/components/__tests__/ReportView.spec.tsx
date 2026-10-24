import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportView } from "../ReportView";
import { Audit } from "@/domain/entities/audit";
import { Company } from "@/domain/entities/company";
import { Auditor } from "@/domain/entities/auditor";
import { Cif } from "@/domain/value-objects/cif";
import { AuditComplianceReport } from "@/domain/services/compliance-calculator.service";

describe("ReportView Component (Print, PDF & Share Light Mode Enforcement)", () => {
  let mockAudit: Audit;
  let mockReport: AuditComplianceReport;

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-was-dark");

    const company = new Company({
      id: "comp-1",
      name: "Quesos Artesanales S.L.",
      cif: new Cif("B-84920194"),
      address: "Carretera Mayor 10, Nave 2",
    });

    const auditor = new Auditor({
      id: "aud-1",
      authUserId: "auth-1",
      fullName: "Dra. Carmen Rodríguez",
      officialId: "54920182A",
      email: "auditor@sanidad.es",
    });

    mockAudit = new Audit({
      id: "audit-abc-123",
      company,
      auditor,
      inspectionDate: new Date("2026-10-23T10:00:00Z"),
      status: "FINALIZED",
    });

    mockReport = {
      globalPercentage: 95,
      verdict: "FAVORABLE",
      verdictDescription: "Cumplimiento satisfactorio de los requisitos sanitarios.",
      conformeCount: 28,
      parcialCount: 2,
      noCumpleCount: 0,
      totalEvaluated: 30,
      criticalCcpNonCompliances: 0,
      categoryBreakdown: {
        INFRAESTRUCTURA: {
          category: "INFRAESTRUCTURA",
          categoryLabel: "Infraestructura y Equipos",
          obtainedScore: 18,
          maxScore: 20,
          percentage: 90,
          totalPoints: 10,
        },
      },
    };
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-was-dark");
  });

  it("should render official header, company data and verdict", () => {
    render(<ReportView audit={mockAudit} report={mockReport} />);

    expect(screen.getByText("ACTA OFICIAL DE INSPECCIÓN HIGIÉNICO-SANITARIA")).toBeInTheDocument();
    expect(screen.getByText("Quesos Artesanales S.L.")).toBeInTheDocument();
    expect(screen.getByText("DICTAMEN FAVORABLE")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("should temporarily strip dark mode on handlePrint to guarantee light-mode PDF/print output", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    document.documentElement.classList.add("dark");

    render(<ReportView audit={mockAudit} report={mockReport} />);

    const printBtn = screen.getByRole("button", { name: /imprimir \/ guardar pdf/i });
    fireEvent.click(printBtn);

    // Deve desativar a classe dark imediatamente para o diálogo de impressão
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-was-dark")).toBe("true");

    await waitFor(() => {
      expect(printSpy).toHaveBeenCalled();
    });
  });

  it("should generate a share link with ?theme=light and copy to clipboard", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    render(<ReportView audit={mockAudit} report={mockReport} />);

    const shareBtn = screen.getByRole("button", { name: /compartir/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
      const sharedUrl = writeTextSpy.mock.calls[0][0];
      expect(sharedUrl).toContain("theme=light");
    });

    // Deve exibir o toast de feedback de link oficial em modo claro
    expect(
      screen.getByText(/enlace oficial copiado en/i)
    ).toBeInTheDocument();
  });
});
