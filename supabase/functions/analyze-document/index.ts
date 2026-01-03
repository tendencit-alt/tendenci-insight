import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_MODEL = "google/gemini-3-pro-preview";
const MAX_FILE_SIZE_MB = 10;
const TIMEOUT_MS = 90000; // 90 seconds for document analysis

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { documentUrl, documentBase64, mimeType, analysisType = 'general' } = await req.json();

    if (!documentUrl && !documentBase64) {
      throw new Error('Documento não fornecido (URL ou base64)');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Validate mime type
    const docMimeType = mimeType || 'application/pdf';
    if (!SUPPORTED_MIME_TYPES.some(t => docMimeType.includes(t.split('/')[1]))) {
      return new Response(
        JSON.stringify({ 
          error: 'Tipo de documento não suportado',
          supported_types: SUPPORTED_MIME_TYPES,
          text: "[Tipo de documento não suportado. Envie PDF, DOC, DOCX, TXT ou imagem.]"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Analyzing document - Type: ${docMimeType}, Analysis: ${analysisType}`);

    let docBase64 = documentBase64;

    // Fetch document if URL provided
    if (documentUrl && !documentBase64) {
      console.log('📄 Fetching document from URL...');
      
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(documentUrl, { signal: controller.signal });
        clearTimeout(fetchTimeout);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status}`);
        }
        
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_MB * 1024 * 1024) {
          return new Response(
            JSON.stringify({ 
              error: 'Documento muito grande',
              text: `[Documento muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB]`
            }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, [...chunk]);
        }
        docBase64 = btoa(binary);
        
        console.log(`📄 Document fetched: ${buffer.byteLength} bytes`);
      } catch (err) {
        clearTimeout(fetchTimeout);
        if (err instanceof Error && err.name === 'AbortError') {
          return new Response(
            JSON.stringify({ 
              error: 'Timeout ao baixar documento',
              text: "[Documento demorou muito para baixar. Tente novamente.]"
            }),
            { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw err;
      }
    }

    // Build analysis prompt based on type
    let analysisPrompt = '';
    switch (analysisType) {
      case 'invoice':
        analysisPrompt = `Analise esta nota fiscal/fatura e extraia:
1. Número do documento
2. Data de emissão
3. Valor total
4. Nome do emissor/vendedor
5. Nome do destinatário/comprador
6. Lista de itens/produtos
7. Impostos se visíveis

Retorne em formato estruturado e claro em português brasileiro.`;
        break;
      
      case 'contract':
        analysisPrompt = `Analise este contrato e extraia:
1. Tipo de contrato
2. Partes envolvidas
3. Data de início e término
4. Valor total
5. Principais obrigações
6. Cláusulas importantes
7. Condições de rescisão

Resuma os pontos principais em português brasileiro.`;
        break;
      
      case 'quote':
        analysisPrompt = `Analise este orçamento/proposta e extraia:
1. Empresa/profissional
2. Data do orçamento
3. Validade da proposta
4. Lista de itens com valores
5. Valor total
6. Condições de pagamento
7. Observações importantes

Retorne em formato claro em português brasileiro.`;
        break;
      
      case 'ocr':
        analysisPrompt = `Transcreva TODO o texto visível neste documento de forma exata.
Mantenha a estrutura original (parágrafos, listas, tabelas).
Se houver texto em colunas, organize de forma legível.
Retorne em português brasileiro.`;
        break;
      
      default:
        analysisPrompt = `Analise este documento de forma completa em português brasileiro:

1. IDENTIFICAÇÃO: Qual tipo de documento é este?
2. CONTEÚDO PRINCIPAL: Qual é o assunto/tema principal?
3. INFORMAÇÕES-CHAVE: Extraia datas, valores, nomes, números importantes
4. TEXTO: Transcreva partes relevantes do texto
5. RESUMO: Faça um resumo executivo do documento

Se houver tabelas, organize os dados de forma clara.`;
    }

    // Set up timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: analysisPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${docMimeType};base64,${docBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 3000,
          temperature: 0.3
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📄 API Error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'rate_limited',
              text: "[Sistema sobrecarregado. Tente novamente em alguns segundos.]"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      const analysis = result.choices?.[0]?.message?.content;

      if (!analysis) {
        throw new Error('Resposta vazia da IA');
      }

      const duration = Date.now() - startTime;
      console.log(`📄 Document analyzed in ${duration}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          analysis,
          analysis_type: analysisType,
          duration_ms: duration,
          model: AI_MODEL
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === 'AbortError') {
        return new Response(
          JSON.stringify({ 
            error: 'timeout',
            text: "[Análise do documento demorou muito. Tente um documento menor.]"
          }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw err;
    }

  } catch (error) {
    console.error('📄 Document analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        text: "[Erro ao analisar documento. Tente novamente.]"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
