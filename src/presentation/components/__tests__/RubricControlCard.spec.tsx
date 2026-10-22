import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RubricControlCard } from "../RubricControlCard";
import { ControlPointTemplate } from "@/domain/constants/default-control-points";

describe("RubricControlCard Component", () => {
  const mockPoint: ControlPointTemplate = {
    code: "q1_7",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.7",
    title: "Suministro de agua potable y lavamanos de accionamiento no manual.",
    isCriticalCcp: true,
    legalReference: "RD 852/2004 Anexo II Cap. VII",
  };

  it("should render the control point details and critical CCP badge", () => {
    // Arrange & Act
    render(
      <RubricControlCard
        point={mockPoint}
        currentScore={0}
        currentObservations=""
        onScoreChange={vi.fn()}
        onObservationsChange={vi.fn()}
        onPhotoUploaded={vi.fn()}
        onPhotoRemoved={vi.fn()}
      />
    );

    // Assert
    expect(screen.getByText("CRÍTICO [CCP]")).toBeDefined();
    expect(screen.getByText("1.7")).toBeDefined();
    expect(screen.getByText(mockPoint.title)).toBeDefined();
  });

  it("should trigger onScoreChange when a score button is clicked", () => {
    // Arrange
    const handleScoreChange = vi.fn();
    render(
      <RubricControlCard
        point={mockPoint}
        currentScore={0}
        currentObservations=""
        onScoreChange={handleScoreChange}
        onObservationsChange={vi.fn()}
        onPhotoUploaded={vi.fn()}
        onPhotoRemoved={vi.fn()}
      />
    );

    // Act
    const totalScoreButton = screen.getByRole("button", { name: /2 - Total/i });
    fireEvent.click(totalScoreButton);

    // Assert
    expect(handleScoreChange).toHaveBeenCalledWith(2);
  });
});
