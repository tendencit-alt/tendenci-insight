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

    // Verificar se é admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Acesso negado. Apenas administradores podem criar usuários.');
    }

    // Criar novo usuário
    const { email, password, full_name, role, profile_type_id } = await req.json();

    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) {
      throw createError;
    }

    // Atualizar role e profile_type_id no perfil se fornecido
    if (newUser.user) {
      const updateData: Record<string, any> = {};
      
      if (role) updateData.role = role;
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

      // Criar permissões do usuário baseadas no tipo de perfil
      if (profile_type_id) {
        // Buscar permissões padrão do tipo de perfil
        const { data: defaultPermissions, error: permError } = await supabaseAdmin
          .from('profile_type_permissions')
          .select('module, can_view, can_create, can_edit, can_delete')
          .eq('profile_type_id', profile_type_id);

        if (permError) {
          console.error('Erro ao buscar permissões padrão:', permError);
        } else if (defaultPermissions && defaultPermissions.length > 0) {
          // Criar permissões para o novo usuário
          const userPermissions = defaultPermissions.map((p: any) => ({
            user_id: newUser.user!.id,
            module: p.module,
            can_view: p.can_view ?? true,
            can_create: p.can_create ?? false,
            can_edit: p.can_edit ?? false,
            can_delete: p.can_delete ?? false
          }));

          const { error: insertPermError } = await supabaseAdmin
            .from('user_permissions')
            .insert(userPermissions);

          if (insertPermError) {
            console.error('Erro ao criar permissões do usuário:', insertPermError);
          } else {
            console.log(`Criadas ${userPermissions.length} permissões para o usuário ${newUser.user!.id}`);
          }
        } else {
          console.log('Nenhuma permissão padrão encontrada para o tipo de perfil:', profile_type_id);
        }
      }
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
