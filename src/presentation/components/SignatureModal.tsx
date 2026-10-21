"use client";

import React, { useRef, useState, useEffect } from "react";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    auditorName: string;
    auditorSignature: string;
    auditedName: string;
    auditedSignature: string;
  }) => void | Promise<void>;
  defaultAuditorName?: string;
  defaultAuditedName?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onConfirm,
  defaultAuditorName = "Carmen Rodríguez (Auditor Oficial)",
  defaultAuditedName = "Representante Legal de la Empresa",
}: SignatureModalProps) {
  const [auditorName, setAuditorName] = useState(defaultAuditorName);
  const [auditedName, setAuditedName] = useState(defaultAuditedName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasAuditorRef = useRef<HTMLCanvasElement>(null);
  const canvasAuditadoRef = useRef<HTMLCanvasElement>(null);

  const [isAuditorSigned, setIsAuditorSigned] = useState(false);
  const [isAuditedSigned, setIsAuditedSigned] = useState(false);

  // Reset do estado de submissão e erros ao abrir
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Inicializa canvas listeners
  useEffect(() => {
    if (!isOpen) return;

    const setupCanvas = (
      canvas: HTMLCanvasElement | null,
      onSignedChange: (val: boolean) => void
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      let drawing = false;

      const getPos = (e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        if ("touches" in e) {
          const touch = e.touches[0];
          return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
          };
        }
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      };

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        drawing = true;
        setErrorMessage(null);
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
      };

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        onSignedChange(true);
        e.preventDefault();
      };

      const stopDrawing = () => {
        drawing = false;
      };

      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("mousemove", draw);
      window.addEventListener("mouseup", stopDrawing);

      canvas.addEventListener("touchstart", startDrawing, { passive: false });
      canvas.addEventListener("touchmove", draw, { passive: false });
      window.addEventListener("touchend", stopDrawing);
    };

    setupCanvas(canvasAuditorRef.current, setIsAuditorSigned);
    setupCanvas(canvasAuditadoRef.current, setIsAuditedSigned);
  }, [isOpen]);

  const clearCanvas = (
    canvas: HTMLCanvasElement | null,
    setSigned: (val: boolean) => void
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    setErrorMessage(null);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!auditorName.trim()) {
      setErrorMessage("Por favor, introduzca el nombre oficial del inspector o auditor.");
      return;
    }

    if (!auditedName.trim()) {
      setErrorMessage("Por favor, introduzca el nombre y cargo del responsable del establecimiento.");
      return;
    }

    if (!isAuditorSigned && !isAuditedSigned) {
      setErrorMessage("Por favor, asegúrese de que ambas firmas han sido rubricadas en pantalla antes de emitir el laudo.");
      return;
    }

    if (!isAuditorSigned) {
      setErrorMessage("Falta la firma del inspector oficial. Dibuje la rúbrica en el primer panel táctil.");
      return;
    }

    if (!isAuditedSigned) {
      setErrorMessage("Falta la firma del responsable del establecimiento. Dibuje la rúbrica en el segundo panel táctil.");
      return;
    }

    setIsSubmitting(true);

    try {
      const sigAuditor = canvasAuditorRef.current?.toDataURL("image/png") || "";
      const sigAuditado = canvasAuditadoRef.current?.toDataURL("image/png") || "";

      await Promise.resolve(
        onConfirm({
          auditorName: auditorName.trim(),
          auditorSignature: sigAuditor,
          auditedName: auditedName.trim(),
          auditedSignature: sigAuditado,
        })
      );
    } catch (err) {
      console.error("Error al procesar firmas:", err);
      setErrorMessage("Se ha producido un error al registrar las firmas. Inténtelo nuevamente.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-dark/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-xl border border-slate-border my-8">
        <div className="flex items-center justify-between pb-space-sm border-b border-slate-border mb-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-8 h-8 rounded-lg bg-status-pass-bg text-status-pass flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">draw</span>
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Firma Digital del Dictamen
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full text-slate-subtext hover:bg-slate-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
          Para dotar de validez legal al acta de inspección, ambas partes deben ratificar y rubricar el documento en la pantalla táctil:
        </p>

        {/* Alerta de Validación Interna Harmónica (reemplaza alert convencional) */}
        {errorMessage && (
          <div className="mb-space-md p-3 rounded-xl bg-alert-red-bg/90 border border-alert-red/30 text-alert-red flex items-start gap-2.5 text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <div className="flex-1 leading-relaxed">
              {errorMessage}
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="w-5 h-5 rounded-full hover:bg-alert-red/20 flex items-center justify-center shrink-0 text-alert-red text-xs font-bold transition-colors cursor-pointer"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Panel Firma 1: Auditor */}
        <div className="mb-space-md">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                1. Firma del Inspector / Auditor Oficial
              </label>
              {isAuditorSigned ? (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-status-pass-bg text-status-pass font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  Rubricado
                </span>
              ) : errorMessage && (!isAuditorSigned || !auditorName.trim()) ? (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-alert-red-bg text-alert-red font-bold animate-pulse">
                  Requerido
                </span>
              ) : null}
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => clearCanvas(canvasAuditorRef.current, setIsAuditorSigned)}
              className="text-slate-subtext hover:text-alert-red text-xs underline disabled:opacity-40"
            >
              Borrar
            </button>
          </div>
          <input
            type="text"
            value={auditorName}
            disabled={isSubmitting}
            onChange={(e) => {
              setAuditorName(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="Nombre completo del auditor..."
            className={`w-full text-xs p-1.5 rounded border mb-1.5 bg-surface-container-low disabled:opacity-60 transition-colors ${
              !auditorName.trim() && errorMessage ? "border-alert-red ring-1 ring-alert-red/30" : "border-slate-border"
            }`}
          />
          <div
            className={`border rounded-lg bg-slate-surface overflow-hidden transition-all ${
              !isAuditorSigned && errorMessage
                ? "border-alert-red ring-2 ring-alert-red/20 shadow-sm"
                : "border-slate-border"
            }`}
          >
            <canvas
              ref={canvasAuditorRef}
              width={450}
              height={140}
              className="w-full h-28 touch-none bg-white cursor-crosshair"
            />
          </div>
        </div>

        {/* Panel Firma 2: Empresa Auditada */}
        <div className="mb-space-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">store</span>
                2. Firma del Responsable del Establecimiento
              </label>
              {isAuditedSigned ? (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-status-pass-bg text-status-pass font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                  Rubricado
                </span>
              ) : errorMessage && (!isAuditedSigned || !auditedName.trim()) ? (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-alert-red-bg text-alert-red font-bold animate-pulse">
                  Requerido
                </span>
              ) : null}
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => clearCanvas(canvasAuditadoRef.current, setIsAuditedSigned)}
              className="text-slate-subtext hover:text-alert-red text-xs underline disabled:opacity-40"
            >
              Borrar
            </button>
          </div>
          <input
            type="text"
            value={auditedName}
            disabled={isSubmitting}
            onChange={(e) => {
              setAuditedName(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="Nombre y cargo del responsable de la planta..."
            className={`w-full text-xs p-1.5 rounded border mb-1.5 bg-surface-container-low disabled:opacity-60 transition-colors ${
              !auditedName.trim() && errorMessage ? "border-alert-red ring-1 ring-alert-red/30" : "border-slate-border"
            }`}
          />
          <div
            className={`border rounded-lg bg-slate-surface overflow-hidden transition-all ${
              !isAuditedSigned && errorMessage
                ? "border-alert-red ring-2 ring-alert-red/20 shadow-sm"
                : "border-slate-border"
            }`}
          >
            <canvas
              ref={canvasAuditadoRef}
              width={450}
              height={140}
              className="w-full h-28 touch-none bg-white cursor-crosshair"
            />
          </div>
        </div>

        {/* Botões de Ação com Feedback Imediato */}
        <div className="flex flex-col gap-2.5 pt-space-sm border-t border-slate-border">
          <div className="flex items-center justify-end gap-space-sm">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg font-label-md text-label-md font-semibold text-slate-subtext hover:bg-slate-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className={`px-5 py-2.5 rounded-lg font-label-md text-label-md font-bold transition-all flex items-center gap-2 select-none ${
                isSubmitting
                  ? "bg-primary/80 text-white cursor-wait shadow-inner ring-2 ring-primary/30"
                  : "bg-primary text-on-primary shadow-sm hover:bg-primary-container active:scale-[0.98] cursor-pointer"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Validando y Emitiendo Laudo...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Validar y Emitir Laudo Oficial</span>
                </>
              )}
            </button>
          </div>

          {/* Banner visual explícito em processamento */}
          {isSubmitting && (
            <div className="p-2.5 rounded-xl bg-status-pass-bg text-primary border border-primary/20 flex items-center justify-center gap-2 text-xs font-semibold animate-pulse">
              <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
              <span>Ratificando firmas y certificando dictamen sanitario...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
