"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (user: { fullName: string; email: string; phone?: string }) => void;
}

export function EditProfileModal({ isOpen, onClose, onProfileUpdated }: EditProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [role, setRole] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar dados atuais do usuário ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoading(true);

      fetch("/api/tenant/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setFullName(data.user.fullName || "");
            setEmail(data.user.email || "");
            setPhone(data.user.phone || "");
            setDocumentNumber(data.user.documentNumber || "No asignado");
            setRole(data.user.role || "");
          } else {
            setErrorMessage(data.error || "No se pudo cargar la información de perfil.");
          }
        })
        .catch(() => {
          setErrorMessage("Error de conexión al cargar perfil.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Fechar ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving]);

  if (!isOpen || !mounted) return null;

  const handleClose = () => {
    setErrorMessage("");
    setSuccessMessage("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!fullName.trim()) {
      setErrorMessage("El nombre completo es obligatorio.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Por favor introduzca un correo electrónico válido.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/tenant/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Error al actualizar los datos de perfil.");
        setIsSaving(false);
        return;
      }

      setSuccessMessage("¡Datos de perfil actualizados con éxito!");

      // Atualizar cache de sessão local no localStorage se existir
      try {
        const local = localStorage.getItem("bioaudit_session");
        if (local) {
          const parsed = JSON.parse(local);
          parsed.identifier = email.trim().toLowerCase();
          localStorage.setItem("bioaudit_session", JSON.stringify(parsed));
        }
      } catch {
        // Ignora erro no localstorage
      }

      if (onProfileUpdated) {
        onProfileUpdated({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        });
      }

      // Fecha o modal após 1.2 segundos
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch {
      setErrorMessage("Error de conexión al servidor al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          handleClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-profile-title"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-border dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-slate-border dark:border-slate-800 flex items-center justify-between bg-surface-container-low dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
            </div>
            <div>
              <h2 id="modal-profile-title" className="text-sm font-bold text-slate-dark dark:text-slate-100">
                Mis Datos de Usuario
              </h2>
              <p className="text-[11px] text-slate-subtext dark:text-slate-400">
                Gestión de identidad y contacto del perfil activo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-subtext hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Corpo do Modal */}
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs text-slate-subtext">Cargando información del usuario...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Feedback de Erro ou Sucesso */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-alert-red-bg/20 border border-alert-red/30 flex items-start gap-2 text-xs text-alert-red animate-in fade-in">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-status-pass-bg/25 border border-status-pass/30 flex items-start gap-2 text-xs text-status-pass animate-in fade-in">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Documento Oficial de Identidade - ESTRITAMENTE IMUTÁVEL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-dark dark:text-slate-200 flex items-center gap-1">
                  <span>Documento Oficial (DNI / NIE / NIF)</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 inline-flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[11px]">lock</span>
                    Inmutable
                  </span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={documentNumber}
                  disabled
                  readOnly
                  className="w-full h-10 px-3.5 pl-9 rounded-xl border border-slate-border dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-subtext dark:text-slate-400 font-mono text-xs cursor-not-allowed select-none"
                />
                <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3 select-none">
                  badge
                </span>
              </div>
              <p className="text-[10px] text-slate-subtext dark:text-slate-400 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-amber-500">info</span>
                <span>Por seguridad y trazabilidad jurídica sanitaria, solo un SuperAdmin puede modificar este campo.</span>
              </p>
            </div>

            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-slate-dark dark:text-slate-200 mb-1">
                Nombre Completo Oficial *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Dra. Carmen Rodríguez"
                  className="w-full h-10 px-3.5 pl-9 rounded-xl border border-slate-border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-dark dark:text-slate-100 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
                <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3">
                  person
                </span>
              </div>
            </div>

            {/* Email de Acceso */}
            <div>
              <label className="block text-xs font-semibold text-slate-dark dark:text-slate-200 mb-1">
                Correo Electrónico de Acceso *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full h-10 px-3.5 pl-9 rounded-xl border border-slate-border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-dark dark:text-slate-100 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-mono"
                />
                <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3">
                  mail
                </span>
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-semibold text-slate-dark dark:text-slate-200 mb-1">
                Teléfono de Contacto Profesional
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full h-10 px-3.5 pl-9 rounded-xl border border-slate-border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-dark dark:text-slate-100 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
                <span className="material-symbols-outlined text-[16px] text-slate-subtext absolute left-3 top-3">
                  phone
                </span>
              </div>
            </div>

            {/* Rol Asignado - Informativo */}
            {role && (
              <div className="pt-1 flex items-center justify-between text-xs text-slate-subtext">
                <span>Rol en la organización:</span>
                <span className="font-bold text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {role}
                </span>
              </div>
            )}

            {/* Rodapé com Botões */}
            <div className="pt-3 border-t border-slate-border dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-subtext hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-container text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
