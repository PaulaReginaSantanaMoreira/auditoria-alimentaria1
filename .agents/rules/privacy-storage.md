# Privacy, Signatures & Storage Protection (GDPR / LGPD)

<!-- Workspace rule file: .agents/rules/privacy-storage.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Digital Signatures Confidentiality:**
   - The Supabase storage bucket `audit-signatures` MUST remain private (`public: false`).
   - Digital signatures must never be accessible via permanent unauthenticated public URLs.
   - For report rendering and PDF generation, access must be mediated through short-lived signed URLs (maximum 15 minutes TTL).
2. **No Base64 Bloat in Relational Databases:**
   - Raw signature images captured from HTML5 Canvas must be converted to binary buffers/PNGs and stored in Cloud Storage.
   - Database columns named `*_url` must store storage path references or URLs, never megabyte-long Base64 strings.
3. **Canvas Memory Leak Prevention:**
   - All Canvas-based touch and drawing listeners registered on `window` (e.g. in `SignatureModal.tsx`) MUST implement cleanup functions in `useEffect` removing all attached event listeners.
   - Canvas buffers must be calibrated using `window.devicePixelRatio` to prevent pixelation on Retina/High-DPI mobile devices.
4. **JWT Cryptographic Rigor:**
   - Never fall back to public keys (e.g. `NEXT_PUBLIC_SUPABASE_ANON_KEY`) or short strings for token signing.
   - `JWT_SECRET` must be at least 256 bits (32 characters) of cryptographically random entropy.

## When Enforced

- Any modification touching authentication, tokens, storage buckets, canvas components, or PDF export workflows.
