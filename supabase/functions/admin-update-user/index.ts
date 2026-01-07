import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { user_id, email, full_name, username, profile_type_id, especializacao } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Buscar dados atuais
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('email, profile_type_id')
      .eq('id', user_id)
      .single();

    if (fetchError) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Preparar update
    const profileUpdate: Record<string, unknown> = {};
    if (email !== undefined) profileUpdate.email = email;
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (username !== undefined) profileUpdate.username = username;
    if (especializacao !== undefined) profileUpdate.especializacao = especializacao;

    let newRole = null;
    
    // Se profile_type mudou
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
      await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', user_id);
    }

    // Atualizar email no auth se mudou
    if (email && email !== currentProfile.email) {
      await supabaseAdmin.auth.admin.updateUserById(user_id, { email });
    }

    // Recriar permissões se tipo mudou
    if (profile_type_id && profile_type_id !== currentProfile.profile_type_id) {
      await supabaseAdmin.from('user_permissions').delete().eq('user_id', user_id);
      
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
      }
    }

    return new Response(
      JSON.stringify({ success: true, new_role: newRole }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    return new Response(JSON.stringify({ error: msg }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
