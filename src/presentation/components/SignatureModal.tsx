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
  defaultAuditorName = "",
  defaultAuditedName = "",
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

  // Inicializa canvas listeners com cleanup rigoroso contra memory leaks e suporte a Retina/DPI
  useEffect(() => {
    if (!isOpen) return;

    const cleanups: Array<() => void> = [];

    const setupCanvas = (
      canvas: HTMLCanvasElement | null,
      onSignedChange: (val: boolean) => void
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calibração de DPI para telas Retina/High-DPI (iPad/Tablets)
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      let drawing = false;

      const getPos = (e: MouseEvent | TouchEvent) => {
        const clientRect = canvas.getBoundingClientRect();
        if ("touches" in e) {
          const touch = e.touches[0];
          return {
            x: touch.clientX - clientRect.left,
            y: touch.clientY - clientRect.top,
          };
        }
        return {
          x: (e as MouseEvent).clientX - clientRect.left,
          y: (e as MouseEvent).clientY - clientRect.top,
        };
      };

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        drawing = true;
        setErrorMessage(null);
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        if (e.cancelable) e.preventDefault();
      };

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        onSignedChange(true);
        if (e.cancelable) e.preventDefault();
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

      cleanups.push(() => {
        canvas.removeEventListener("mousedown", startDrawing);
        canvas.removeEventListener("mousemove", draw);
        window.removeEventListener("mouseup", stopDrawing);

        canvas.removeEventListener("touchstart", startDrawing);
        canvas.removeEventListener("touchmove", draw);
        window.removeEventListener("touchend", stopDrawing);
      });
    };

    setupCanvas(canvasAuditorRef.current, setIsAuditorSigned);
    setupCanvas(canvasAuditadoRef.current, setIsAuditedSigned);

    // Fechar com tecla Escape (WCAG 2.2)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    cleanups.push(() => window.removeEventListener("keydown", handleKeyDown));

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [isOpen, isSubmitting, onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-dark/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-xl border border-slate-border my-8">
        <div className="flex items-center justify-between pb-space-sm border-b border-slate-border mb-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-8 h-8 rounded-lg bg-status-pass-bg text-status-pass flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">draw</span>
            </span>
            <h2 id="signature-modal-title" className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Firma Digital del Dictamen
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal de firma"
            className="w-8 h-8 rounded-full text-slate-subtext hover:bg-slate-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
          Para dotar de validez legal al acta de inspección, ambas partes deben ratificar y rubricar el documento en la pantalla táctil:
        </p>

        {errorMessage && (
          <div className="mb-space-md p-3 rounded-xl bg-alert-red-bg/90 border border-alert-red/30 text-alert-red flex items-start gap-2.5 text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
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
              <label
                htmlFor="auditor-name-input"
                className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1"
              >
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
            id="auditor-name-input"
            type="text"
            value={auditorName}
            onChange={(e) => setAuditorName(e.target.value)}
            disabled={isSubmitting}
            placeholder="Ej: Dra. Carmen Rodríguez (Auditor Oficial - Nº Col. 2849)"
            className="w-full text-xs p-2 rounded-lg border border-slate-border mb-2 focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <div className="border border-slate-border rounded-xl bg-slate-surface/30 p-1 relative overflow-hidden">
            <canvas
              ref={canvasAuditorRef}
              className="w-full h-28 touch-none bg-white rounded-lg cursor-crosshair block"
            />
            {!isAuditorSigned && (
              <span className="absolute inset-0 flex items-center justify-center text-slate-subtext/40 text-xs pointer-events-none select-none">
                Dibuje la firma aquí con el dedo o puntero
              </span>
            )}
          </div>
        </div>

        {/* Panel Firma 2: Auditado */}
        <div className="mb-space-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <label
                htmlFor="audited-name-input"
                className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-subtext">person</span>
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
            id="audited-name-input"
            type="text"
            value={auditedName}
            onChange={(e) => setAuditedName(e.target.value)}
            disabled={isSubmitting}
            placeholder="Ej: D. Juan Pérez (Responsable de Calidad / Titular)"
            className="w-full text-xs p-2 rounded-lg border border-slate-border mb-2 focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <div className="border border-slate-border rounded-xl bg-slate-surface/30 p-1 relative overflow-hidden">
            <canvas
              ref={canvasAuditadoRef}
              className="w-full h-28 touch-none bg-white rounded-lg cursor-crosshair block"
            />
            {!isAuditedSigned && (
              <span className="absolute inset-0 flex items-center justify-center text-slate-subtext/40 text-xs pointer-events-none select-none">
                Dibuje la firma aquí con el dedo o puntero
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-space-xs pt-space-sm border-t border-slate-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-dark bg-slate-surface hover:bg-slate-border/50 disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Emitiendo Acta...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Finalizar y Emitir Laudo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
