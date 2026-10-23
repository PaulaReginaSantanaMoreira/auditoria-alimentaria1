-- =============================================================================
-- BIOAUDIT PRO — SCRIPT DE LIMPEZA DE DADOS DE TESTE (PURGE TEST DATA)
-- Execute este script no SQL Editor do Supabase para resetar o banco de dados
-- para produção/cliente limpo, preservando ESTRITAMENTE o SuperAdmin, as
-- Rúbricas Regulamentares (30 pontos padrão) e o Catálogo de Planos em Euro.
-- =============================================================================

BEGIN;

-- 1. Limpar avaliações e evidências de inspeções de teste
DELETE FROM public.audit_evaluations;

-- 2. Limpar auditorias de teste
DELETE FROM public.audits;

-- 3. Limpar empresas auditadas de teste
DELETE FROM public.companies;

-- 4. Limpar histórico de contratos e assinaturas de tenants de teste
DELETE FROM public.tenant_subscription_contracts;
DELETE FROM public.tenant_subscriptions;

-- 5. Limpar usuários vinculados aos tenants de teste
DELETE FROM public.tenant_users;

-- 6. Limpar templates customizados de tenants (mantendo templates padrão onde tenant_id IS NULL)
DELETE FROM public.control_point_templates WHERE tenant_id IS NOT NULL;

-- 7. Limpar logs de consentimento de teste
DELETE FROM public.user_consent_logs;

-- 8. Limpar tenants de teste
DELETE FROM public.tenants;

-- 9. Limpar perfis de auditores que não sejam o SuperAdmin
DELETE FROM public.auditors 
WHERE auth_user_id NOT IN (SELECT user_id FROM public.platform_superusers);

-- 10. Limpar usuários de teste do Supabase Auth (auth.users), preservando o SuperAdmin
DELETE FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.platform_superusers)
  AND email NOT IN (SELECT email FROM public.platform_superusers);

-- 11. Limpar arquivos de teste do Supabase Storage
DELETE FROM storage.objects 
WHERE bucket_id IN ('audit-evidences', 'audit-signatures');

COMMIT;

-- Verificação e relatório pós-limpeza
DO $$
DECLARE
    superadmin_count INT;
    plans_count INT;
    rubric_count INT;
    tenants_left INT;
BEGIN
    SELECT COUNT(*) INTO superadmin_count FROM public.platform_superusers;
    SELECT COUNT(*) INTO plans_count FROM public.subscription_plans WHERE is_active = TRUE;
    SELECT COUNT(*) INTO rubric_count FROM public.control_point_templates WHERE tenant_id IS NULL;
    SELECT COUNT(*) INTO tenants_left FROM public.tenants;

    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'BioAudit Pro: Limpeza de dados de teste concluída!';
    RAISE NOTICE 'SuperAdmin preservado: %', superadmin_count;
    RAISE NOTICE 'Planos comerciais prontos: %', plans_count;
    RAISE NOTICE 'Pontos normativos regulamentares prontos: %', rubric_count;
    RAISE NOTICE 'Tenants restantes: % (Base limpa para novos clientes)', tenants_left;
    RAISE NOTICE '=========================================================';
END $$;
