"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function ChangePasswordModal({ isOpen, onClose, userEmail }: ChangePasswordModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fechar ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading]);

  if (!isOpen || !mounted) return null;

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setSuccessMessage("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!currentPassword) {
      setErrorMessage("Por favor introduzca su contraseña actual.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          email: userEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "No se pudo actualizar la contraseña.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(data.message || "¡Contraseña actualizada exitosamente!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsLoading(false);

      // Auto close após sucesso
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch {
      setErrorMessage("Error de conexión al servidor. Inténtelo más tarde.");
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md my-auto flex flex-col max-h-[92vh] bg-surface-container-lowest dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-border dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-slate-border/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">lock_reset</span>
            </div>
            <div>
              <h2 id="change-password-title" className="text-base font-bold text-slate-dark dark:text-white">
                Cambiar Contraseña
              </h2>
              <p className="text-xs text-slate-subtext dark:text-slate-400">
                Valida tu contraseña antigua para establecer una nueva
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-subtext hover:text-slate-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Formulário com Scroll Suave se necessário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-alert-red-bg/30 border border-alert-red/40 text-alert-red text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">check_circle</span>
              <span className="font-semibold leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Senha Atual */}
          <div>
            <label className="block text-xs font-semibold text-slate-dark dark:text-slate-200 mb-1.5">
              Contraseña Actual <span className="text-alert-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Introduce tu contraseña actual"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-white placeholder:text-slate-subtext focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-subtext hover:text-slate-dark dark:hover:text-white transition-colors cursor-pointer"
                aria-label={showCurrentPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showCurrentPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-subtext">
              Requerida para verificar tu identidad antes de cualquier cambio.
            </p>
          </div>

          {/* Nova Senha */}
          <div>
            <label className="block text-xs font-semibold text-slate-dark dark:text-slate-200 mb-1.5">
              Nueva Contraseña <span className="text-alert-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-white placeholder:text-slate-subtext focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-subtext hover:text-slate-dark dark:hover:text-white transition-colors cursor-pointer"
                aria-label={showNewPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showNewPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label className="block text-xs font-semibold text-slate-dark dark:text-slate-200 mb-1.5">
              Confirmar Nueva Contraseña <span className="text-alert-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface dark:bg-slate-800 border border-slate-border dark:border-slate-700 text-xs text-slate-dark dark:text-white placeholder:text-slate-subtext focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-subtext hover:text-slate-dark dark:hover:text-white transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Rodapé / Ações */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-border dark:border-slate-700 text-xs font-medium text-slate-dark dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isLoading ? "Validando..." : "Actualizar Contraseña"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
