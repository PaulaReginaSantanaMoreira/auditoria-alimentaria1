-- Migration: 20261023_05_auditor_resilience.sql
-- Descripción: Garantiza la tolerancia a fallos en auditorías sanitarias y adapta RLS al modelo multi-tenant

-- 1. Permite auditor_id nulo para no impedir almacenamiento en caso de inspectores en transición
ALTER TABLE public.audits ALTER COLUMN auditor_id DROP NOT NULL;

-- 2. Elimina la restricción estricta anterior si existe
ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_auditor_id_fkey;

-- 3. Recrea la clave foránea como no bloqueante (ON DELETE SET NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audits_auditor_id_fkey'
    ) THEN
        ALTER TABLE public.audits
            ADD CONSTRAINT audits_auditor_id_fkey
            FOREIGN KEY (auditor_id)
            REFERENCES public.auditors(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Actualiza políticas RLS de audits y audit_evaluations para basarse en tenant_users
DROP POLICY IF EXISTS "audits_insert_policy" ON public.audits;
CREATE POLICY "audits_insert_policy" ON public.audits FOR INSERT WITH CHECK (
    public.is_platform_superadmin() OR
    tenant_id IS NULL OR
    (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = TRUE)
    )
);

DROP POLICY IF EXISTS "audits_view_policy" ON public.audits;
CREATE POLICY "audits_view_policy" ON public.audits FOR SELECT USING (
    public.is_platform_superadmin() OR
    tenant_id IS NULL OR
    (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = TRUE)
    )
);

DROP POLICY IF EXISTS "audits_update_policy" ON public.audits;
CREATE POLICY "audits_update_policy" ON public.audits FOR UPDATE USING (
    public.is_platform_superadmin() OR
    tenant_id IS NULL OR
    (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = TRUE)
    )
);

DROP POLICY IF EXISTS "evaluations_manage" ON public.audit_evaluations;
CREATE POLICY "evaluations_manage" ON public.audit_evaluations FOR ALL USING (
    public.is_platform_superadmin() OR
    audit_id IN (
        SELECT id FROM public.audits WHERE
            tenant_id IS NULL OR
            tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = TRUE)
    )
);
