import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching IA config...');

    // Fetch all configs
    const { data: configData, error: configError } = await supabase
      .from('tendenci_ia_config')
      .select('*');

    if (configError) {
      console.error('Error fetching config:', configError);
      throw configError;
    }

    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from('tendenci_ia_produtos')
      .select('*')
      .eq('ativo', true);

    if (productsError) {
      console.error('Error fetching products:', productsError);
    }

    // Fetch knowledge base
    const { data: conhecimento, error: conhecimentoError } = await supabase
      .from('tendenci_ia_conhecimento')
      .select('*')
      .eq('ativo', true);

    if (conhecimentoError) {
      console.error('Error fetching conhecimento:', conhecimentoError);
    }

    // Parse configs into a map
    const configs: Record<string, any> = {};
    let totalVersion = 0;
    let latestUpdate = new Date(0);

    configData?.forEach((item: any) => {
      configs[item.secao] = item.config || {};
      totalVersion += item.versao || 1;
      const updated = new Date(item.updated_at);
      if (updated > latestUpdate) latestUpdate = updated;
    });

    // Build the master prompt
    const promptSections: string[] = [];

    // 1. IDENTIDADE
    const identidade = configs.identidade || {};
    promptSections.push(`# IDENTIDADE
Você é ${identidade.nome_ia || 'Assistente Tendenci'}, um${identidade.genero === 'feminino' ? 'a' : ''} assistente virtual ${identidade.genero || 'masculino'}.
Personalidade: ${identidade.personalidade || 'profissional e prestativo'}
Tom de voz: ${identidade.tom_voz || 'amigável e profissional'}
${identidade.descricao_personalidade || ''}`);

    // 2. EMPRESA/NEGÓCIO
    const negocio = configs.negocio || {};
    promptSections.push(`# EMPRESA
Nome: ${negocio.nome_empresa || 'Tendenci'}
Ramo: ${negocio.ramo || 'Móveis e decoração'}
Localização: ${negocio.localizacao || ''}
Horário de funcionamento: ${negocio.horario_funcionamento || ''}
Descrição: ${negocio.descricao || ''}
Diferenciais: ${Array.isArray(negocio.diferenciais) ? negocio.diferenciais.join(', ') : ''}`);

    // 3. COMUNICAÇÃO
    const comunicacao = configs.comunicacao || {};
    const regrasComMsg: string[] = [];
    if (comunicacao.tamanho_max_msg) regrasComMsg.push(`- Limite suas respostas a no máximo ${comunicacao.tamanho_max_msg} caracteres`);
    if (comunicacao.usar_emojis) regrasComMsg.push('- Use emojis moderadamente para tornar a conversa mais amigável');
    if (comunicacao.usar_formatacao) regrasComMsg.push('- Use formatação (negrito, listas) quando apropriado');
    
    promptSections.push(`# COMUNICAÇÃO
${regrasComMsg.join('\n')}
${comunicacao.msg_boas_vindas ? `Mensagem de boas-vindas: "${comunicacao.msg_boas_vindas}"` : ''}
${comunicacao.msg_ausencia ? `Fora do horário: "${comunicacao.msg_ausencia}"` : ''}
${comunicacao.assinatura ? `Assinatura: "${comunicacao.assinatura}"` : ''}`);

    // 4. QUALIFICAÇÃO
    const qualificacao = configs.qualificacao || {};
    const perguntas = qualificacao.perguntas_qualificacao || [];
    const criterios = qualificacao.criterios_classificacao || {};
    
    let qualSection = `# QUALIFICAÇÃO DE LEADS\n`;
    if (perguntas.length > 0) {
      qualSection += `Perguntas importantes a fazer:\n${perguntas.map((p: any, i: number) => `${i + 1}. ${p.pergunta} ${p.obrigatoria ? '(obrigatória)' : ''}`).join('\n')}\n`;
    }
    if (criterios.quente || criterios.morno || criterios.frio) {
      qualSection += `\nClassificação de temperatura:
- Quente: ${criterios.quente || 'Cliente pronto para comprar'}
- Morno: ${criterios.morno || 'Cliente interessado mas com dúvidas'}
- Frio: ${criterios.frio || 'Cliente apenas pesquisando'}`;
    }
    promptSections.push(qualSection);

    // 5. VENDAS
    const vendas = configs.vendas || {};
    let vendasSection = `# TÉCNICAS DE VENDAS\n`;
    
    if (vendas.tecnicas && Array.isArray(vendas.tecnicas)) {
      vendasSection += `Técnicas a usar:\n${vendas.tecnicas.map((t: any) => `- ${t.nome}: ${t.descricao}`).join('\n')}\n`;
    }
    if (vendas.gatilhos && Array.isArray(vendas.gatilhos)) {
      vendasSection += `\nGatilhos mentais:\n${vendas.gatilhos.map((g: any) => `- ${g.tipo}: ${g.exemplo}`).join('\n')}\n`;
    }
    if (vendas.objecoes && Array.isArray(vendas.objecoes)) {
      vendasSection += `\nTratamento de objeções:\n${vendas.objecoes.map((o: any) => `- "${o.objecao}" → ${o.resposta}`).join('\n')}`;
    }
    promptSections.push(vendasSection);

    // 6. PRODUTOS
    if (products && products.length > 0) {
      let prodSection = `# PRODUTOS DISPONÍVEIS\n`;
      products.forEach((p: any) => {
        prodSection += `\n## ${p.nome}
Categoria: ${p.categoria || 'Geral'}
Preço: ${p.preco_min && p.preco_max ? `R$ ${p.preco_min} - R$ ${p.preco_max}` : 'Sob consulta'}
${p.descricao || ''}
${p.quando_oferecer ? `Oferecer quando: ${p.quando_oferecer}` : ''}
${p.diferenciais && p.diferenciais.length > 0 ? `Diferenciais: ${p.diferenciais.join(', ')}` : ''}`;
      });
      promptSections.push(prodSection);
    }

    // 7. CONHECIMENTO
    if (conhecimento && conhecimento.length > 0) {
      let conhecSection = `# BASE DE CONHECIMENTO\n`;
      conhecimento.forEach((c: any) => {
        conhecSection += `\n## ${c.titulo} (${c.tipo})
${c.conteudo}
${c.palavras_chave && c.palavras_chave.length > 0 ? `Tags: ${c.palavras_chave.join(', ')}` : ''}`;
      });
      promptSections.push(conhecSection);
    }

    // 8. COMPORTAMENTO
    const comportamento = configs.comportamento || {};
    let compSection = `# COMPORTAMENTO\n`;
    
    if (comportamento.nunca_fazer && Array.isArray(comportamento.nunca_fazer)) {
      compSection += `\nNUNCA faça:\n${comportamento.nunca_fazer.map((n: string) => `- ${n}`).join('\n')}\n`;
    }
    if (comportamento.sempre_fazer && Array.isArray(comportamento.sempre_fazer)) {
      compSection += `\nSEMPRE faça:\n${comportamento.sempre_fazer.map((s: string) => `- ${s}`).join('\n')}\n`;
    }
    if (comportamento.limites) {
      compSection += `\nLimites: ${comportamento.limites}\n`;
    }
    if (comportamento.nivel_insistencia) {
      compSection += `Nível de insistência: ${comportamento.nivel_insistencia}\n`;
    }
    if (comportamento.quando_transferir_humano) {
      compSection += `Transferir para humano quando: ${comportamento.quando_transferir_humano}`;
    }
    promptSections.push(compSection);

    // 9. REGRAS
    const regras = configs.regras || {};
    if (regras.regras_personalizadas && Array.isArray(regras.regras_personalizadas) && regras.regras_personalizadas.length > 0) {
      let regrasSection = `# REGRAS ESPECIAIS\n`;
      regras.regras_personalizadas.forEach((r: any, i: number) => {
        regrasSection += `${i + 1}. ${r.regra}${r.prioridade ? ` (Prioridade: ${r.prioridade})` : ''}\n`;
      });
      if (regras.excecoes && Array.isArray(regras.excecoes) && regras.excecoes.length > 0) {
        regrasSection += `\nExceções:\n${regras.excecoes.map((e: string) => `- ${e}`).join('\n')}`;
      }
      promptSections.push(regrasSection);
    }

    // Combine all sections
    const masterPrompt = promptSections.join('\n\n---\n\n');

    console.log('Master prompt generated successfully, version:', totalVersion);

    return new Response(
      JSON.stringify({
        success: true,
        prompt: masterPrompt,
        version: totalVersion,
        updated_at: latestUpdate.toISOString(),
        sections: {
          identidade: !!configs.identidade,
          negocio: !!configs.negocio,
          comunicacao: !!configs.comunicacao,
          qualificacao: !!configs.qualificacao,
          vendas: !!configs.vendas,
          produtos: products?.length || 0,
          conhecimento: conhecimento?.length || 0,
          comportamento: !!configs.comportamento,
          regras: !!configs.regras
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error generating master prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
