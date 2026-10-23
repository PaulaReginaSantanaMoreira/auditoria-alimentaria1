-- =============================================================================
-- BIOAUDIT PRO — SCRIPT CONSOLIDADO DE IMPLANTAÇÃO COMPLETA NO SUPABASE
-- Execute este script no SQL Editor do seu Dashboard Supabase (1-Click Run)
-- Marco Normativo: CE 852/2004, ISO 22000, RD 1021/2022, GDPR/RGPD e LGPD
-- Versão Consolidada: 2.4.0+
-- =============================================================================

-- 1. Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Tenants (Empresas / Organizações)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cif TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    address TEXT,
    phone TEXT,
    admin_email TEXT,
    admin_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_admin_email ON public.tenants(admin_email);
CREATE INDEX IF NOT EXISTS idx_tenants_cif ON public.tenants(cif);

-- 3. Tabela de Catálogo de Planos de Subscrição
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

CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON public.subscription_plans(code);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- 4. Tabela de Subscrições Ativas (Pertence ao Tenant)
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    plan_code TEXT,
    max_user_seats INT NOT NULL DEFAULT 1 CHECK (max_user_seats >= 1),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED')),
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT')),
    invoice_ref TEXT,
    notes TEXT,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    feature_flags JSONB NOT NULL DEFAULT '{"custom_rubric": true, "offline_sync": true, "export_pdf": true, "analytics": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir remoção definitiva de plan_tier e restrições legadas
ALTER TABLE public.tenant_subscriptions DROP CONSTRAINT IF EXISTS tenant_subscriptions_plan_tier_check;
ALTER TABLE public.tenant_subscriptions DROP COLUMN IF EXISTS plan_tier;

-- 5. Tabela de Histórico de Contratos e Renovações
CREATE TABLE IF NOT EXISTS public.tenant_subscription_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    plan_code TEXT,
    action_type TEXT NOT NULL DEFAULT 'RENEWAL' CHECK (action_type IN ('CREATION', 'RENEWAL', 'EXTENSION', 'SEATS_ADJUSTMENT')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    days_added INT NOT NULL DEFAULT 0,
    seats INT NOT NULL DEFAULT 1,
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'COURTESY', 'PENDING_PAYMENT')),
    amount NUMERIC(10, 2),
    invoice_ref TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_sub_contracts_tenant ON public.tenant_subscription_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sub_contracts_created_at ON public.tenant_subscription_contracts(created_at DESC);

-- 6. Tabela de Superusuários da Plataforma (Platform Admins)
CREATE TABLE IF NOT EXISTS public.platform_superusers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Usuários Vinculados ao Tenant
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'INSPECTOR' CHECK (role IN ('TENANT_ADMIN', 'INSPECTOR', 'AUDITOR', 'VIEWER')),
    can_view_all_tenant_audits BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- 8. Trigger de Limite de Assentos (Seats Enforcement)
CREATE OR REPLACE FUNCTION public.check_tenant_seats_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    current_active_count INT;
    allowed_seats INT;
BEGIN
    IF NEW.is_active = TRUE THEN
        SELECT max_user_seats INTO allowed_seats 
        FROM public.tenant_subscriptions 
        WHERE tenant_id = NEW.tenant_id;

        IF allowed_seats IS NULL THEN
            allowed_seats := 5;
        END IF;

        SELECT COUNT(*) INTO current_active_count 
        FROM public.tenant_users 
        WHERE tenant_id = NEW.tenant_id AND is_active = TRUE AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF (current_active_count + 1) > allowed_seats THEN
            RAISE EXCEPTION 'Limite de assentos (% usuários) atingido para este Tenant.', allowed_seats;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_tenant_seats ON public.tenant_users;
CREATE TRIGGER trg_check_tenant_seats
BEFORE INSERT OR UPDATE OF is_active ON public.tenant_users
FOR EACH ROW EXECUTE FUNCTION public.check_tenant_seats_limit();

