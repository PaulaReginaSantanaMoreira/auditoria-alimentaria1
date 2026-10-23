-- =============================================================================
-- BIOAUDIT PRO — ATUALIZAÇÃO INTEGRAL DE BANCO DE DADOS (SUPABASE)
-- Versão: 20261022_full_tenant_and_contracts_migration.sql
-- Descrição:
--   1. Adiciona dados corporativos estendidos na tabela `tenants` (endereço, telefone, admin)
--   2. Adiciona colunas de saúde financeira na tabela `tenant_subscriptions` (payment_status, invoice_ref, notes)
--   3. Cria a tabela `tenant_subscription_contracts` para histórico de contratos, renovações e auditoria financeira
--   4. Configura índices de performance e políticas RLS de segurança
-- =============================================================================

-- Habilitar extensão para geração de UUIDs caso não esteja ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. EXTENSÃO DA TABELA: tenants (Informações corporativas e do Administrador)
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS admin_name TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_admin_email ON public.tenants(admin_email);
CREATE INDEX IF NOT EXISTS idx_tenants_cif ON public.tenants(cif);

-- -----------------------------------------------------------------------------
-- 2. EXTENSÃO DA TABELA: tenant_subscriptions (Saúde financeira e cobrança)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    -- payment_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tenant_subscriptions' 
          AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.tenant_subscriptions 
        ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'PAID';
        
        ALTER TABLE public.tenant_subscriptions 
        ADD CONSTRAINT chk_tenant_subs_payment_status 
        CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT'));
    END IF;

    -- invoice_ref
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tenant_subscriptions' 
          AND column_name = 'invoice_ref'
    ) THEN
        ALTER TABLE public.tenant_subscriptions ADD COLUMN invoice_ref TEXT;
    END IF;

    -- notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tenant_subscriptions' 
          AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.tenant_subscriptions ADD COLUMN notes TEXT;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. NOVA TABELA: tenant_subscription_contracts (Histórico de Contratos & Saúde)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_subscription_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL DEFAULT 'RENEWAL',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    days_added INT NOT NULL DEFAULT 0,
    seats INT NOT NULL DEFAULT 5,
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT')),
    amount NUMERIC(10, 2),
    invoice_ref TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de auditoria e performance
CREATE INDEX IF NOT EXISTS idx_tenant_sub_contracts_tenant ON public.tenant_subscription_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sub_contracts_created_at ON public.tenant_subscription_contracts(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenant_subscription_contracts ENABLE ROW LEVEL SECURITY;

-- Service Role / SuperAdmin possui acesso total
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'tenant_subscription_contracts' 
          AND policyname = 'service_role_all_tenant_contracts'
    ) THEN
        CREATE POLICY service_role_all_tenant_contracts 
        ON public.tenant_subscription_contracts 
        FOR ALL 
        USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'authenticated');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. CARGA INICIAL RETROATIVA DE CONTRATOS (Para tenants existentes sem histórico)
-- -----------------------------------------------------------------------------
INSERT INTO public.tenant_subscription_contracts (
    tenant_id,
    subscription_id,
    action_type,
    valid_from,
    expires_at,
    days_added,
    seats,
    payment_status,
    notes,
    created_by
)
SELECT 
    ts.tenant_id,
    ts.id,
    'CREATION',
    ts.valid_from,
    ts.expires_at,
    365,
    ts.max_user_seats,
    COALESCE(ts.payment_status, 'PAID'),
    'Contrato inicial registrado retroativamente pelo sistema',
    'Sistema / Migração'
FROM public.tenant_subscriptions ts
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_subscription_contracts c 
    WHERE c.tenant_id = ts.tenant_id
);

-- FIM DA MIGRAÇÃO
