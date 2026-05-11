import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar se o usuário requisitante é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é admin/owner
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_owner, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !(profile?.is_owner || ['admin', 'owner', 'tenant_owner'].includes(profile?.role))) {
      throw new Error('Acesso negado. Apenas administradores podem criar usuários.');
    }

    const callerTenantId = profile?.tenant_id ?? null;

    // Criar novo usuário
    const { email, password, full_name, username, role, profile_type_id } = await req.json();

    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    // Gerar username se não fornecido
    const finalUsername = username || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) {
      throw createError;
    }

    // Atualizar role, profile_type_id e username no perfil se fornecido
    if (newUser.user) {
      const updateData: Record<string, any> = {
        username: finalUsername,
      };
      
      // Map role to valid user_role enum values
      const validRoles = ['admin', 'vendedor', 'arquiteto', 'projetista'];
      if (role === 'master') {
        updateData.role = 'admin';
      } else if (role && validRoles.includes(role)) {
        updateData.role = role;
      } else {
        // Default to vendedor for any non-standard profile type
        updateData.role = 'vendedor';
      }
      
      if (full_name) updateData.full_name = full_name;
      if (profile_type_id) updateData.profile_type_id = profile_type_id;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', newUser.user.id);

        if (updateError) {
          console.error('Erro ao atualizar perfil:', updateError);
        }
      }

      // NOTA: Permissões são criadas automaticamente pelo trigger initialize_user_permissions
      // quando o profile é atualizado com profile_type_id. Não é necessário criar aqui.
      console.log('Usuário criado. Permissões serão inicializadas pelo trigger do banco de dados.');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: 'Usuário criado com sucesso' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao criar usuário' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
