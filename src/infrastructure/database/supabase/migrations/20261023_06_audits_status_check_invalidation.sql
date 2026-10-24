-- Migration: 20261023_06_audits_status_check_invalidation.sql
-- Descripción: Actualiza el check constraint de status en audits para permitir 'INVALIDATED' y asegura columnas de trazabilidad

DO $$
BEGIN
    -- 1. Asegurar columnas de auditoría de anulación
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'audits' AND column_name = 'invalidated_at'
    ) THEN
        ALTER TABLE public.audits ADD COLUMN invalidated_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'audits' AND column_name = 'invalidated_by'
    ) THEN
        ALTER TABLE public.audits ADD COLUMN invalidated_by TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'audits' AND column_name = 'invalidation_reason'
    ) THEN
        ALTER TABLE public.audits ADD COLUMN invalidation_reason TEXT;
    END IF;

    -- 2. Actualizar constraint audits_status_check para incluir 'INVALIDATED'
    ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_status_check;

    ALTER TABLE public.audits 
        ADD CONSTRAINT audits_status_check 
        CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'EVALUATED', 'SIGNED', 'FINALIZED', 'INVALIDATED'));

    RAISE NOTICE 'BioAudit Pro: Constraint audits_status_check actualizado con INVALIDATED.';
END $$;
