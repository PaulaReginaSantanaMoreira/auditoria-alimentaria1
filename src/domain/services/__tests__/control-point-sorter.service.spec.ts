import { describe, it, expect } from "vitest";
import { ControlPointSorterService } from "../control-point-sorter.service";

describe("ControlPointSorterService (Domain Service)", () => {
  it("should sort items numerically instead of lexicographically (1.10 must be after 1.9, not 1.1)", () => {
    const unsorted = [
      { number: "1.10", title: "Punto Diez" },
      { number: "1.2", title: "Punto Dos" },
      { number: "1.1", title: "Punto Uno" },
      { number: "1.9", title: "Punto Nueve" },
      { number: "2.1", title: "Sección Dos Punto Uno" },
    ];

    const sorted = ControlPointSorterService.sortNaturally(unsorted);

    expect(sorted.map((s) => s.number)).toEqual(["1.1", "1.2", "1.9", "1.10", "2.1"]);
  });

  it("should correctly handle code identifiers with prefix like 'q1_10' and 'q1_2'", () => {
    const unsorted = [
      { code: "q1_10" },
      { code: "q1_1" },
      { code: "q1_2" },
      { code: "q2_5" },
      { code: "q2_1" },
    ];

    const sorted = ControlPointSorterService.sortNaturally(unsorted);

    expect(sorted.map((s) => s.code)).toEqual(["q1_1", "q1_2", "q1_10", "q2_1", "q2_5"]);
  });

  it("should handle control_point_code property gracefully", () => {
    const unsorted = [
      { control_point_code: "q3_10" },
      { control_point_code: "q3_1" },
      { control_point_code: "q3_2" },
    ];

    const sorted = ControlPointSorterService.sortNaturally(unsorted);

    expect(sorted.map((s) => s.control_point_code)).toEqual(["q3_1", "q3_2", "q3_10"]);
  });

  it("should gracefully handle null or undefined identifiers without crashing", () => {
    const items = [
      { number: "1.2" },
      { number: undefined },
      { number: "1.1" },
    ];

    const sorted = ControlPointSorterService.sortNaturally(items);
    expect(sorted.map((s) => s.number)).toEqual([undefined, "1.1", "1.2"]);
  });
});
