import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    const { user_id, new_email, email, full_name, username, profile_type_id, especializacao } = body;

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
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar qual email usar
    const finalEmail = email || new_email;

    // Preparar dados para update
    const profileUpdate: Record<string, unknown> = {};
    
    if (finalEmail !== undefined) profileUpdate.email = finalEmail;
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (username !== undefined) profileUpdate.username = username;
    if (especializacao !== undefined) profileUpdate.especializacao = especializacao;

    let newRole = null;

    // Se profile_type_id mudou, buscar novo role
    if (profile_type_id !== undefined && profile_type_id !== currentProfile.profile_type_id) {
      profileUpdate.profile_type_id = profile_type_id;
      
      const { data: pt } = await supabaseAdmin
        .from('profile_types')
        .select('name')
        .eq('id', profile_type_id)
        .single();

      if (pt) {
        newRole = pt.name;
        profileUpdate.role = newRole;
      }
    }

    // Atualizar profile
    if (Object.keys(profileUpdate).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user_id);

      if (updateError) {
        console.error('Erro ao atualizar profile:', updateError);
      }
    }

    // Atualizar email no auth.users se mudou
    if (finalEmail && finalEmail !== currentProfile.email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email: finalEmail,
      });

      if (authError) {
        console.error('Erro ao atualizar email no auth:', authError);
      }
    }

    // Recriar permissões se tipo de perfil mudou
    if (profile_type_id && profile_type_id !== currentProfile.profile_type_id) {
      // Deletar permissões antigas
      await supabaseAdmin.from('user_permissions').delete().eq('user_id', user_id);
      
      // Buscar permissões do novo tipo
      const { data: perms } = await supabaseAdmin
        .from('profile_type_permissions')
        .select('*')
        .eq('profile_type_id', profile_type_id);

      if (perms && perms.length > 0) {
        const newPerms = perms.map(p => ({
          user_id,
          module: p.module,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }));
        await supabaseAdmin.from('user_permissions').insert(newPerms);
        console.log(`Criadas ${newPerms.length} permissões para usuário ${user_id}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, new_role: newRole }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
