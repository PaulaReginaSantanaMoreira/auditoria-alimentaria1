-- =============================================================================
-- BIOAUDIT PRO — MIGRATION: Prazo de Pagamento (Due Date) & Caducidade de Ofertas
-- Arquivo: 20261023_02_contract_due_date_and_caducity.sql
-- =============================================================================

-- 1. Adicionar payment_due_date no histórico de contratos e na assinatura do tenant
ALTER TABLE public.tenant_subscription_contracts 
    ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMPTZ;

ALTER TABLE public.tenant_subscriptions 
    ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMPTZ;

-- 2. Atualizar constraint de status financeiro do contrato para suportar 'CANCELLED' (ofertas canceladas/caducadas)
ALTER TABLE public.tenant_subscription_contracts 
    DROP CONSTRAINT IF EXISTS tenant_subscription_contracts_payment_status_check;

ALTER TABLE public.tenant_subscription_contracts 
    ADD CONSTRAINT tenant_subscription_contracts_payment_status_check 
    CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT', 'CANCELLED'));

-- 3. Criar índice para consultas eficientes de vencimento e caducidade de propostas
CREATE INDEX IF NOT EXISTS idx_tenant_contracts_due_date 
    ON public.tenant_subscription_contracts(payment_due_date) 
    WHERE payment_due_date IS NOT NULL;

-- 4. Notificar conclusão no log do PostgreSQL
DO $$
BEGIN
    RAISE NOTICE 'BioAudit Pro: Colunas de payment_due_date e status CANCELLED configuradas com sucesso.';
END $$;
