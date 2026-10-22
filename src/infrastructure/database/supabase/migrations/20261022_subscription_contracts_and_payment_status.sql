-- =============================================================================
-- BIOAUDIT PRO — HISTÓRICO DE CONTRATOS, RENOVAÇÕES E STATUS FINANCEIRO (SAÚDE CLIENTE)
-- Versão: 20261022_subscription_contracts_and_payment_status.sql
-- =============================================================================

-- 1. Campos de status financeiro na subscrição ativa
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT'));
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS invoice_ref TEXT;
ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Tabela de histórico de contratos, renovações e aditivos
CREATE TABLE IF NOT EXISTS public.tenant_subscription_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL DEFAULT 'RENEWAL' CHECK (action_type IN ('CREATION', 'RENEWAL', 'EXTENSION', 'SEATS_ADJUSTMENT')),
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

CREATE INDEX IF NOT EXISTS idx_tenant_sub_contracts_tenant ON public.tenant_subscription_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sub_contracts_created_at ON public.tenant_subscription_contracts(created_at DESC);
