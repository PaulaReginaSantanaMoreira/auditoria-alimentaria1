import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPERADMIN_INITIAL_EMAIL || process.argv[2];
const password = process.argv[2] && process.argv[2] !== email ? process.argv[2] : (process.argv[3] || "Admin1234!");

if (!supabaseUrl || !serviceKey) {
  console.error("ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.");
  process.exit(1);
}

if (!email) {
  console.error("ERRO: E-mail não informado. Defina SUPERADMIN_INITIAL_EMAIL ou passe como argumento.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log(`Configurando SuperAdmin para: ${email}...`);

  // 1. Verificar se o usuário já existe no Auth
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError.message);
    process.exit(1);
  }

  const existing = (usersData?.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existing) {
    console.log(`Usuário já existe no Auth (ID: ${existing.id}). Atualizando senha com hash de mão única...`);
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: "SuperAdministrador Master", role: "superadmin" },
    });
    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError.message);
      process.exit(1);
    }
    userId = updated.user.id;
  } else {
    console.log("Criando novo usuário no Supabase Auth com senha em hash de mão única...");
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "SuperAdministrador Master", role: "superadmin" },
    });
    if (createError) {
      console.error("Erro ao criar usuário:", createError.message);
      process.exit(1);
    }
    userId = created.user.id;
  }

  // 2. Vincular na tabela platform_superusers
  const { error: suError } = await supabase
    .from("platform_superusers")
    .upsert({ user_id: userId, email }, { onConflict: "email" });

  if (suError) {
    console.error("Erro ao registrar em platform_superusers:", suError.message);
    process.exit(1);
  }

  console.log("✅ SuperAdmin configurado e promovido com sucesso no Supabase!");
  console.log(`E-mail: ${email}`);
  console.log(`User ID: ${userId}`);
}

run().catch(err => {
  console.error("Falha inesperada:", err.message);
  process.exit(1);
});
