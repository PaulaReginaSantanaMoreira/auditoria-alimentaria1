-- =============================================================================
-- BIOAUDIT PRO — MIGRATION: Soporte para Reembolso Total y Parcial de Contratos
-- Archivo: 20261023_03_contract_refunds.sql
-- =============================================================================

-- 1. Añadir columnas de auditoría financiera de reembolso en el histórico de contratos
ALTER TABLE public.tenant_subscription_contracts 
    ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS refund_type TEXT CHECK (refund_type IS NULL OR refund_type IN ('TOTAL', 'PARTIAL')),
    ADD COLUMN IF NOT EXISTS refund_reason TEXT,
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 2. Actualizar constraint de payment_status en tenant_subscription_contracts para incluir 'REFUNDED' y 'PARTIALLY_REFUNDED'
ALTER TABLE public.tenant_subscription_contracts 
    DROP CONSTRAINT IF EXISTS tenant_subscription_contracts_payment_status_check;

ALTER TABLE public.tenant_subscription_contracts 
    ADD CONSTRAINT tenant_subscription_contracts_payment_status_check 
    CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'));

-- 3. Actualizar constraint de payment_status en tenant_subscriptions
ALTER TABLE public.tenant_subscriptions 
    DROP CONSTRAINT IF EXISTS tenant_subscriptions_payment_status_check;

ALTER TABLE public.tenant_subscriptions 
    ADD CONSTRAINT tenant_subscriptions_payment_status_check 
    CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT', 'REFUNDED', 'PARTIALLY_REFUNDED'));

-- 4. Crear índice para auditorías rápidas de reembolsos
CREATE INDEX IF NOT EXISTS idx_tenant_contracts_refunded_at 
    ON public.tenant_subscription_contracts(refunded_at) 
    WHERE refunded_at IS NOT NULL;

-- 5. Confirmación en log de PostgreSQL
DO $$
BEGIN
    RAISE NOTICE 'BioAudit Pro: Sistema de reembolsos totales y parciales configurado con éxito.';
END $$;
