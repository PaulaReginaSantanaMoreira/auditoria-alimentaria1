"use client";

import React from "react";
import { ControlPointCategory } from "@/domain/entities/control-point";

interface ProgressTrackerProps {
  totalPoints: number;
  evaluatedCount: number;
  conformePercentage: number;
  parcialCount: number;
  noCumpleCount: number;
  naCount?: number;
  criticalCcpCount: number;
  categoryCounts?: {
    infra: number;
    higiene: number;
    appcc: number;
  };
  selectedCategory: "ALL" | ControlPointCategory | "CRITICAL";
  onSelectCategory: (category: "ALL" | ControlPointCategory | "CRITICAL") => void;
}

export function ProgressTracker({
  totalPoints = 30,
  evaluatedCount,
  conformePercentage,
  parcialCount,
  noCumpleCount,
  naCount = 0,
  criticalCcpCount = 3,
  categoryCounts,
  selectedCategory,
  onSelectCategory,
}: ProgressTrackerProps) {
  // Cálculo de circunferencia SVG para radio 15: 2 * PI * 15 ≈ 94.2
  const circumference = 94.2;
  const progressOffset = circumference - (circumference * Math.min(100, conformePercentage)) / 100;

  return (
    <section className="sticky top-16 z-30 bg-surface/95 dark:bg-[#0b1120]/95 backdrop-blur-md px-margin-mobile py-space-xs shadow-sm flex flex-col gap-space-xs max-w-5xl mx-auto w-full transition-colors">
      {/* Progress Metric Card */}
      <div className="bg-surface-container-lowest dark:bg-slate-900/90 p-space-sm rounded-xl flex items-center justify-between gap-space-sm shadow-sm border border-slate-border/50 dark:border-slate-800">
        <div className="flex items-center gap-space-sm min-w-0">
          {/* Circular SVG Graphic */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                className="text-surface-container-high dark:text-slate-800"
                cx="18"
                cy="18"
                fill="none"
                r="15"
                stroke="currentColor"
                strokeWidth="3"
              />
              <circle
                className={
                  conformePercentage >= 80
                    ? "text-status-pass dark:text-emerald-400"
                    : conformePercentage >= 50
                    ? "text-alert-amber dark:text-amber-400"
                    : "text-alert-red dark:text-red-400"
                }
                cx="18"
                cy="18"
                fill="none"
                r="15"
                stroke="currentColor"
                strokeDasharray="94.2"
                strokeDashoffset={progressOffset}
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
            <span className="absolute font-label-md text-label-md font-bold text-on-surface dark:text-slate-100">
              {Math.round(conformePercentage)}%
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-label-lg text-label-lg font-bold text-on-surface dark:text-slate-100">
                {evaluatedCount} de {totalPoints}
              </span>
              <span className="font-label-sm text-label-sm text-slate-subtext dark:text-slate-400">Evaluados</span>
            </div>
            <span className="font-label-sm text-label-sm text-status-pass dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-pass dark:bg-emerald-400" />
              {conformePercentage}% Conforme global
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {parcialCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-alert-amber-bg dark:bg-amber-950/40 text-alert-amber dark:text-amber-300 dark:border dark:border-amber-800/40 font-label-sm text-label-sm font-bold">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                {parcialCount} Parcial
              </span>
            )}
            {noCumpleCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-alert-red-bg dark:bg-red-950/40 text-alert-red dark:text-red-300 dark:border dark:border-red-800/40 font-label-sm text-label-sm font-bold">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {noCumpleCount} No cumple
              </span>
            )}
            {naCount && naCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-surface dark:bg-slate-800 text-slate-dark dark:text-slate-300 font-label-sm text-label-sm font-semibold border border-slate-border dark:border-slate-700">
                {naCount} N/A
              </span>
            ) : null}
            {parcialCount === 0 && noCumpleCount === 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-status-pass-bg dark:bg-emerald-950/50 text-status-pass dark:text-emerald-300 dark:border dark:border-emerald-800/40 font-label-sm text-label-sm font-bold">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                100% Conforme
              </span>
            )}
          </div>
          <span className="font-label-sm text-label-sm text-slate-subtext dark:text-slate-400 mt-0.5">
            {criticalCcpCount} CCPs Verificados
          </span>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => onSelectCategory("ALL")}
          className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md font-semibold shadow-sm flex items-center gap-1 transition-all ${
            selectedCategory === "ALL"
              ? "bg-primary text-on-primary dark:bg-emerald-600 dark:text-white"
              : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:border dark:border-slate-800/80"
          }`}
          type="button"
        >
          <span>Todos</span>
          <span
            className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm ${
              selectedCategory === "ALL"
                ? "bg-primary-container text-on-primary-container dark:bg-emerald-700 dark:text-white"
                : "bg-slate-surface text-slate-subtext dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {totalPoints}
          </span>
        </button>

        <button
          onClick={() => onSelectCategory("INFRAESTRUCTURA")}
          className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md font-medium shadow-sm flex items-center gap-1 transition-all ${
            selectedCategory === "INFRAESTRUCTURA"
              ? "bg-primary text-on-primary dark:bg-emerald-600 dark:text-white"
              : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:border dark:border-slate-800/80"
          }`}
          type="button"
        >
          <span>Infraestructura</span>
          <span
            className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm ${
              selectedCategory === "INFRAESTRUCTURA"
                ? "bg-primary-container text-on-primary-container dark:bg-emerald-700 dark:text-white"
                : "bg-slate-surface text-slate-subtext dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {categoryCounts?.infra ?? 10}
          </span>
        </button>

        <button
          onClick={() => onSelectCategory("HIGIENE_PERSONAL")}
          className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md font-medium shadow-sm flex items-center gap-1 transition-all ${
            selectedCategory === "HIGIENE_PERSONAL"
              ? "bg-primary text-on-primary dark:bg-emerald-600 dark:text-white"
              : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:border dark:border-slate-800/80"
          }`}
          type="button"
        >
          <span>Higiene Personal</span>
          <span
            className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm ${
              selectedCategory === "HIGIENE_PERSONAL"
                ? "bg-primary-container text-on-primary-container dark:bg-emerald-700 dark:text-white"
                : "bg-slate-surface text-slate-subtext dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {categoryCounts?.higiene ?? 10}
          </span>
        </button>

        <button
          onClick={() => onSelectCategory("APPCC_FRIO_PROCESOS")}
          className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md font-medium shadow-sm flex items-center gap-1 transition-all ${
            selectedCategory === "APPCC_FRIO_PROCESOS"
              ? "bg-primary text-on-primary dark:bg-emerald-600 dark:text-white"
              : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:border dark:border-slate-800/80"
          }`}
          type="button"
        >
          <span>APPCC / Frío</span>
          <span
            className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm ${
              selectedCategory === "APPCC_FRIO_PROCESOS"
                ? "bg-primary-container text-on-primary-container dark:bg-emerald-700 dark:text-white"
                : "bg-slate-surface text-slate-subtext dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {categoryCounts?.appcc ?? 10}
          </span>
        </button>

        <button
          onClick={() => onSelectCategory("CRITICAL")}
          className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md font-bold shadow-sm flex items-center gap-1 transition-all ${
            selectedCategory === "CRITICAL"
              ? "bg-alert-red text-white"
              : "bg-alert-red-bg dark:bg-red-950/40 text-alert-red dark:text-red-400 dark:border dark:border-red-900/40 hover:bg-alert-red hover:text-white"
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[15px]">priority_high</span>
          <span>Críticos [!]</span>
        </button>
      </div>
    </section>
  );
}
