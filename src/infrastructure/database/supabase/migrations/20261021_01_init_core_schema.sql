-- =============================================================================
-- BIOAUDIT PRO — SCHEMA DE BANCO DE DADOS & SEGURANÇA RLS NO SUPABASE
-- Marco Normativo: Reglamento (CE) 852/2004, ISO 22000, RD 1021/2022
-- =============================================================================

-- 1. Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Auditores Oficiais
CREATE TABLE IF NOT EXISTS public.auditors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    official_id TEXT NOT NULL UNIQUE, -- NIF / NIE do auditor
    email TEXT NOT NULL,
    is_active_subscription BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Empresas Auditadas
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cif TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    sanitary_registry_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Auditorias Sanitárias
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auditor_id UUID NOT NULL REFERENCES public.auditors(id),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    inspection_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'EVALUATED', 'SIGNED', 'FINALIZED')),
    normative_framework TEXT NOT NULL DEFAULT 'Reglamento (CE) 852/2004 · APPCC',
    compliance_score NUMERIC(5,2),
    verdict TEXT CHECK (verdict IN ('FAVORABLE', 'FAVORABLE_CONDICIONAL', 'DESFAVORABLE')),
    auditor_signature_name TEXT,
    auditor_signature_url TEXT,
    audited_signature_name TEXT,
    audited_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Avaliações dos 30 Pontos de Controle
CREATE TABLE IF NOT EXISTS public.audit_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    control_point_code TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('INFRAESTRUCTURA', 'HIGIENE_PERSONAL', 'APPCC_FRIO_PROCESOS')),
    title TEXT NOT NULL,
    score INT NOT NULL CHECK (score IN (0, 1, 2)),
    is_critical_ccp BOOLEAN DEFAULT FALSE,
    observations TEXT DEFAULT '',
    evidence_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(audit_id, control_point_code)
);

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE public.auditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_evaluations ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Acesso RLS
-- Inspetor autenticado acessa seu próprio perfil
CREATE POLICY "Auditors can view own profile" 
ON public.auditors FOR SELECT 
USING (auth_user_id = auth.uid());

-- Inspetor autenticado visualiza e gerencia empresas
CREATE POLICY "Auditors can manage companies" 
ON public.companies FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Inspetor autenticado acessa suas próprias auditorias
CREATE POLICY "Auditors can manage their own audits" 
ON public.audits FOR ALL 
TO authenticated 
USING (
    auditor_id IN (SELECT id FROM public.auditors WHERE auth_user_id = auth.uid())
) 
WITH CHECK (
    auditor_id IN (SELECT id FROM public.auditors WHERE auth_user_id = auth.uid())
);

-- Inspetor autenticado gerencia as avaliações de suas próprias auditorias
CREATE POLICY "Auditors can manage their own audit evaluations" 
ON public.audit_evaluations FOR ALL 
TO authenticated 
USING (
    audit_id IN (
        SELECT id FROM public.audits WHERE auditor_id IN (
            SELECT id FROM public.auditors WHERE auth_user_id = auth.uid()
        )
    )
) 
WITH CHECK (
    audit_id IN (
        SELECT id FROM public.audits WHERE auditor_id IN (
            SELECT id FROM public.auditors WHERE auth_user_id = auth.uid()
        )
    )
);

-- 8. Configuração do Storage para Evidências e Assinaturas
INSERT INTO storage.buckets (id, name, public)
VALUES ('bioaudit-evidencias', 'bioaudit-evidencias', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload audit evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bioaudit-evidencias');

CREATE POLICY "Public read for audit evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'bioaudit-evidencias');
