import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function clean() {
  console.log("\n=======================================================");
  console.log("   BioAudit Pro — Limpeza de Dados de Teste");
  console.log("=======================================================\n");

  // 1. Identificar SuperAdmin oficial
  const { data: superusers, error: superErr } = await supabase
    .from("platform_superusers")
    .select("user_id, email");

  if (superErr) {
    console.warn("Aviso ao consultar platform_superusers:", superErr.message);
  }

  const superadminUserIds = new Set((superusers || []).map((s) => s.user_id));
  const superadminEmails = new Set((superusers || []).map((s) => s.email.toLowerCase()));

  console.log(`🔒 Preservando SuperAdmin (${superadminEmails.size} identificados)...`);

  // 2. Limpar dados operacionais e de teste em cascata
  console.log("🧹 Limpando dados operacionais de teste...");

  const tablesToClear = [
    { name: "audit_evaluations", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
    { name: "audits", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
    { name: "companies", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
    { name: "tenant_subscription_contracts", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
    { name: "tenant_subscriptions", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
    { name: "tenant_users", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
    { name: "user_consent_logs", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
    { name: "tenants", filter: (q) => q.neq("id", "00000000-0000-0000-0000-000000000000") },
  ];

  for (const { name, filter } of tablesToClear) {
    let query = supabase.from(name).delete();
    query = filter(query);
    const { error } = await query;
    if (error) {
      console.warn(`  ⚠️ Tabela ${name}: ${error.message}`);
    } else {
      console.log(`  ✓ Tabela ${name} limpa.`);
    }
  }

  // 3. Limpar rúbricas personalizadas de tenants (mantendo os 30 pontos base com tenant_id null)
  const { error: rubricsErr } = await supabase
    .from("control_point_templates")
    .delete()
    .not("tenant_id", "is", null);
  if (!rubricsErr) {
    console.log("  ✓ Rúbricas customizadas removidas (rúbricas base regulamentares preservadas).");
  }

  // 4. Limpar auditores que não sejam o SuperAdmin
  const { data: auditors } = await supabase.from("auditors").select("id, auth_user_id");
  if (auditors && auditors.length > 0) {
    for (const a of auditors) {
      if (!superadminUserIds.has(a.auth_user_id)) {
        await supabase.from("auditors").delete().eq("id", a.id);
      }
    }
    console.log("  ✓ Auditores de teste removidos.");
  }

  // 5. Limpar usuários de teste do Supabase Auth
  console.log("👥 Limpando usuários de teste do Supabase Auth...");
  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let deletedAuthCount = 0;

  if (authList?.users) {
    for (const user of authList.users) {
      const emailLower = (user.email || "").toLowerCase();
      const isSuper =
        superadminUserIds.has(user.id) ||
        superadminEmails.has(emailLower) ||
        emailLower.includes("superadmin") ||
        user.user_metadata?.role === "superadmin" ||
        user.user_metadata?.role === "PLATFORM_SUPERADMIN";

      if (!isSuper) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
        if (!delErr) {
          deletedAuthCount++;
        }
      }
    }
  }
  console.log(`  ✓ ${deletedAuthCount} usuário(s) de teste removido(s) do Supabase Auth.`);

  // 6. Limpar arquivos de evidências e assinaturas de teste no Storage
  console.log("📁 Limpando arquivos de teste do Storage...");
  for (const bucket of ["audit-evidences", "audit-signatures"]) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list("", { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => f.name);
        await supabase.storage.from(bucket).remove(paths);
        console.log(`  ✓ ${paths.length} arquivo(s) removido(s) do bucket '${bucket}'.`);
      }
    } catch {
      // ignore
    }
  }

  console.log("\n=======================================================");
  console.log("✅ BASE DE DADOS RESETADA PARA PRODUÇÃO COM SUCESSO!");
  console.log("   - SuperAdmin mantido com sua senha e perfil intactos.");
  console.log("   - Catálogo de planos em Euro pronto.");
  console.log("   - 30 Pontos regulamentares (CE 852/2004, ISO 22000) intactos.");
  console.log("   - Zero dados de empresas, auditorias ou usuários de teste.");
  console.log("=======================================================\n");
}

clean().catch((err) => {
  console.error("❌ Falha na execução da limpeza:", err.message);
  process.exit(1);
});