-- 9. Tabela de Auditores Oficiais
CREATE TABLE IF NOT EXISTS public.auditors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    official_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    is_active_subscription BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Empresas Auditadas
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cif TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    sanitary_registry_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabela de Templates de Rúbricas (Padrão 30 Pontos vs Customizado)
CREATE TABLE IF NOT EXISTS public.control_point_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    number TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('INFRAESTRUCTURA', 'HIGIENE_PERSONAL', 'APPCC_FRIO_PROCESOS')),
    category_label TEXT NOT NULL,
    title TEXT NOT NULL,
    is_critical_ccp BOOLEAN NOT NULL DEFAULT FALSE,
    legal_reference TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpt_tenant_code 
ON public.control_point_templates (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

-- 12. Tabela de Auditorias Sanitárias
CREATE TABLE IF NOT EXISTS public.audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
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
    access_scope TEXT NOT NULL DEFAULT 'TENANT' CHECK (access_scope IN ('TENANT', 'CONFIDENTIAL', 'PRIVATE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabela de Avaliações dos Pontos de Controle
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

-- 14. Tabela de Rastreabilidade de Consentimento (GDPR / LGPD)
CREATE TABLE IF NOT EXISTS public.user_consent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_pseudonymized TEXT,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('COOKIE_POLICY', 'TERMS_OF_SERVICE', 'PRIVACY_POLICY')),
    document_version TEXT NOT NULL DEFAULT 'v1.0',
    accepted_categories JSONB DEFAULT '{"essential": true, "analytics": false, "functional": false}'::jsonb,
    user_agent TEXT,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Funções de Apoio ao Row Level Security (RLS)
CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.platform_superusers 
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = TRUE 
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(check_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = check_tenant_id 
      AND role = 'TENANT_ADMIN' 
      AND is_active = TRUE
  );
END;
$$;

-- 16. Habilitar RLS em todas as tabelas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscription_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_superusers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_point_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent_logs ENABLE ROW LEVEL SECURITY;

-- 17. Políticas RLS
DROP POLICY IF EXISTS "tenants_read" ON public.tenants;
CREATE POLICY "tenants_read" ON public.tenants FOR SELECT USING (
    public.is_platform_superadmin() OR id = public.get_auth_tenant_id()
);

DROP POLICY IF EXISTS "tenants_superadmin" ON public.tenants;
CREATE POLICY "tenants_superadmin" ON public.tenants FOR ALL USING (public.is_platform_superadmin());

-- Políticas dos Planos
DROP POLICY IF EXISTS "plans_read_all" ON public.subscription_plans;
CREATE POLICY "plans_read_all" ON public.subscription_plans FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "plans_admin_manage" ON public.subscription_plans;
CREATE POLICY "plans_admin_manage" ON public.subscription_plans FOR ALL USING (public.is_platform_superadmin());

-- Políticas de Subscrições
DROP POLICY IF EXISTS "subs_read" ON public.tenant_subscriptions;
CREATE POLICY "subs_read" ON public.tenant_subscriptions FOR SELECT USING (
    public.is_platform_superadmin() OR tenant_id = public.get_auth_tenant_id()
);

DROP POLICY IF EXISTS "subs_superadmin" ON public.tenant_subscriptions;
CREATE POLICY "subs_superadmin" ON public.tenant_subscriptions FOR ALL USING (public.is_platform_superadmin());

-- Políticas de Contratos
DROP POLICY IF EXISTS "service_role_all_tenant_contracts" ON public.tenant_subscription_contracts;
CREATE POLICY service_role_all_tenant_contracts ON public.tenant_subscription_contracts 
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'authenticated');

-- Usuários do Tenant
DROP POLICY IF EXISTS "tenant_users_read" ON public.tenant_users;
CREATE POLICY "tenant_users_read" ON public.tenant_users FOR SELECT USING (
    public.is_platform_superadmin() OR tenant_id = public.get_auth_tenant_id()
);

DROP POLICY IF EXISTS "tenant_users_manage" ON public.tenant_users;
CREATE POLICY "tenant_users_manage" ON public.tenant_users FOR ALL USING (
    public.is_platform_superadmin() OR public.is_tenant_admin(tenant_id)
);

-- Superusuários
DROP POLICY IF EXISTS "superusers_select" ON public.platform_superusers;
CREATE POLICY "superusers_select" ON public.platform_superusers FOR ALL USING (public.is_platform_superadmin());

-- Templates de Rúbricas
DROP POLICY IF EXISTS "cpt_select" ON public.control_point_templates;
CREATE POLICY "cpt_select" ON public.control_point_templates FOR SELECT USING (
    public.is_platform_superadmin() OR tenant_id IS NULL OR tenant_id = public.get_auth_tenant_id()
);

DROP POLICY IF EXISTS "cpt_admin_manage" ON public.control_point_templates;
CREATE POLICY "cpt_admin_manage" ON public.control_point_templates FOR ALL USING (public.is_platform_superadmin());

-- Auditorias Sanitárias
DROP POLICY IF EXISTS "Auditors can manage their own audits" ON public.audits;
DROP POLICY IF EXISTS "audits_view_policy" ON public.audits;
CREATE POLICY "audits_view_policy" ON public.audits FOR SELECT USING (
    public.is_platform_superadmin() OR
    (
        tenant_id = public.get_auth_tenant_id() AND
        (
            (
                COALESCE(access_scope, 'TENANT') = 'TENANT' AND
                (
                    (SELECT can_view_all_tenant_audits FROM public.tenant_users WHERE user_id = auth.uid() AND tenant_id = public.audits.tenant_id AND is_active = TRUE) = TRUE
                    OR
                    auditor_id IN (SELECT id FROM public.auditors WHERE auth_user_id = auth.uid())
                )
            )
            OR
            (
                access_scope = 'PRIVATE' AND
                auditor_id IN (SELECT id FROM public.auditors WHERE auth_user_id = auth.uid())
            )
        )
    )
);

DROP POLICY IF EXISTS "audits_insert_policy" ON public.audits;
CREATE POLICY "audits_insert_policy" ON public.audits FOR INSERT WITH CHECK (
    public.is_platform_superadmin() OR
    (
        tenant_id = public.get_auth_tenant_id() AND
        auditor_id IN (SELECT id FROM public.auditors WHERE auth_user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "audits_update_policy" ON public.audits;
CREATE POLICY "audits_update_policy" ON public.audits FOR UPDATE USING (
    public.is_platform_superadmin() OR
    (
        tenant_id = public.get_auth_tenant_id() AND
        auditor_id IN (SELECT id FROM public.auditors WHERE auth_user_id = auth.uid())
    )
);

-- Avaliações
DROP POLICY IF EXISTS "evaluations_manage" ON public.audit_evaluations;
CREATE POLICY "evaluations_manage" ON public.audit_evaluations FOR ALL USING (
    public.is_platform_superadmin() OR
    audit_id IN (
        SELECT id FROM public.audits WHERE auditor_id IN (
            SELECT id FROM public.auditors WHERE auth_user_id = auth.uid()
        )
    )
);

-- Consentimentos
DROP POLICY IF EXISTS "consent_insert" ON public.user_consent_logs;
CREATE POLICY "consent_insert" ON public.user_consent_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "consent_select" ON public.user_consent_logs;
CREATE POLICY "consent_select" ON public.user_consent_logs FOR SELECT USING (
    public.is_platform_superadmin() OR user_id = auth.uid()
);

-- 18. Popular os 30 Pontos Sanitários Padrão (tenant_id = NULL)
INSERT INTO public.control_point_templates 
(tenant_id, code, number, category, category_label, title, is_critical_ccp, legal_reference, order_index)
VALUES
(NULL, 'q1_1', '1.1', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'El diseño, distribución y dimensiones de los locales permiten un mantenimiento, limpieza y desinfección adecuados, evitando la contaminación cruzada.', FALSE, 'RD 852/2004 Anexo II Cap. I', 1),
(NULL, 'q1_2', '1.2', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Las superficies de suelos, paredes y techos son de materiales impermeables, no absorbentes, lavables, no tóxicos y sin grietas.', FALSE, 'RD 852/2004 Anexo II Cap. II', 2),
(NULL, 'q1_3', '1.3', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Las ventanas, huecos y puertas exteriores disponen de pantallas de protección contra insectos y plagas fácilmente desmontables y limpiables.', FALSE, 'RD 852/2004 Anexo II Cap. II', 3),
(NULL, 'q1_4', '1.4', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Los sistemas de drenaje, desagües y canalizaciones tienen la capacidad adecuada, disponen de rejillas y evitan reflujos u olores.', FALSE, 'RD 852/2004 Anexo II Cap. I', 4),
(NULL, 'q1_5', '1.5', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Existe ventilación suficiente (natural o mecánica) que evita la acumulación de condensación, humos, vapores y calor excesivo.', FALSE, 'RD 852/2004 Anexo II Cap. I', 5),
(NULL, 'q1_6', '1.6', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'La iluminación es adecuada en intensidad y las luminarias en zonas de manipulación disponen de protectores antirotura estancos.', FALSE, 'RD 852/2004 Anexo II Cap. I', 6),
(NULL, 'q1_7', '1.7', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Los lavamanos de accionamiento no manual están en número suficiente, con agua caliente/fría, jabón bactericida y secador o papel desechable.', TRUE, 'RD 852/2004 Anexo II Cap. I', 7),
(NULL, 'q1_8', '1.8', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Los equipos y utensilios en contacto con alimentos son de materiales lisos, resistentes a la corrosión, aptos para uso alimentario y de fácil limpieza.', FALSE, 'RD 852/2004 Anexo II Cap. V', 8),
(NULL, 'q1_9', '1.9', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Existe un plan y contrato vigente de control integrado de plagas (D+D+D) con cebos de seguridad en lugares no accesibles a alimentos.', FALSE, 'RD 852/2004 Anexo II Cap. IX', 9),
(NULL, 'q1_10', '1.10', 'INFRAESTRUCTURA', 'Infraestructura y Equipos', 'Los productos de limpieza, desinfección y químicos se almacenan en armarios cerrados e identificados, totalmente separados de alimentos.', FALSE, 'RD 852/2004 Anexo II Cap. I', 10),

(NULL, 'q2_1', '2.1', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Los manipuladores visten indumentaria exclusiva y limpia, con cabello totalmente recogido mediante cofia y sin joyas ni adornos en manos/brazos.', FALSE, 'RD 852/2004 Anexo II Cap. VIII', 11),
(NULL, 'q2_2', '2.2', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Se evidencia lavado y desinfección de manos regular: al inicio de jornada, tras pausas, cambio de tarea o uso del inodoro.', FALSE, 'RD 852/2004 Anexo II Cap. VIII', 12),
(NULL, 'q2_3', '2.3', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Los certificados de formación continuada en higiene alimentaria y manipulación están vigentes y adaptados a las tareas desarrolladas.', FALSE, 'RD 852/2004 Anexo II Cap. XII', 13),
(NULL, 'q2_4', '2.4', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Existe procedimiento documentado para notificar e intervenir ante enfermedades transmisibles (gastroenteritis, cortes, heridas o forúnculos).', FALSE, 'RD 852/2004 Anexo II Cap. VIII', 14),
(NULL, 'q2_5', '2.5', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Los apósitos y apósitos para heridas en extremidades son impermeables y de color llamativo (preferentemente azul con tira metálica detectable).', TRUE, 'ISO 22000 Cláusula 8.2', 15),
(NULL, 'q2_6', '2.6', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'No se fuma, come, bebe (excepto agua en dispensadores habilitados) ni mastica chicle en las zonas de manipulación y envasado.', FALSE, 'RD 852/2004 Anexo II Cap. VIII', 16),
(NULL, 'q2_7', '2.7', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Los vestuarios del personal están limpios, con doble taquilla individual (ropa de calle / ropa de trabalho) y sin acceso directo a obradores.', FALSE, 'RD 852/2004 Anexo II Cap. I', 17),
(NULL, 'q2_8', '2.8', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'El uso de guantes se realiza bajo protocolo: uso correcto, desechado tras cada rotura o cambio de actividad, y lavado previo de manos.', FALSE, 'Guía de Buenas Prácticas AECOSAN', 18),
(NULL, 'q2_9', '2.9', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Se respeta la separación de flujos de personal limpio y sucio, evitando que operarios de zonas sucias crucen zonas de riesgo microbiológico.', FALSE, 'ISO 22000 Cláusula 8.2', 19),
(NULL, 'q2_10', '2.10', 'HIGIENE_PERSONAL', 'Higiene del Personal y Buenas Prácticas', 'Las visitas externas (proveedores, auditores, técnicos) acceden con indumentaria protectora de un solo uso y registro de entrada sanitario.', FALSE, 'IFS Food / BRCGS Versión 9', 20),

(NULL, 'q3_1', '3.1', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'Las cámaras de refrigeración mantienen la temperatura reglamentaria (≤ 4 °C para cárnicos, ≤ 2 °C para pescados, ≤ 8 °C lácteos).', TRUE, 'RD 1021/2022 / APPCC PCC1', 21),
(NULL, 'q3_2', '3.2', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'Los congeladores y cámaras de congelación mantienen temperatura estable ≤ -18 °C y los termómetros están calibrados periódicamente.', TRUE, 'RD 1021/2022 / APPCC PCC1', 22),
(NULL, 'q3_3', '3.3', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'Existen registros diarios completados de control y seguimiento de temperaturas de cámaras, vitrinas y obradores climatizados.', FALSE, 'RD 852/2004 Art. 5 APPCC', 23),
(NULL, 'q3_4', '3.4', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'El proceso de cocción o tratamiento térmico alcanza al menos 70 °C en el centro del producto durante 2 minutos (o relación tiempo/temperatura equivalente).', TRUE, 'RD 1021/2022 / APPCC PCC2', 24),
(NULL, 'q3_5', '3.5', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'El abatimiento rápido de temperatura tras cocción pasa de 65 °C a 10 °C en menos de dos horas mediante abatidor debidamente monitorizado.', TRUE, 'RD 1021/2022 / APPCC PCC2', 25),
(NULL, 'q3_6', '3.6', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'Se garantiza la trazabilidad ascendente y descendente de cada lote mediante registro de albaranes, fechas de entrada y consumo preferente.', FALSE, 'Reglamento (CE) 178/2002 Art. 18', 26),
(NULL, 'q3_7', '3.7', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'El plan de gestión de alérgenos identifica los 14 alérgenos de declaración obligatoria, con almacenamiento segregado y fichas técnicas accesibles.', FALSE, 'Reglamento (UE) 1169/2011', 27),
(NULL, 'q3_8', '3.8', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'El agua utilizada es potable de red o con sistema propio de cloración automática y analíticas periódicas físico-químicas y microbiológicas conformes.', FALSE, 'RD 3/2023 Calidad del Agua', 28),
(NULL, 'q3_9', '3.9', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'La descongelación se efectúa en cámara frigorífica protegida (≤ 4 °C) o en equipos específicos, nunca a temperatura ambiente ni en contacto con exudados.', FALSE, 'RD 1021/2022 Art. 9', 29),
(NULL, 'q3_10', '3.10', 'APPCC_FRIO_PROCESOS', 'Plan APPCC, Cadena de Frío y Procesos', 'El plan de muestreo microbiológico de superficies, manipuladores y producto final se ejecuta con laboratorio acreditado según criterios microbiológicos.', FALSE, 'Reglamento (CE) 2073/2005', 30)
ON CONFLICT (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code) DO UPDATE SET
  is_critical_ccp = EXCLUDED.is_critical_ccp;

-- 19. Seed de Planos Comerciais e Plano Default em EUR
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

-- 20. Configuração dos Buckets de Storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('audit-evidences', 'audit-evidences', true),
  ('audit-signatures', 'audit-signatures', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

UPDATE storage.buckets SET public = false WHERE id = 'audit-signatures';

DROP POLICY IF EXISTS "Evidences upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audit evidence" ON storage.objects;
CREATE POLICY "Evidences upload" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id IN ('audit-evidences', 'audit-signatures'));

DROP POLICY IF EXISTS "Evidences public read" ON storage.objects;
DROP POLICY IF EXISTS "Public read for audit evidence" ON storage.objects;
CREATE POLICY "Evidences public read" ON storage.objects FOR SELECT USING (
    bucket_id = 'audit-evidences' OR (
        bucket_id = 'audit-signatures' AND (
            auth.role() = 'authenticated' OR public.is_platform_superadmin()
        )
    )
);

-- 21. Índices de Alta Performance (Anti N+1)
CREATE INDEX IF NOT EXISTS idx_audits_tenant_auditor ON public.audits (tenant_id, auditor_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_evaluations_audit_id ON public.audit_evaluations (audit_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_cif ON public.companies (tenant_id, cif);

-- FIM DA IMPLANTAÇÃO COMPLETA
