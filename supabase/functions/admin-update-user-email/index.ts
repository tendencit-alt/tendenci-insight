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

    // Valores válidos do enum user_role
    const validRoles = ['admin', 'vendedor', 'arquiteto', 'projetista'];

    // Se profile_type_id mudou, buscar novo role
    if (profile_type_id !== undefined && profile_type_id !== currentProfile.profile_type_id) {
      profileUpdate.profile_type_id = profile_type_id;
      
      const { data: pt } = await supabaseAdmin
        .from('profile_types')
        .select('name')
        .eq('id', profile_type_id)
        .single();

      if (pt) {
        // Só atualiza role se o nome do tipo for um valor válido do enum
        if (validRoles.includes(pt.name.toLowerCase())) {
          newRole = pt.name.toLowerCase();
          profileUpdate.role = newRole;
        } else {
          // Para tipos customizados, manter role como vendedor por padrão
          newRole = pt.name;
          profileUpdate.role = 'vendedor';
        }
      }
    }

    // Atualizar profile - CRÍTICO: se falhar, retornar erro
    if (Object.keys(profileUpdate).length > 0) {
      console.log('Atualizando profile com:', JSON.stringify(profileUpdate));
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user_id);

      if (updateError) {
        console.error('Erro ao atualizar profile:', updateError);
        return new Response(
          JSON.stringify({ error: `Erro ao atualizar perfil: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Profile atualizado com sucesso');
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
      console.log(`Recriando permissões para novo profile_type_id: ${profile_type_id}`);
      
      // Deletar permissões antigas
      const { error: deleteError } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', user_id);
      
      if (deleteError) {
        console.error('Erro ao deletar permissões antigas:', deleteError);
      }
      
      // Buscar permissões do novo tipo
      const { data: perms, error: permsError } = await supabaseAdmin
        .from('profile_type_permissions')
        .select('module, can_view, can_create, can_edit, can_delete')
        .eq('profile_type_id', profile_type_id);

      if (permsError) {
        console.error('Erro ao buscar permissões do tipo:', permsError);
      }

      if (perms && perms.length > 0) {
        console.log(`Encontradas ${perms.length} permissões para copiar`);
        
        // Inserir cada permissão individualmente para tratar erros de cast
        let successCount = 0;
        for (const p of perms) {
          try {
            const { error: insertError } = await supabaseAdmin
              .from('user_permissions')
              .insert({
                user_id,
                module: p.module as any, // Cast para o enum
                can_view: p.can_view ?? false,
                can_create: p.can_create ?? false,
                can_edit: p.can_edit ?? false,
                can_delete: p.can_delete ?? false,
              });
            
            if (insertError) {
              console.error(`Erro ao inserir permissão ${p.module}:`, insertError.message);
            } else {
              successCount++;
            }
          } catch (e) {
            console.error(`Exceção ao inserir permissão ${p.module}:`, e);
          }
        }
        console.log(`Criadas ${successCount}/${perms.length} permissões para usuário ${user_id}`);
      } else {
        console.log('Nenhuma permissão encontrada para o tipo de perfil');
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
