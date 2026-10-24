-- =============================================================================
-- BIOAUDIT PRO — MIGRATION: Actualización de restricciones para estados de cancelación
-- Archivo: 20261023_04_timeline_and_cancellation_constraints.sql
-- =============================================================================

-- 1. Permitir 'CANCELLED' y 'REFUNDED' en tenant_subscriptions para recálculo de vigencias
ALTER TABLE public.tenant_subscriptions 
    DROP CONSTRAINT IF EXISTS tenant_subscriptions_payment_status_check;

ALTER TABLE public.tenant_subscriptions 
    ADD CONSTRAINT tenant_subscriptions_payment_status_check 
    CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'));

-- 2. Asegurar que tenant_subscription_contracts también tenga la restricción completa
ALTER TABLE public.tenant_subscription_contracts 
    DROP CONSTRAINT IF EXISTS tenant_subscription_contracts_payment_status_check;

ALTER TABLE public.tenant_subscription_contracts 
    ADD CONSTRAINT tenant_subscription_contracts_payment_status_check 
    CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'));

-- 3. Notificar recarga de schema a PostgREST
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'BioAudit Pro: Restricciones de estado de pago actualizadas con éxito.';
END $$;
