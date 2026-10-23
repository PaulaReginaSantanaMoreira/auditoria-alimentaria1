"use client";

import React, { useState } from "react";
import { TenantItem, TenantUserItem, NewUserFormState, EditTenantUserFormState } from "../types";

interface TenantUsersModalProps {
  tenant: TenantItem | null;
  onClose: () => void;
  users: TenantUserItem[];
  isLoading: boolean;
  onAddUser: (form: NewUserFormState) => Promise<void>;
  isAddingUser: boolean;
  onEditUser: (user: TenantUserItem, updated: EditTenantUserFormState) => Promise<void>;
  isSavingUser: boolean;
  onResetPassword: (user: TenantUserItem) => Promise<void>;
}

export function TenantUsersModal({
  tenant,
  onClose,
  users,
  isLoading,
  onAddUser,
  isAddingUser,
  onEditUser,
  isSavingUser,
  onResetPassword,
}: TenantUsersModalProps) {
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserFormState>({
    email: "",
    fullName: "",
    documentNumber: "",
    phone: "",
    role: "AUDITOR",
    canViewAllTenantAudits: true,
  });

  const [editingUser, setEditingUser] = useState<TenantUserItem | null>(null);
  const [editUserForm, setEditUserForm] = useState<EditTenantUserFormState>({
    fullName: "",
    documentNumber: "",
    phone: "",
    role: "AUDITOR",
    isActive: true,
    canViewAllTenantAudits: true,
  });

  if (!tenant) return null;

  const handleStartEdit = (u: TenantUserItem) => {
    setEditingUser(u);
    setEditUserForm({
      fullName: u.fullName || "",
      documentNumber: u.documentNumber || "",
      phone: u.phone || "",
      role: (u.role === "INSPECTOR" ? "AUDITOR" : u.role) as "TENANT_ADMIN" | "AUDITOR" | "VIEWER",
      isActive: u.isActive,
      canViewAllTenantAudits: u.canViewAllTenantAudits ?? (u.role === "TENANT_ADMIN"),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await onEditUser(editingUser, editUserForm);
    setEditingUser(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddUser(newUserForm);
    setShowAddUserForm(false);
    setNewUserForm({
      email: "",
      fullName: "",
      documentNumber: "",
      phone: "",
      role: "AUDITOR",
      canViewAllTenantAudits: true,
    });
  };

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl border border-slate-border animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-start justify-between border-b border-slate-border/70 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>Usuarios e Inspectores del Tenant</span>
            </div>
            <h2 className="font-title-md text-title-md text-on-surface font-bold">
              {tenant.name}
            </h2>
            <p className="text-xs text-slate-subtext mt-0.5">
              CIF: <span className="font-mono">{tenant.cif}</span> • Cupo Ocupado:{" "}
              <strong>
                {activeCount} / {tenant.maxUserSeats}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-subtext hover:bg-surface-container flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Botão de Adicionar Usuário */}
        <div className="py-3 flex items-center justify-between border-b border-slate-border/50">
          <span className="text-xs text-slate-subtext">
            Lista de inspectores y administradores habilitados para operar rúbricas oficiales.
          </span>

          <button
            type="button"
            onClick={() => setShowAddUserForm((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showAddUserForm ? "remove" : "person_add"}
            </span>
            <span>{showAddUserForm ? "Ocultar Formulario" : "Nuevo Inspector"}</span>
          </button>
        </div>

        {/* Formulário de Adicionar Novo Usuário / Inspector */}
        {showAddUserForm && (
          <form
            onSubmit={handleCreateUser}
            className="p-4 my-2 rounded-xl bg-surface border border-primary/30 space-y-3.5 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">person_add</span>
                <span>Registrar Nuevo Miembro en el Tenant</span>
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                Perfil SuperAdmin prohibido
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez García"
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Correo Corporativo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ej. juan.perez@empresa.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Documento Oficial (DNI / NIE / NIF)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12345678Z"
                  value={newUserForm.documentNumber}
                  onChange={(e) => setNewUserForm({ ...newUserForm, documentNumber: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  placeholder="Ej. +34 612 345 678"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Nivel de Permiso
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm({
                      ...newUserForm,
                      role: e.target.value as "TENANT_ADMIN" | "AUDITOR" | "VIEWER",
                    })
                  }
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                >
                  <option value="AUDITOR">AUDITOR (Inspector de Campo)</option>
                  <option value="TENANT_ADMIN">TENANT_ADMIN (Gestor de Empresa)</option>
                  <option value="VIEWER">VIEWER (Solo Consulta)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Alcance de Visualización de Auditorías
                </label>
                <select
                  value={newUserForm.canViewAllTenantAudits ? "all" : "own"}
                  onChange={(e) =>
                    setNewUserForm({
                      ...newUserForm,
                      canViewAllTenantAudits: e.target.value === "all",
                    })
                  }
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                >
                  <option value="all">Todas las actas de la empresa</option>
                  <option value="own">Solo sus propias actas asignadas</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-border/50">
              <button
                type="button"
                onClick={() => setShowAddUserForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isAddingUser}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isAddingUser ? "Guardando..." : "Guardar & Generar Contraseña"}
              </button>
            </div>
          </form>
        )}

        {/* Formulário de Edição de Inspetor Existente */}
        {editingUser && (
          <form
            onSubmit={handleSaveEdit}
            className="p-4 my-2 rounded-xl bg-surface border border-primary/50 shadow-md space-y-3.5 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">edit</span>
                <span>Modificar Inspector: <strong className="font-mono text-primary">{editingUser.email}</strong></span>
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                Perfil SuperAdmin prohibido
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-1 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editUserForm.fullName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Documento Oficial (DNI / NIE / NIF)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12345678Z"
                  value={editUserForm.documentNumber}
                  onChange={(e) => setEditUserForm({ ...editUserForm, documentNumber: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  placeholder="Ej. +34 612 345 678"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Nivel de Permiso
                </label>
                <select
                  value={editUserForm.role}
                  onChange={(e) =>
                    setEditUserForm({
                      ...editUserForm,
                      role: e.target.value as "TENANT_ADMIN" | "AUDITOR" | "VIEWER",
                    })
                  }
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                >
                  <option value="AUDITOR">AUDITOR (Inspector de Campo)</option>
                  <option value="TENANT_ADMIN">TENANT_ADMIN (Gestor de Empresa)</option>
                  <option value="VIEWER">VIEWER (Solo Consulta)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Estado de Cuenta
                </label>
                <select
                  value={editUserForm.isActive ? "active" : "inactive"}
                  onChange={(e) =>
                    setEditUserForm({
                      ...editUserForm,
                      isActive: e.target.value === "active",
                    })
                  }
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                >
                  <option value="active">Activo (Habilitado)</option>
                  <option value="inactive">Inactivo (Deshabilitado)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-subtext uppercase">
                  Alcance de Visualización
                </label>
                <select
                  value={editUserForm.canViewAllTenantAudits ? "all" : "own"}
                  onChange={(e) =>
                    setEditUserForm({
                      ...editUserForm,
                      canViewAllTenantAudits: e.target.value === "all",
                    })
                  }
                  className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-slate-border text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                >
                  <option value="all">Todas las actas del tenant</option>
                  <option value="own">Solo actas propias</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-border/50">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-subtext hover:bg-surface-container cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingUser}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-container disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSavingUser ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        )}

        {/* Tabela de Usuários */}
        <div className="flex-1 overflow-y-auto mt-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <span className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs text-slate-subtext">Cargando inspectores del tenant...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-slate-subtext text-xs">
              No hay inspectores vinculados a este tenant todavía.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border">
                <tr>
                  <th className="py-2.5 px-3">Inspector / Identidad</th>
                  <th className="py-2.5 px-3">Nivel de Permiso</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border/50 text-on-surface">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-on-surface">{u.fullName}</div>
                      <div className="text-slate-subtext font-mono text-[11px]">{u.email}</div>
                      {(u.documentNumber || u.phone) && (
                        <div className="text-[10px] text-slate-subtext mt-0.5 flex items-center gap-2 flex-wrap">
                          {u.documentNumber && (
                            <span>
                              Doc: <strong className="font-mono text-on-surface">{u.documentNumber}</strong>
                            </span>
                          )}
                          {u.phone && <span>Tel: {u.phone}</span>}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`w-fit px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            u.role === "TENANT_ADMIN"
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                              : u.role === "VIEWER"
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              : "bg-status-pass-bg text-status-pass"
                          }`}
                        >
                          {u.role}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            u.canViewAllTenantAudits
                              ? "text-primary dark:text-emerald-400"
                              : "text-slate-subtext"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {u.canViewAllTenantAudits ? "visibility" : "visibility_off"}
                          </span>
                          <span>{u.canViewAllTenantAudits ? "Todas las actas" : "Solo propias"}</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          u.isActive
                            ? "bg-status-pass-bg text-status-pass"
                            : "bg-alert-red-bg/25 text-alert-red"
                        }`}
                      >
                        {u.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Modificar nombre, documento, teléfono o estado del inspector"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onResetPassword(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Generar nueva contraseña temporal oficial"
                        >
                          <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                          <span>Reset Clave</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
