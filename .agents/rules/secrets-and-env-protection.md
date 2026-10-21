# Environment Secrets & Sensitive Files Protection

<!-- Workspace rule file: .agents/rules/secrets-and-env-protection.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Strictly Prohibited Files:**
   - The AI agent MUST NEVER read, inspect, display, cat, grep, or log any of the following files:
     - `.env.develop`
     - `.env.local`
     - `.env.production`
     - `.env`
     - Any `.env.*` file containing real keys, passwords, or tokens.
2. **Authorized Reference Template:**
   - The ONLY environment file the AI is permitted to consult is `.env.example`.
   - Use `.env.example` exclusively to verify variable names, typing, and structural requirements.
3. **Abstract Configuration Handling:**
   - Always reference credentials via `process.env.<VARIABLE_NAME>`.
   - Never output real connection strings, Supabase service keys, JWT secrets, or tokens in chat responses, artifacts, or code snippets.
   - If an environment variable is required by code, instruct the user to configure it in their local `.env.develop` or Cloudflare Worker secrets without ever reading or asking to view its value.

## When Enforced

- Permanently active across all sessions, commands, subagents, and tool executions.

## Exceptions

- NONE. This rule has zero exceptions.
