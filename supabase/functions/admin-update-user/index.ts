import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { 
      user_id, 
      email, 
      full_name, 
      username, 
      profile_type_id, 
      especializacao 
    } = await req.json();

    console.log('Atualizando usuário:', { user_id, email, full_name, username, profile_type_id, especializacao });

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados atuais do usuário
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('email, profile_type_id')
      .eq('id', user_id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar perfil atual:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados para atualização do profile
    const profileUpdate: Record<string, any> = {};
    
    if (email !== undefined) profileUpdate.email = email;
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (username !== undefined) profileUpdate.username = username;
    if (especializacao !== undefined) profileUpdate.especializacao = especializacao;
    
    // Se o profile_type_id mudou, buscar o novo tipo e atualizar role
    let newRole = null;
    if (profile_type_id !== undefined && profile_type_id !== currentProfile.profile_type_id) {
      profileUpdate.profile_type_id = profile_type_id;
      
      // Buscar o nome do novo tipo de perfil para atualizar o role
      const { data: newProfileType, error: typeError } = await supabaseAdmin
        .from('profile_types')
        .select('name')
        .eq('id', profile_type_id)
        .single();

      if (typeError) {
        console.error('Erro ao buscar tipo de perfil:', typeError);
        return new Response(
          JSON.stringify({ error: 'Tipo de perfil não encontrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      newRole = newProfileType.name;
      profileUpdate.role = newRole;
      
      console.log('Atualizando role para:', newRole);
    }

    // Atualizar o profile
    if (Object.keys(profileUpdate).length > 0) {
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user_id);

      if (updateProfileError) {
        console.error('Erro ao atualizar profile:', updateProfileError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar dados do usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Se o email mudou, atualizar no auth.users
    if (email && email !== currentProfile.email) {
      console.log('Atualizando email no auth.users para:', email);
      
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { email }
      );

      if (authError) {
        console.warn('Aviso ao atualizar email no auth:', authError);
        // Não retornar erro, pois o profile já foi atualizado
      }
    }

    // Se o profile_type_id mudou, recriar permissões do usuário
    if (profile_type_id !== undefined && profile_type_id !== currentProfile.profile_type_id) {
      console.log('Recriando permissões para o novo tipo de perfil...');
      
      // Deletar permissões antigas
      const { error: deleteError } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', user_id);

      if (deleteError) {
        console.warn('Aviso ao deletar permissões antigas:', deleteError);
      }

      // Buscar permissões do novo tipo de perfil
      const { data: typePermissions, error: permError } = await supabaseAdmin
        .from('profile_type_permissions')
        .select('*')
        .eq('profile_type_id', profile_type_id);

      if (!permError && typePermissions && typePermissions.length > 0) {
        // Criar novas permissões baseadas no tipo de perfil
        const newPermissions = typePermissions.map(p => ({
          user_id,
          module: p.module,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }));

        const { error: insertError } = await supabaseAdmin
          .from('user_permissions')
          .insert(newPermissions);

        if (insertError) {
          console.warn('Aviso ao criar novas permissões:', insertError);
        } else {
          console.log(`${newPermissions.length} permissões criadas com sucesso`);
        }
      }
    }

    console.log('Usuário atualizado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário atualizado com sucesso',
        updated_fields: Object.keys(profileUpdate),
        new_role: newRole
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Erro inesperado:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
