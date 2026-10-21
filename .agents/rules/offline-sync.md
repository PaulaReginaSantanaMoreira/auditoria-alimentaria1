# Offline-First & Storage Rules

<!-- Workspace rule file: .agents/rules/offline-sync.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Local-First Writes:** In-field rubric scoring and notes must be committed to local IndexedDB (`Dexie.js`) before attempting remote synchronization with Supabase.
2. **Idempotent Synchronization:** Sync workers must use idempotent upserts with optimistic versioning or timestamps (`updated_at`) to prevent overwriting field inspector data during intermittent connectivity.
3. **Evidence Storage & Canvas Signatures:**
   - Digital signatures captured on HTML5 Canvas must be serialized to clean PNG / base64 without extraneous metadata.
   - High-resolution camera photos must be compressed on the client before being queued in IndexedDB to avoid exhausting mobile storage or exceeding Cloudflare Worker upload payload limits.
4. **Supabase Row Level Security (RLS):** All Supabase tables (`audits`, `companies`, `evidence_photos`) must have RLS active. Queries must be constrained by authenticated user session/tenant.

## When Enforced

- Any modification touching `src/infrastructure/offline/`, `src/infrastructure/database/supabase/`, or canvas/camera UI components.

## Exceptions

- Desktop-only administrative reporting views that query Supabase directly via server components.
