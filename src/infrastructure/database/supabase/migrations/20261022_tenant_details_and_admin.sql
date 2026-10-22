-- =============================================================================
-- BIOAUDIT PRO — DETALHES DE EMPRESA (ENDEREÇO, CONTATO) E ADMIN DE TENANT
-- Versão: 20261022_tenant_details_and_admin.sql
-- =============================================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS admin_name TEXT;

-- Índice para busca rápida de tenants por CIF e admin_email
CREATE INDEX IF NOT EXISTS idx_tenants_admin_email ON public.tenants(admin_email);
