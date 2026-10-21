"use client";

import React, { useRef } from "react";
import { EvaluationPointScore } from "@/domain/value-objects/score";
import { ControlPointTemplate } from "@/domain/constants/default-control-points";

interface RubricControlCardProps {
  point: ControlPointTemplate;
  currentScore: EvaluationPointScore;
  currentObservations: string;
  currentPhotoUrl?: string;
  onScoreChange: (score: EvaluationPointScore) => void;
  onObservationsChange: (obs: string) => void;
  onPhotoUploaded: (photoUrl: string) => void;
  onPhotoRemoved: () => void;
}

export function RubricControlCard({
  point,
  currentScore,
  currentObservations,
  currentPhotoUrl,
  onScoreChange,
  onObservationsChange,
  onPhotoUploaded,
  onPhotoRemoved,
}: RubricControlCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onPhotoUploaded(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-space-md shadow-sm border transition-all ${
        point.isCriticalCcp
          ? "border-alert-red/30 bg-alert-red-bg/5"
          : "border-slate-border/50"
      }`}
    >
      {/* Header do Ponto */}
      <div className="flex items-start justify-between gap-space-xs mb-space-xs">
        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="font-label-lg text-label-lg font-bold text-on-surface">
            {point.number}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-surface text-slate-subtext font-medium">
            {point.categoryLabel}
          </span>
          {point.isCriticalCcp && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-alert-red-bg text-alert-red font-label-sm text-label-sm font-bold animate-pulse">
              <span className="material-symbols-outlined text-[14px]">priority_high</span>
              CRÍTICO [CCP]
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-subtext font-mono truncate max-w-[150px]">
          {point.legalReference}
        </span>
      </div>

      {/* Descrição Normativa */}
      <p className="font-body-md text-body-md text-on-surface leading-snug mb-space-sm font-normal">
        {point.title}
      </p>

      {/* Seletor de Avaliação Oficial (0, 1, 2, N/A) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs mb-space-sm">
        <button
          type="button"
          onClick={() => onScoreChange(0)}
          className={`py-2 px-2.5 rounded-lg font-label-md text-label-md font-semibold border flex items-center justify-center gap-1 transition-all ${
            currentScore === 0
              ? "bg-alert-red text-white border-alert-red shadow-sm"
              : "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
          0 - No Cumple
        </button>

        <button
          type="button"
          onClick={() => onScoreChange(1)}
          className={`py-2 px-2.5 rounded-lg font-label-md text-label-md font-semibold border flex items-center justify-center gap-1 transition-all ${
            currentScore === 1
              ? "bg-alert-amber text-slate-dark border-alert-amber shadow-sm"
              : "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">rule</span>
          1 - Parcial
        </button>

        <button
          type="button"
          onClick={() => onScoreChange(2)}
          className={`py-2 px-2.5 rounded-lg font-label-md text-label-md font-semibold border flex items-center justify-center gap-1 transition-all ${
            currentScore === 2
              ? "bg-status-pass text-white border-status-pass shadow-sm"
              : "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">check</span>
          2 - Total
        </button>

        <button
          type="button"
          onClick={() => onScoreChange("na")}
          className={`py-2 px-2.5 rounded-lg font-label-md text-label-md font-semibold border flex items-center justify-center gap-1 transition-all ${
            currentScore === "na"
              ? "bg-slate-dark text-white border-slate-dark shadow-sm"
              : "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">block</span>
          N/A
        </button>
      </div>

      {/* Campo de Observações & Botão de Câmera */}
      <div className="flex flex-col gap-space-xs">
        <textarea
          rows={2}
          value={currentObservations}
          onChange={(e) => onObservationsChange(e.target.value)}
          placeholder={`Observaciones técnicas y no conformidades para el punto ${point.number}...`}
          className="w-full p-2.5 rounded-lg bg-surface-container-low border border-slate-border font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary transition-colors resize-none"
        />

        <div className="flex items-center justify-between">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-surface text-slate-dark hover:bg-slate-border text-label-md font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            <span>{currentPhotoUrl ? "Cambiar Evidencia" : "Añadir Foto"}</span>
          </button>

          {currentPhotoUrl && (
            <button
              type="button"
              onClick={onPhotoRemoved}
              className="text-alert-red hover:underline font-label-sm text-label-sm inline-flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Eliminar foto
            </button>
          )}
        </div>

        {/* Pré-visualização da Foto de Evidência */}
        {currentPhotoUrl && (
          <div className="mt-space-xs relative w-full h-32 rounded-lg overflow-hidden border border-slate-border bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhotoUrl}
              alt={`Evidencia punto ${point.number}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-2 bg-slate-dark/70 text-white px-2 py-0.5 rounded text-[10px] font-mono">
              EVIDENCIA AUDITORÍA
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
