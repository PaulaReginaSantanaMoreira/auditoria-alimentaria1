-- =============================================================================
-- BIOAUDIT PRO — MIGRAÇÃO DE CORREÇÃO DE SEGURANÇA, RLS, STORAGE E CCPS CRÍTICOS
-- Versão: 20261021_security_and_performance_remediation.sql
-- =============================================================================

-- 1. CORREÇÃO DE INCONSISTÊNCIA SANITÁRIA (REGULAMENTO CE 852/2004)
-- Pontos Críticos 1.7 (Água Potável / Lavamanos) e 2.5 (Exclusão por Doença/Lesão)
UPDATE public.control_point_templates
SET is_critical_ccp = TRUE
WHERE code IN ('q1_7', 'q2_5', 'q3_1');

-- 2. CORREÇÃO DA POLÍTICA RLS MULTI-TENANT EM AUDITORIAS (PREVENÇÃO DE SUBQUERY MULTI-ROW ERROR)
DROP POLICY IF EXISTS "audits_view_policy" ON public.audits;
CREATE POLICY "audits_view_policy" ON public.audits FOR SELECT USING (
    public.is_platform_superadmin() OR
    (
        COALESCE(access_scope, 'TENANT') <> 'CONFIDENTIAL' AND
        tenant_id = public.get_auth_tenant_id() AND
        (
            (SELECT can_view_all_tenant_audits 
             FROM public.tenant_users 
             WHERE user_id = auth.uid() 
               AND tenant_id = public.audits.tenant_id 
               AND is_active = TRUE) = TRUE
            OR
            auditor_id IN (SELECT id FROM public.auditors WHERE auth_user_id = auth.uid())
        )
    )
);

-- 3. BLINDAGEM DE PRIVACIDADE NO SUPABASE STORAGE (RGPD / LGPD)
-- O bucket de assinaturas digitais deve ser estritamente PRIVADO.
UPDATE storage.buckets 
SET public = false 
WHERE id = 'audit-signatures';

INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-signatures', 'audit-signatures', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remoção de acesso público irrestrito ao bucket de assinaturas
DROP POLICY IF EXISTS "Evidences public read" ON storage.objects;
DROP POLICY IF EXISTS "Public read for audit evidence" ON storage.objects;

-- Evidências fotográficas podem ser lidas se públicas, mas assinaturas apenas autenticado ou signed URL
CREATE POLICY "Evidences public read" ON storage.objects FOR SELECT USING (
    bucket_id = 'audit-evidences' OR (
        bucket_id = 'audit-signatures' AND (
            auth.role() = 'authenticated' OR public.is_platform_superadmin()
        )
    )
);

-- 4. ÍNDICES DE ALTA PERFORMANCE PARA ELIMINAÇÃO DE GARGALOS N+1
CREATE INDEX IF NOT EXISTS idx_audits_tenant_auditor ON public.audits (tenant_id, auditor_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_evaluations_audit_id ON public.audit_evaluations (audit_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_cif ON public.companies (tenant_id, cif);
