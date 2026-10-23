import { ControlPointTemplate } from "@/domain/constants/default-control-points";

export const CATEGORY_OPTIONS = [
  { category: "INFRAESTRUCTURA", label: "Infraestructura y Equipos" },
  { category: "HIGIENE_PERSONAL", label: "Higiene y Prácticas del Personal" },
  { category: "OPERACIONES_TEMPERATURAS", label: "Operaciones y Cadena de Frío" },
  { category: "TRAZABILIDAD_DOCUMENTACION", label: "Trazabilidad y APPCC" },
  { category: "LIMPIEZA_GESTION_RESIDUOS", label: "Limpieza, Desinfección y Plagas" },
];

export interface TenantItem {
  id: string;
  name: string;
  cif: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  address?: string;
  phone?: string;
  adminEmail?: string;
  adminName?: string;
  planTier: string;
  maxUserSeats: number;
  activeUsersCount: number;
  subscriptionStatus: string;
  paymentStatus?: "PAID" | "COURTESY" | "PENDING_PAYMENT";
  invoiceRef?: string;
  notes?: string;
  validFrom: string;
  expiresAt: string;
  daysRemaining: number;
  isExpired: boolean;
  createdAt: string;
}

export interface ContractHistoryItem {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  actionType: "CREATION" | "RENEWAL" | "SEATS_CHANGE" | "EXPIRATION_EXTENDED" | "MANUAL_ADJUSTMENT";
  validFrom: string;
  expiresAt: string;
  daysAdded: number;
  seats: number;
  paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
  amount?: number;
  invoiceRef?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface TenantUserItem {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  documentNumber?: string;
  role: "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER";
  canViewAllTenantAudits: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AdminAuditItem {
  id: string;
  companyName: string;
  companyCif: string;
  companyAddress?: string;
  inspectionDate: string;
  status: string;
  complianceScore?: number | null;
  verdict?: string | null;
  normativeFramework?: string;
  updatedAt?: string;
  isInvalidated?: boolean;
}

export interface PlanItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  durationDays: number;
  maxUserSeats: number;
  price: number;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface NewTenantFormState {
  name: string;
  cif: string;
  address: string;
  phone: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminDocumentNumber?: string;
  planId?: string;
  planTier?: string;
  maxUserSeats?: number;
  subscriptionDays?: number;
  paymentStatus?: "PAID" | "COURTESY" | "PENDING_PAYMENT";
  invoiceRef?: string;
  notes?: string;
}

export interface EditTenantFormState {
  name: string;
  cif: string;
  address: string;
  phone: string;
  planTier: string;
  adminName: string;
  adminEmail: string;
  maxUserSeats: number;
}

export interface RenewContractFormState {
  daysToAdd: number;
  newSeats: number;
  paymentStatus: "PAID" | "COURTESY" | "PENDING_PAYMENT";
  amount: number;
  invoiceRef: string;
  notes: string;
}

export interface NewUserFormState {
  email: string;
  fullName: string;
  documentNumber: string;
  phone: string;
  role: "AUDITOR" | "VIEWER" | "TENANT_ADMIN";
  canViewAllTenantAudits: boolean;
}

export interface EditTenantUserFormState {
  fullName: string;
  documentNumber: string;
  phone: string;
  role: "TENANT_ADMIN" | "AUDITOR" | "VIEWER";
  isActive: boolean;
  canViewAllTenantAudits: boolean;
}

export interface GeneratedCredentialsState {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  role: string;
  fullName: string;
}
