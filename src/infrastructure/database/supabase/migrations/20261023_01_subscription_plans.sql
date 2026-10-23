-- =============================================================================
-- BIOAUDIT PRO — GESTÃO DE PLANOS DE SUBSCRIÇÃO & PLANO DEFAULT
-- Versão: 20261023_subscription_plans.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    duration_days INT NOT NULL DEFAULT 30,
    max_user_seats INT NOT NULL DEFAULT 1,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'EUR',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "plans_read_all" ON public.subscription_plans;
CREATE POLICY "plans_read_all" ON public.subscription_plans 
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "plans_admin_manage" ON public.subscription_plans;
CREATE POLICY "plans_admin_manage" ON public.subscription_plans 
    FOR ALL USING (public.is_platform_superadmin());

-- Inserir Plano Default (1 usuário, 7 dias bonificados, 0,00 €) e Planos Básicos
INSERT INTO public.subscription_plans (name, code, description, duration_days, max_user_seats, price, currency, is_default, is_active)
VALUES 
  ('Plano Piloto Bonificado (Default)', 'TRIAL_7D', 'Acesso inicial bonificado de 7 dias com 1 inspetor habilitado', 7, 1, 0.00, 'EUR', TRUE, TRUE),
  ('Plano Profissional Mensal', 'PRO_30D', 'Assinatura mensal para até 5 inspetores ativos e suporte prioritário', 30, 5, 29.00, 'EUR', FALSE, TRUE),
  ('Plano Corporativo Anual', 'CORP_365D', 'Licença anual para até 15 inspetores com personalização completa de rúbricas', 365, 15, 290.00, 'EUR', FALSE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_days = EXCLUDED.duration_days,
  max_user_seats = EXCLUDED.max_user_seats,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  is_default = EXCLUDED.is_default;
