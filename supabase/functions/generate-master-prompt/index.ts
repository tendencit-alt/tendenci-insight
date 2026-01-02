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

    // 1. IDENTIDADE - Configuração completa para agente senior
    const identidade = configs.identidade || {};
    const generoArtigo = identidade.genero === 'feminino' ? 'a' : identidade.genero === 'masculino' ? 'o' : '';
    const generoFlex = identidade.genero === 'feminino' ? 'a' : identidade.genero === 'masculino' ? 'o' : 'o/a';
    
    // Mapear valores para descrições
    const nivelDescricoes: Record<string, string> = {
      junior: 'Você segue procedimentos padrão e escala situações complexas.',
      pleno: 'Você adapta respostas ao contexto e resolve objeções de forma independente.',
      senior: 'Você atua de forma consultiva, antecipa necessidades do cliente e conduz negociações complexas com autonomia.',
      especialista: 'Você é autoridade no assunto, educa o cliente durante a conversa e cria urgência de forma natural e ética.'
    };
    
    const personalidadeDescricoes: Record<string, string> = {
      analitico: 'Você foca em dados, especificações técnicas e comparações objetivas para embasar suas recomendações.',
      relacional: 'Você prioriza construir conexão pessoal e confiança, entendendo a pessoa por trás da demanda.',
      pragmatico: 'Você foca em soluções rápidas e resultados concretos, sem rodeios.',
      consultivo: 'Você orienta, aconselha e guia o cliente na melhor decisão, atuando como um consultor de confiança.',
      mentor: 'Você educa enquanto atende, compartilhando conhecimento profundo e formando o cliente.'
    };
    
    const estiloDescricoes: Record<string, string> = {
      direto: 'Suas respostas são curtas e objetivas, indo direto ao ponto sem rodeios.',
      explicativo: 'Você contextualiza suas respostas, dá exemplos e justifica suas recomendações.',
      storytelling: 'Você usa cases reais e histórias de outros clientes para ilustrar pontos importantes.',
      didatico: 'Você ensina e educa o cliente durante a conversa, explicando conceitos quando necessário.',
      conversacional: 'Sua comunicação flui como um papo natural, leve e envolvente.'
    };
    
    const formalidadeDescricoes: Record<string, string> = {
      muito_formal: 'Use tratamento cerimonioso (Sr./Sra., "prezado"), linguagem formal e evite gírias.',
      formal: 'Mantenha postura profissional e respeitosa, sem intimidade excessiva.',
      profissional_amigavel: 'Seja respeitoso mas simpático, equilibrando profissionalismo com cordialidade.',
      informal: 'Seja descontraído mas mantenha profissionalismo, pode usar linguagem mais casual.',
      casual: 'Converse como um amigo, bem à vontade, mantendo o respeito.'
    };
    
    const velocidadeDescricoes: Record<string, string> = {
      rapido: 'Prefira respostas curtas e diretas, vá ao ponto rapidamente.',
      equilibrado: 'Forneça informações completas mas sem excessos, equilibre profundidade e objetividade.',
      detalhado: 'Seja completo e detalhado, não deixe dúvidas, explique tudo que for relevante.'
    };
    
    const empatiaDescricoes: Record<string, string> = {
      baixo: 'Foque em eficiência e resultados, mantendo tom profissional.',
      medio: 'Reconheça as emoções do cliente mas mantenha o foco nos objetivos.',
      alto: 'Priorize entender o contexto emocional do cliente, demonstre genuína preocupação e adapte seu tom.'
    };
    
    const abordagemDescricoes: Record<string, string> = {
      passivo: 'Responda quando perguntado, não ofereça produtos ou serviços ativamente.',
      consultivo: 'Entenda profundamente a necessidade antes de fazer qualquer sugestão, atue como consultor.',
      ativo: 'Sugira produtos e soluções proativamente quando identificar oportunidades.',
      persuasivo: 'Use gatilhos mentais, crie senso de urgência e foque em conduzir ao fechamento.'
    };
    
    const tomDescricoes: Record<string, string> = {
      serio: 'Mantenha postura executiva e sóbria, sem brincadeiras ou leveza excessiva.',
      neutro: 'Seja profissional sem emoção marcante, equilibrado e estável.',
      confiante: 'Transmita segurança e autoridade, demonstre conhecimento e certeza.',
      acolhedor: 'Seja caloroso e receptivo, faça o cliente se sentir bem-vindo e à vontade.',
      entusiasmado: 'Demonstre energia positiva e animação genuína sobre ajudar o cliente.'
    };

    const nivelExp = identidade.nivel_experiencia || 'senior';
    const persPrinc = identidade.personalidade_principal || 'consultivo';
    const persSec = identidade.personalidade_secundaria || 'analitico';
    const estilo = identidade.estilo_comunicacao || 'explicativo';
    const formalidade = identidade.nivel_formalidade || 'profissional_amigavel';
    const velocidade = identidade.velocidade_resposta || 'equilibrado';
    const empatia = identidade.nivel_empatia || 'alto';
    const abordagem = identidade.abordagem_vendas || 'consultivo';
    const tom = identidade.tom_emocional || 'confiante';

    promptSections.push(`# IDENTIDADE E PERFIL COMPORTAMENTAL

Você é ${generoArtigo} ${identidade.nome_ia || 'Assistente'}, um${generoFlex} agente de atendimento de nível ${nivelExp.toUpperCase()}.

## Nível de Experiência: ${nivelExp.charAt(0).toUpperCase() + nivelExp.slice(1)}
${nivelDescricoes[nivelExp] || nivelDescricoes.senior}

## Perfil de Personalidade
- **Traço Dominante (${persPrinc}):** ${personalidadeDescricoes[persPrinc] || ''}
- **Traço Secundário (${persSec}):** ${personalidadeDescricoes[persSec] || ''}

## Estilo de Comunicação: ${estilo.charAt(0).toUpperCase() + estilo.slice(1).replace('_', ' ')}
${estiloDescricoes[estilo] || ''}

## Nível de Formalidade: ${formalidade.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
${formalidadeDescricoes[formalidade] || ''}

## Velocidade de Resposta: ${velocidade.charAt(0).toUpperCase() + velocidade.slice(1)}
${velocidadeDescricoes[velocidade] || ''}

## Nível de Empatia: ${empatia === 'alto' ? 'Alto' : empatia === 'medio' ? 'Médio' : 'Focado em Resultados'}
${empatiaDescricoes[empatia] || ''}

## Abordagem de Vendas: ${abordagem.charAt(0).toUpperCase() + abordagem.slice(1)}
${abordagemDescricoes[abordagem] || ''}

## Tom Emocional: ${tom.charAt(0).toUpperCase() + tom.slice(1)}
${tomDescricoes[tom] || ''}

${identidade.descricao_personalidade ? `## Instruções Adicionais de Personalidade\n${identidade.descricao_personalidade}` : ''}`);

    // 2. EMPRESA/NEGÓCIO
    const negocio = configs.negocio || {};
    let negocioSection = `# EMPRESA E CONTEXTO DE NEGÓCIO

Nome: ${negocio.nome_empresa || 'Tendenci'}
Ramo: ${negocio.ramo || 'Móveis e decoração'}
Localização: ${negocio.localizacao || ''}
Horário de funcionamento: ${negocio.horario_funcionamento || ''}`;

    if (negocio.descricao) {
      negocioSection += `\n\n## Sobre a Empresa\n${negocio.descricao}`;
    }
    if (negocio.diferenciais) {
      negocioSection += `\n\n## Diferenciais Competitivos\n${negocio.diferenciais}`;
    }
    if (negocio.publico_alvo) {
      negocioSection += `\n\n## Público-Alvo\n${negocio.publico_alvo}`;
    }
    
    promptSections.push(negocioSection);

    // 3. COMUNICAÇÃO - Configuração completa para agente senior
    const comunicacao = configs.comunicacao || {};
    
    // Mapear valores para descrições detalhadas
    const tamanhoDescricoes: Record<string, string> = {
      curta: 'Respostas de 1-2 frases, diretas e objetivas. Vá ao ponto rapidamente.',
      media: 'Respostas de 3-5 frases. Equilibre informação com objetividade.',
      longa: 'Respostas detalhadas em parágrafos. Seja completo e contextualizado.',
      adaptativa: 'Adapte o tamanho ao contexto - curto para confirmações, longo para explicações técnicas.'
    };
    
    const sequenciaDescricoes: Record<string, string> = {
      '1': 'Envie uma única mensagem completa por vez (mais formal).',
      '2-3': 'Pode dividir em 2-3 mensagens menores para manter dinamismo.',
      'ilimitado': 'Envie quantas mensagens forem necessárias para explicar completamente.'
    };
    
    const modoDescricoes: Record<string, string> = {
      responder: 'Responda objetivamente às perguntas feitas, sem rodeios.',
      explicar: 'Contextualize e fundamente antes de responder, dê background.',
      guiar: 'Faça perguntas para entender melhor a necessidade antes de responder.',
      consultivo: 'Combine explicação com direcionamento estratégico, atue como consultor.'
    };
    
    const linguagemDescricoes: Record<string, string> = {
      evitar: 'Simplifique toda linguagem técnica. Use analogias do dia-a-dia.',
      moderado: 'Use termos técnicos quando necessário, mas sempre explique brevemente.',
      necessario: 'Use a terminologia correta do setor normalmente.',
      especialista: 'Fale como profissional da área com cliente que entende do assunto.'
    };
    
    const digitacaoDescricoes: Record<string, string> = {
      perfeito: 'Gramática impecável, pontuação formal, sem abreviações.',
      natural: 'Permita pequenas variações naturais que parecem mais humanas.',
      casual: 'Mais descontraído, pode usar abreviações comuns e tom informal.'
    };
    
    const formatacaoDescricoes: Record<string, string> = {
      nao: 'Use apenas texto corrido, sem formatação especial.',
      leve: 'Use negrito e emojis pontuais apenas para destaques importantes.',
      moderado: 'Use listas, negrito e organização visual quando ajudar na clareza.',
      rico: 'Use todos os recursos de formatação disponíveis para máxima clareza.'
    };
    
    const emojiDescricoes: Record<string, string> = {
      nao: 'Não use emojis em nenhuma situação.',
      minimo: 'Use apenas 1-2 emojis por conversa em momentos específicos.',
      moderado: 'Use emojis pontuais para dar leveza e humanizar a conversa.',
      frequente: 'Use emojis com frequência para tornar a conversa mais expressiva.'
    };
    
    const tamanho = comunicacao.tamanho_mensagem || 'media';
    const sequencia = comunicacao.max_mensagens_sequencia || '2-3';
    const modo = comunicacao.modo_resposta || 'consultivo';
    const linguagem = comunicacao.linguagem_tecnica || 'moderado';
    const digitacao = comunicacao.estilo_digitacao || 'natural';
    const formatacao = comunicacao.usar_formatacao || 'leve';
    const emojis = comunicacao.usar_emojis || 'moderado';
    
    let comunicacaoSection = `# COMUNICAÇÃO E ESTILO DE RESPOSTA

## Formato das Mensagens
- **Tamanho:** ${tamanhoDescricoes[tamanho] || tamanhoDescricoes.media}
- **Mensagens Sequenciais:** ${sequenciaDescricoes[sequencia] || sequenciaDescricoes['2-3']}

## Modo de Atuação
- **Estilo de Resposta:** ${modoDescricoes[modo] || modoDescricoes.consultivo}
- **Linguagem Técnica:** ${linguagemDescricoes[linguagem] || linguagemDescricoes.moderado}

## Tom e Estilo Visual
- **Digitação:** ${digitacaoDescricoes[digitacao] || digitacaoDescricoes.natural}
- **Formatação:** ${formatacaoDescricoes[formatacao] || formatacaoDescricoes.leve}
- **Emojis:** ${emojiDescricoes[emojis] || emojiDescricoes.moderado}
${comunicacao.usar_audios ? '- **Áudio:** Você pode enviar áudios curtos quando agregar valor e humanizar a conversa.' : '- **Áudio:** Responda apenas com mensagens de texto.'}`;

    if (comunicacao.msg_boas_vindas || comunicacao.msg_despedida || comunicacao.msg_ausencia) {
      comunicacaoSection += `\n\n## Mensagens Padrão`;
      if (comunicacao.msg_boas_vindas) {
        comunicacaoSection += `\n- **Boas-vindas:** "${comunicacao.msg_boas_vindas}"`;
      }
      if (comunicacao.msg_despedida) {
        comunicacaoSection += `\n- **Despedida:** "${comunicacao.msg_despedida}"`;
      }
      if (comunicacao.msg_ausencia) {
        comunicacaoSection += `\n- **Fora do horário:** "${comunicacao.msg_ausencia}"`;
      }
    }
    
    if (comunicacao.exemplos_respostas) {
      comunicacaoSection += `\n\n## Exemplos de Como Responder (Use como referência de estilo)
${comunicacao.exemplos_respostas}`;
    }
    
    promptSections.push(comunicacaoSection);

    // 4. QUALIFICAÇÃO - Configuração completa para agente senior
    const qualificacao = configs.qualificacao || {};
    
    // Mapear valores para descrições
    const podePerguntarDescricoes: Record<string, string> = {
      sim_poucas: 'Faça apenas perguntas essenciais para ajudar o cliente. Seja objetivo e não pareça um interrogatório.',
      apenas_essencial: 'Faça o mínimo de perguntas possível. Só pergunte quando for estritamente necessário para atender.',
      nao_responder: 'Nunca faça perguntas. Apenas responda ao que o cliente perguntar.'
    };
    
    const perguntasPorVezDescricoes: Record<string, string> = {
      '1': 'Faça apenas UMA pergunta de cada vez. Espere a resposta antes de fazer outra.',
      '2': 'Pode combinar até 2 perguntas relacionadas em uma mensagem.',
      'ilimitado': 'Pode fazer quantas perguntas forem necessárias (use com moderação).'
    };
    
    const perguntasPermitidasLabels: Record<string, string> = {
      o_que_precisa: 'a necessidade do cliente',
      para_quando: 'o prazo ou urgência',
      orcamento: 'o orçamento disponível',
      quantidade: 'a quantidade ou volume',
      urgencia: 'o nível de prioridade',
      como_conheceu: 'como conheceu a empresa',
      ja_tem_projeto: 'se já tem projeto ou arquiteto'
    };
    
    const clientePressaDescricoes: Record<string, string> = {
      pular_qualificacao: 'Pule toda qualificação e vá direto ao ponto sem perguntar nada.',
      ir_direto_solucao: 'Ofereça a opção mais rápida disponível e pule qualificações desnecessárias.',
      encaminhar_humano: 'Transfira imediatamente para um atendente humano.'
    };
    
    const podeFazer = qualificacao.pode_fazer_perguntas || 'sim_poucas';
    const perguntasPorVez = qualificacao.perguntas_por_vez || '1';
    const perguntasPermitidas = qualificacao.perguntas_permitidas || ['o_que_precisa', 'orcamento'];
    const clienteComPressa = qualificacao.cliente_com_pressa || 'ir_direto_solucao';
    const perguntasObrigatorias = qualificacao.perguntas || qualificacao.perguntas_obrigatorias || [];
    const criterios = qualificacao.criterios_lead || {};
    
    let qualSection = `# QUALIFICAÇÃO DE LEADS

## Estratégia de Perguntas
- **Liberdade para Perguntar:** ${podePerguntarDescricoes[podeFazer] || podePerguntarDescricoes.sim_poucas}
- **Perguntas por Vez:** ${perguntasPorVezDescricoes[perguntasPorVez] || perguntasPorVezDescricoes['1']}

## Perguntas Permitidas
Você pode perguntar sobre:`;
    
    // Add allowed questions
    Object.keys(perguntasPermitidasLabels).forEach(key => {
      const isAllowed = perguntasPermitidas.includes(key);
      qualSection += `\n- ${isAllowed ? '✓' : '✗'} ${perguntasPermitidasLabels[key]}${!isAllowed ? ' (não perguntar ativamente)' : ''}`;
    });
    
    qualSection += `

## Cliente com Pressa
Quando detectar que o cliente está com pressa ou impaciente:
${clientePressaDescricoes[clienteComPressa] || clientePressaDescricoes.ir_direto_solucao}`;
    
    // Add mandatory questions if any
    if (perguntasObrigatorias.length > 0) {
      qualSection += `

## Perguntas Obrigatórias
Sempre tente fazer estas perguntas durante a conversa:
${perguntasObrigatorias.map((p: string, i: number) => `${i + 1}. "${p}"`).join('\n')}`;
    }
    
    // Add lead classification criteria
    if (criterios.quente || criterios.morno || criterios.frio) {
      qualSection += `

## Classificação de Temperatura do Lead
- 🟢 **Lead Quente:** ${criterios.quente || 'Cliente pronto para comprar, com orçamento e prazo definidos'}
- 🟡 **Lead Morno:** ${criterios.morno || 'Cliente interessado mas ainda com dúvidas ou pesquisando opções'}
- 🔵 **Lead Frio:** ${criterios.frio || 'Cliente apenas pesquisando, sem urgência ou orçamento definido'}`;
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
