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

    // Fetch knowledge base - ordenar por prioridade
    const { data: conhecimento, error: conhecimentoError } = await supabase
      .from('tendenci_ia_conhecimento')
      .select('*')
      .eq('ativo', true)
      .order('prioridade', { ascending: true });

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
    if (negocio.produtos_servicos) {
      negocioSection += `\n\n## Produtos e Serviços\n${negocio.produtos_servicos}`;
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
    
    // Character limit configuration - FIXADO EM 150
    const limiteCaracteres = 150; // FORÇA 150 independente da config
    const temLimite = true;
    
    let comunicacaoSection = `# COMUNICAÇÃO E ESTILO DE RESPOSTA

## ⛔ LIMITE CRÍTICO DE 150 CARACTERES - REGRA ABSOLUTA

**🚨 ATENÇÃO: SUAS RESPOSTAS SERÃO AUTOMATICAMENTE CORTADAS EM 150 CARACTERES!**

**NÃO ADIANTA escrever mensagens longas - elas serão TRUNCADAS pelo sistema!**

REGRAS OBRIGATÓRIAS:
1. MÁXIMO de 150 caracteres por mensagem (1-2 frases curtas)
2. Se precisar mais espaço, o SISTEMA vai dividir em 2 mensagens
3. ELIMINE palavras desnecessárias
4. VÁ DIRETO AO PONTO

❌ PROIBIDO (será cortado automaticamente):
- Listas longas com múltiplos itens
- Explicações detalhadas
- Saudações elaboradas ("Olá! Tudo bem? Que prazer falar com você!")
- Perguntas múltiplas em uma mensagem
- Formatação markdown (**bold**, *italic*)

✅ EXEMPLOS CORRETOS (menos de 150 chars):
- "Oi! Sim, trabalhamos com mesas. Quer ver fotos?" (49 chars)
- "Claro! Prazo de 30-45 dias. Posso enviar orçamento?" (52 chars)
- "Temos sim! Vou te mandar algumas opções." (42 chars)
- "Perfeito! Anotei suas medidas. Nosso time vai te contatar." (60 chars)

⚠️ LEMBRE-SE: Resposta curta = Cliente feliz = Conversa fluida!

## Formato das Mensagens
- **Tamanho:** CURTO - Máximo 150 caracteres. 1-2 frases apenas.
- **Mensagens Sequenciais:** ${sequenciaDescricoes[sequencia] || sequenciaDescricoes['2-3']}

## Modo de Atuação
- **Estilo de Resposta:** ${modoDescricoes[modo] || modoDescricoes.consultivo}
- **Linguagem Técnica:** ${linguagemDescricoes[linguagem] || linguagemDescricoes.moderado}

## Tom e Estilo Visual
- **Digitação:** ${digitacaoDescricoes[digitacao] || digitacaoDescricoes.natural}
- **Formatação:** SEM formatação - não use ** ou * 
- **Emojis:** ${emojiDescricoes[emojis] || emojiDescricoes.moderado} (máximo 1-2 por mensagem)
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
      const exemplos = comunicacao.exemplos_respostas;
      if (Array.isArray(exemplos) && exemplos.length > 0) {
        comunicacaoSection += `\n\n## Exemplos de Como Responder (Use como referência de estilo)`;
        exemplos.forEach((ex: any, i: number) => {
          if (ex.pergunta || ex.resposta) {
            comunicacaoSection += `\n\n**Exemplo ${i + 1}:**`;
            if (ex.pergunta) {
              comunicacaoSection += `\n- Cliente: "${ex.pergunta}"`;
            }
            if (ex.resposta) {
              comunicacaoSection += `\n- Resposta ideal: "${ex.resposta}"`;
            }
          }
        });
      } else if (typeof exemplos === 'string' && exemplos.trim()) {
        // Backward compatibility with old string format
        comunicacaoSection += `\n\n## Exemplos de Como Responder (Use como referência de estilo)\n${exemplos}`;
      }
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

    // 5. VENDAS - Configuração completa para agente senior
    const vendas = configs.vendas || {};
    
    // Mapear valores para descrições
    const conducaoDescricoes: Record<string, string> = {
      sutil: 'Avance de forma suave e natural, sem pressionar. Deixe o cliente no controle.',
      moderado: 'Equilibre informar com conduzir. Faça sugestões sem ser insistente.',
      sempre_fechar: 'Sempre busque oportunidades de fechamento. Seja proativo em avançar a venda.'
    };
    
    const apresentacaoPrecosDescricoes: Record<string, string> = {
      valor_direto: 'Informe o preço de forma objetiva e clara quando perguntado.',
      valor_beneficios: 'Apresente o preço junto com os benefícios e valor agregado.',
      explica_antes: 'Contextualize e explique o produto antes de mencionar o preço.'
    };
    
    const tabelaPrecosDescricoes: Record<string, string> = {
      nunca_enviar: 'Não envie tabela de preços. Fale sobre produtos específicos.',
      apenas_resumo: 'Pode enviar um resumo simplificado dos principais itens/preços.',
      tabela_completa: 'Pode enviar tabela completa de preços quando solicitado.'
    };
    
    const sugestaoPacotesDescricoes: Record<string, string> = {
      sim: 'Sugira ativamente planos e pacotes que se adequem à necessidade do cliente.',
      se_pedir: 'Fale sobre pacotes apenas se o cliente perguntar diretamente.',
      nao: 'Não sugira pacotes, foque em produtos/serviços individuais.'
    };
    
    const orcamentoBaixoDescricoes: Record<string, string> = {
      explicar_valor: 'Justifique o preço mostrando benefícios, qualidade e custo-benefício.',
      alternativa_barata: 'Sugira opções mais acessíveis ou condições de pagamento facilitadas.',
      chamar_humano: 'Encaminhe para um atendente humano negociar condições especiais.'
    };
    
    const oferecerDescontoDescricoes: Record<string, string> = {
      nunca: 'Não ofereça descontos em nenhuma situação.',
      se_configurado: 'Ofereça apenas as promoções e descontos pré-definidos.',
      com_aprovacao: 'Consulte um humano antes de oferecer qualquer desconto.'
    };
    
    const pedidoForaRegraDescricoes: Record<string, string> = {
      negar_educadamente: 'Recuse de forma gentil e profissional, explicando as limitações.',
      explicar_politica: 'Explique detalhadamente a política de preços e condições.',
      chamar_humano: 'Encaminhe para um humano analisar o caso especial.'
    };
    
    const ctasLabels: Record<string, string> = {
      posso_explicar: 'Posso explicar melhor?',
      vejo_disponibilidade: 'Vejo disponibilidade para você?',
      vamos_avancar: 'Vamos avançar para o próximo passo?',
      gerar_orcamento: 'Posso gerar um orçamento personalizado?'
    };
    
    const objetivosLabels: Record<string, string> = {
      informar: 'Esclarecer dúvidas e informar',
      qualificar: 'Coletar informações e qualificar',
      vender: 'Buscar oportunidades de fechamento',
      agendar: 'Marcar reuniões ou consultas',
      suporte: 'Resolver problemas e dar suporte'
    };
    
    const objetivos = vendas.objetivos_principais || [];
    const conducao = vendas.conducao_conversa || 'moderado';
    const apresentacaoPrecos = vendas.apresentacao_precos || 'valor_direto';
    const tabelaPrecos = vendas.tabela_precos || 'apenas_resumo';
    const sugestaoPacotes = vendas.sugestao_pacotes || 'sim';
    const orcamentoBaixo = vendas.cliente_orcamento_baixo || 'explicar_valor';
    const oferecerDesconto = vendas.oferecer_desconto || 'se_configurado';
    const pedidoForaRegra = vendas.pedido_fora_regra || 'chamar_humano';
    const ctasDisponiveis = vendas.ctas_disponiveis || [];
    const perguntasVendas = vendas.perguntas_vendas || [];
    
    let vendasSection = `# TÉCNICAS DE VENDAS E CONVERSÃO\n`;
    
    // Objetivos
    if (objetivos.length > 0) {
      vendasSection += `\n## Objetivos Principais
O agente deve balancear os seguintes objetivos:
${objetivos.map((obj: string) => `- ✓ ${objetivosLabels[obj] || obj}`).join('\n')}\n`;
    }
    
    // Condução
    vendasSection += `\n## Condução da Conversa
**Estilo: ${conducao.charAt(0).toUpperCase() + conducao.slice(1).replace('_', ' ')}**
${conducaoDescricoes[conducao] || conducaoDescricoes.moderado}\n`;
    
    // Estratégia de Preços
    vendasSection += `\n## Estratégia de Preços
- **Apresentação:** ${apresentacaoPrecosDescricoes[apresentacaoPrecos] || ''}
- **Tabela de preços:** ${tabelaPrecosDescricoes[tabelaPrecos] || ''}
- **Sugestão de pacotes:** ${sugestaoPacotesDescricoes[sugestaoPacotes] || ''}\n`;
    
    // Situações Especiais
    vendasSection += `\n## Situações Especiais
- **Cliente com orçamento baixo:** ${orcamentoBaixoDescricoes[orcamentoBaixo] || ''}
- **Oferecer desconto:** ${oferecerDescontoDescricoes[oferecerDesconto] || ''}
- **Pedido fora da regra:** ${pedidoForaRegraDescricoes[pedidoForaRegra] || ''}\n`;
    
    // CTAs
    if (ctasDisponiveis.length > 0) {
      vendasSection += `\n## CTAs Disponíveis
Use estas chamadas para ação durante a conversa:
${ctasDisponiveis.map((cta: string) => `- "${ctasLabels[cta] || cta}"`).join('\n')}\n`;
    }
    
    // Perguntas obrigatórias para vendas
    if (perguntasVendas.length > 0) {
      vendasSection += `\n## Perguntas Obrigatórias para Vendas
Sempre tente coletar estas informações:
${perguntasVendas.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}\n`;
    }
    
    // Ofertas Especiais
    if (vendas.promocoes) {
      vendasSection += `\n## Ofertas Especiais Ativas
${vendas.promocoes}\n`;
    }
    
    // Técnicas de fechamento
    if (vendas.tecnicas) {
      vendasSection += `\n## Técnicas de Fechamento
${vendas.tecnicas}\n`;
    }
    
    // Lidar com objeções - texto geral
    if (vendas.objecoes_texto) {
      vendasSection += `\n## Como Lidar com Objeções
${vendas.objecoes_texto}\n`;
    }
    
    // Estratégias por temperatura
    if (vendas.estrategia_lead_quente || vendas.estrategia_lead_morno || vendas.estrategia_lead_frio) {
      vendasSection += `\n## Estratégia por Temperatura do Lead\n`;
      
      if (vendas.estrategia_lead_quente) {
        vendasSection += `\n### 🔥 Lead Quente (Pronto para Comprar)
${vendas.estrategia_lead_quente}\n`;
      }
      
      if (vendas.estrategia_lead_morno) {
        vendasSection += `\n### 🌡️ Lead Morno (Avaliando Opções)
${vendas.estrategia_lead_morno}\n`;
      }
      
      if (vendas.estrategia_lead_frio) {
        vendasSection += `\n### ❄️ Lead Frio (Apenas Pesquisando)
${vendas.estrategia_lead_frio}\n`;
      }
    }
    
    // Objeções estruturadas
    if (vendas.objecoes && Array.isArray(vendas.objecoes) && vendas.objecoes.length > 0) {
      vendasSection += `\n## Objeções Mapeadas
Quando o cliente disser:
${vendas.objecoes.map((o: any) => `- "${o.objecao}" → ${o.resposta}`).join('\n')}\n`;
    }
    
    // Links de direcionamento
    if (vendas.links_direcionamento && Array.isArray(vendas.links_direcionamento) && vendas.links_direcionamento.length > 0) {
      vendasSection += `\n## Links de Direcionamento
Use estes links quando apropriado:
${vendas.links_direcionamento.map((l: any) => `- **${l.nome}:** ${l.url}`).join('\n')}\n`;
    }
    
    // Backward compatibility - old fields
    if (vendas.gatilhos_urgencia && Array.isArray(vendas.gatilhos_urgencia) && vendas.gatilhos_urgencia.length > 0) {
      vendasSection += `\n## Gatilhos de Urgência
${vendas.gatilhos_urgencia.map((g: string) => `- ${g}`).join('\n')}\n`;
    }
    
    if (vendas.quando_transferir) {
      vendasSection += `\n## Quando Transferir para Humano
${vendas.quando_transferir}\n`;
    }
    
    if (vendas.script_followup) {
      vendasSection += `\n## Script de Follow-up
${vendas.script_followup}\n`;
    }
    
    promptSections.push(vendasSection);

    // 6. PRODUTOS
    let prodSection = `# PRODUTOS E PERSONALIZAÇÃO\n`;
    
    // Add custom products section FIRST
    prodSection += `
## 🎨 PRODUTOS PERSONALIZADOS E SOB MEDIDA

**A Tendenci é especializada em móveis sob medida e produtos personalizados.**

### Além dos produtos listados abaixo, oferecemos:
- **Móveis sob medida** com dimensões específicas para o espaço do cliente
- **Peças personalizadas** com cores, materiais e acabamentos à escolha
- **Projetos exclusivos** desenvolvidos em parceria com arquitetos
- **Adaptações e customizações** dos modelos existentes

### Quando oferecer personalização:
1. Quando o cliente não encontrar exatamente o que procura nos produtos listados
2. Quando mencionar medidas específicas ou espaços com dimensões não-padrão
3. Quando perguntar sobre cores ou materiais específicos
4. Quando tiver um arquiteto ou designer acompanhando o projeto

### Como abordar:
- "Esse modelo pode ser adaptado para as medidas do seu espaço. Quer que eu explique como funciona?"
- "Se preferir algo único, desenvolvemos peças exclusivas. Você tem um projeto ou arquiteto?"
- "Trabalhamos com móveis sob medida - qual seria o ideal para o seu ambiente?"
- "Além dos modelos prontos, podemos criar algo exclusivo para você!"

---
`;
    
    // ===== REGRA DE APRESENTAÇÃO DE PRODUTOS =====
    prodSection += `
## 🎯 REGRA DE APRESENTAÇÃO DE PRODUTOS (OBRIGATÓRIO)

### LIMITE DE PRODUTOS POR MENSAGEM
- Mostre **NO MÁXIMO 1 PRODUTO** com foto por mensagem
- Se cliente pedir "opções" ou "mais produtos", envie o link do catálogo

### 📦 LINK DO CATÁLOGO COMPLETO
**URL do catálogo:** https://www.tendencitech.com.br/catalogo

### FORMATO DE RESPOSTA COM PRODUTO:
1. Breve descrição/saudação
2. Uma foto do produto mais relevante: [FOTO_PRODUTO:url:nome]
3. Informação de preço
4. Convite para ver todos os produtos no catálogo

### EXEMPLOS CORRETOS:

**Cliente:** "Vocês tem mesas?"
**Resposta:** "Temos sim! Olha esse modelo que é muito procurado:
[FOTO_PRODUTO:url:Mesa Cascata]
Mesa Cascata - R$ 14.900

Quer ver todas as nossas mesas? Acesse nosso catálogo completo: www.tendencitech.com.br/catalogo"

**Cliente:** "Me mostra opções de sofás"
**Resposta:** "Claro! Esse aqui é um dos mais vendidos:
[FOTO_PRODUTO:url:Sofá Living]
Sofá Living 3 lugares - R$ 8.500

Temos vários outros modelos! Veja todos em: www.tendencitech.com.br/catalogo"

### QUANDO ENVIAR O LINK DO CATÁLOGO:
- ⭐ Cliente pede "catálogo" diretamente (ex: "me manda o catálogo", "tem catálogo?", "quero ver o catálogo")
- ⭐ Cliente pede "mais opções" ou "outras opções" (ex: "tem mais opções?", "quero ver mais")
- Cliente pede para ver produtos ou opções
- Cliente pergunta "o que vocês tem?"
- Cliente quer comparar modelos
- Após mostrar 1 produto, SEMPRE ofereça o catálogo
- Quando cliente parece indeciso sobre qual modelo

### EXEMPLOS PARA PEDIDOS DIRETOS:

**Cliente:** "Vocês tem catálogo?"
**Resposta:** "Temos sim! 📦 Acesse nosso catálogo completo com todos os produtos: 
www.tendencitech.com.br/catalogo

Lá você pode ver todas as mesas, banquetas, sofás e muito mais! Se quiser, posso te mostrar algum produto específico aqui mesmo. O que te interessa?"

**Cliente:** "Me mostra mais opções"
**Resposta:** "Claro! Você pode ver todas as nossas opções no catálogo completo:
www.tendencitech.com.br/catalogo

Tem algo específico que você está procurando? Posso te ajudar a encontrar o produto ideal!"

**Cliente:** "Manda o catálogo"
**Resposta:** "Aqui está! 📦 Nosso catálogo completo:
www.tendencitech.com.br/catalogo

Qualquer dúvida sobre algum produto, é só me chamar!"

### QUANDO NÃO ENVIAR O LINK:
- Cliente já especificou exatamente o produto (ex: "quero orçamento da Mesa Cascata")
- Conversa sobre detalhes técnicos de um produto específico já escolhido
- Cliente pedindo apenas preço de item já escolhido

---
`;

    if (products && products.length > 0) {
      prodSection += `## Catálogo de Produtos\n`;
      products.forEach((p: any) => {
        prodSection += `\n### ${p.nome}
Categoria: ${p.categoria || 'Geral'}
Preço: ${p.preco_min && p.preco_max ? `R$ ${p.preco_min} - R$ ${p.preco_max}` : (p.preco_base ? `R$ ${p.preco_base}` : 'Sob consulta')}
${p.descricao || ''}
${p.quando_oferecer ? `Oferecer quando: ${p.quando_oferecer}` : ''}
${p.diferenciais && p.diferenciais.length > 0 ? `Diferenciais: ${p.diferenciais.join(', ')}` : ''}`;
        
        // Add image info
        if (p.imagem_url) {
          prodSection += `\nImagem principal disponível: Sim`;
        }
        if (p.galeria && p.galeria.length > 0) {
          prodSection += `\nGaleria de imagens: ${p.galeria.length} fotos`;
        }
        
        // Add videos info - support both new videos array and legacy video_url
        const videosArray = Array.isArray(p.videos) ? p.videos : [];
        const hasLegacyVideo = p.video_url && !videosArray.find((v: any) => v.url === p.video_url);
        const totalVideos = videosArray.length + (hasLegacyVideo ? 1 : 0);
        
        if (totalVideos > 0) {
          prodSection += `\nVídeos disponíveis: ${totalVideos}`;
          videosArray.forEach((v: any, i: number) => {
            prodSection += `\n  - ${v.nome || `Vídeo ${i + 1}`}: ${v.url}`;
          });
          if (hasLegacyVideo) {
            prodSection += `\n  - Vídeo principal: ${p.video_url}`;
          }
        }
      });
    } else {
      prodSection += `\n**Nota:** Não há produtos cadastrados no momento, mas trabalhamos com móveis sob medida para qualquer necessidade.`;
    }
    
    promptSections.push(prodSection);

    // 7. CONHECIMENTO
    if (conhecimento && conhecimento.length > 0) {
      let conhecSection = `# BASE DE CONHECIMENTO\n`;
      
      // Legenda de níveis de autoridade
      conhecSection += `\n**Legenda de Níveis:**
- ⚡ **DEFINITIVO** = Informação oficial e inquestionável - use exatamente como está
- 📋 **ORIENTAÇÃO** = Diretriz a ser seguida normalmente - pode adaptar tom mas não conteúdo
- 💡 **SUGESTÃO** = Recomendação flexível - pode adaptar conforme contexto\n`;
      
      // Group by type
      const tiposUnicos = [...new Set(conhecimento.map((c: any) => c.tipo || 'geral'))];
      
      tiposUnicos.forEach((tipo: string) => {
        const itensDoTipo = conhecimento.filter((c: any) => (c.tipo || 'geral') === tipo);
        const tipoLabel = {
          faq: 'FAQ - Perguntas Frequentes',
          politica: 'Políticas',
          guia: 'Guias',
          documento: 'Documentos',
          catalogo: 'Catálogos',
          manual: 'Manuais',
          livro: 'Livros e Referências',
          video_aula: 'Vídeo-Aulas',
          script: 'Scripts de Atendimento',
          case: 'Cases de Sucesso',
          processo: 'Processos',
          tecnico: 'Documentação Técnica',
          geral: 'Geral'
        }[tipo] || tipo;
        
        conhecSection += `\n## ${tipoLabel}\n`;
        
        itensDoTipo.forEach((c: any) => {
          // Authority level indicator
          const nivelAutoridade: string = c.nivel_autoridade || 'orientacao';
          const nivelIconMap: Record<string, string> = {
            definitivo: '⚡',
            orientacao: '📋',
            sugestao: '💡'
          };
          const nivelIcon = nivelIconMap[nivelAutoridade] || '📋';
          
          const grauCerteza: string = c.grau_certeza || 'alto';
          const certezaLabelMap: Record<string, string> = {
            absoluto: '🎯 ABSOLUTO',
            alto: '✅ ALTO',
            medio: '⚠️ MÉDIO',
            baixo: '❓ BAIXO'
          };
          const certezaLabel = certezaLabelMap[grauCerteza] || '';
          
          conhecSection += `\n### ${nivelIcon} ${c.titulo}`;
          
          // Show authority and certainty badges
          if (nivelAutoridade === 'definitivo') {
            conhecSection += `\n**[${nivelIcon} INFORMAÇÃO DEFINITIVA - ${certezaLabel}]**`;
          } else if (grauCerteza && grauCerteza !== 'alto') {
            conhecSection += `\n**[Certeza: ${certezaLabel}]**`;
          }
          
          // Application context
          if (c.aplicacao && Array.isArray(c.aplicacao) && c.aplicacao.length > 0) {
            const aplicacaoLabels = c.aplicacao.map((a: string) => ({
              vendas: 'Vendas',
              suporte: 'Suporte',
              onboarding: 'Onboarding',
              objecoes: 'Objeções',
              fechamento: 'Fechamento',
              pos_venda: 'Pós-Venda',
              qualificacao: 'Qualificação',
              geral: 'Geral'
            }[a] || a)).join(', ');
            conhecSection += `\n**Usar em:** ${aplicacaoLabels}`;
          }
          
          // Context of use
          if (c.contexto_uso) {
            conhecSection += `\n**Contexto:** ${c.contexto_uso}`;
          }
          
          // Source and author
          if (c.fonte || c.autor) {
            const metaInfo = [c.fonte, c.autor ? `Autor: ${c.autor}` : null].filter(Boolean).join(' | ');
            conhecSection += `\n**Fonte:** ${metaInfo}`;
          }
          
          // Main content
          conhecSection += `\n${c.conteudo}`;
          
          // Files
          const arquivos = Array.isArray(c.arquivos) ? c.arquivos : [];
          if (arquivos.length > 0) {
            conhecSection += `\n**Materiais de apoio:**`;
            arquivos.forEach((arq: any) => {
              conhecSection += `\n  - Documento: ${arq.nome || arq.url}`;
            });
          }
          
          // Videos
          const videos = Array.isArray(c.videos) ? c.videos : [];
          if (videos.length > 0) {
            videos.forEach((vid: any) => {
              conhecSection += `\n  - Vídeo: ${vid.nome || 'Vídeo'} (${vid.url})`;
            });
          }
          
          // Keywords
          if (c.palavras_chave && c.palavras_chave.length > 0) {
            conhecSection += `\nTags: ${c.palavras_chave.join(', ')}`;
          }
          
          conhecSection += '\n';
        });
      });
      
      promptSections.push(conhecSection);
    }

    // 8. COMPORTAMENTO
    const comportamento = configs.comportamento || {};
    let compSection = `# COMPORTAMENTO\n`;
    
    if (comportamento.sempre_fazer && Array.isArray(comportamento.sempre_fazer) && comportamento.sempre_fazer.length > 0) {
      compSection += `\n## ✅ SEMPRE faça:\n${comportamento.sempre_fazer.map((s: string) => `- ${s}`).join('\n')}\n`;
    }
    if (comportamento.nunca_fazer && Array.isArray(comportamento.nunca_fazer) && comportamento.nunca_fazer.length > 0) {
      compSection += `\n## 🚫 NUNCA faça:\n${comportamento.nunca_fazer.map((n: string) => `- ${n}`).join('\n')}\n`;
    }
    
    // Backward compatibility: aceitar campos antigos
    const limites = comportamento.limites || comportamento.limites_negociacao;
    if (limites) {
      compSection += `\n## Limites de Negociação:\n${limites}\n`;
    }
    
    if (comportamento.nivel_insistencia) {
      const insistenciaDesc: Record<string, string> = {
        baixo: 'Baixo (1-2 tentativas, desiste fácil)',
        moderado: 'Moderado (3-4 tentativas com intervalos)',
        alto: 'Alto (5+ tentativas, muito persistente)'
      };
      compSection += `\n## Nível de Insistência: ${insistenciaDesc[comportamento.nivel_insistencia] || comportamento.nivel_insistencia}\n`;
    }
    
    // Backward compatibility: aceitar campos antigos
    const quandoTransferir = comportamento.quando_transferir_humano || comportamento.pedir_ajuda_quando;
    if (quandoTransferir) {
      compSection += `\n## Transferir para Humano Quando:\n${quandoTransferir}\n`;
    }
    
    if (comportamento.clientes_dificeis) {
      compSection += `\n## Como Lidar com Clientes Difíceis:\n${comportamento.clientes_dificeis}\n`;
    }
    
    // Add mandatory catalog rule
    compSection += `
## 📦 REGRA DO CATÁLOGO (OBRIGATÓRIO)
- Ao mostrar um produto, SEMPRE ofereça o link do catálogo completo
- Link: www.tendencitech.com.br/catalogo
- Mensagem sugerida: "Quer ver todos os nossos produtos? Acesse: www.tendencitech.com.br/catalogo"
- Mostre NO MÁXIMO 1 produto com foto por mensagem
`;
    
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
