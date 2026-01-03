import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, mimeType } = await req.json();

    if (!audio) {
      throw new Error('Áudio não fornecido');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('🎙️ Transcrevendo áudio com Gemini...');
    console.log(`🎙️ Audio input type: ${audio.startsWith('http') ? 'URL' : 'base64'}`);
    console.log(`🎙️ MimeType: ${mimeType || 'not specified'}`);

    let audioBase64 = audio;
    let audioMimeType = mimeType || 'audio/ogg';

    // If audio is a URL, fetch and convert to base64
    if (audio.startsWith('http')) {
      console.log('🎙️ Fetching audio from URL...');
      try {
        const audioResponse = await fetch(audio);
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
        }
        
        const contentType = audioResponse.headers.get('content-type');
        if (contentType) {
          audioMimeType = contentType;
        }
        
        const audioBuffer = await audioResponse.arrayBuffer();
        const uint8Array = new Uint8Array(audioBuffer);
        
        // Convert to base64
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, [...chunk]);
        }
        audioBase64 = btoa(binary);
        
        console.log(`🎙️ Audio fetched and converted to base64: ${audioBase64.length} chars`);
      } catch (fetchError) {
        console.error('🎙️ Error fetching audio URL:', fetchError);
        throw new Error(`Falha ao baixar áudio: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
    }

    // Determine audio format for Gemini
    // Gemini supports: audio/wav, audio/mp3, audio/aiff, audio/aac, audio/ogg, audio/flac
    let geminiFormat = 'ogg';
    if (audioMimeType.includes('webm')) {
      geminiFormat = 'webm';
    } else if (audioMimeType.includes('mp3') || audioMimeType.includes('mpeg')) {
      geminiFormat = 'mp3';
    } else if (audioMimeType.includes('wav')) {
      geminiFormat = 'wav';
    } else if (audioMimeType.includes('aac') || audioMimeType.includes('m4a')) {
      geminiFormat = 'aac';
    } else if (audioMimeType.includes('flac')) {
      geminiFormat = 'flac';
    } else if (audioMimeType.includes('ogg') || audioMimeType.includes('opus')) {
      geminiFormat = 'ogg';
    }

    console.log(`🎙️ Using Gemini audio format: ${geminiFormat}`);

    // Gemini multimodal with audio - using inline_data format
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva o áudio a seguir para texto em português brasileiro. Retorne APENAS a transcrição exata do que foi dito, sem comentários adicionais, sem pontuação extra, sem formatação. Se não conseguir entender algo, escreva [inaudível].'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audioBase64,
                  format: geminiFormat
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎙️ Erro na API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns segundos.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Adicione créditos ao workspace.');
      }
      
      throw new Error(`Erro na API: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;

    if (!text) {
      console.error('🎙️ Resposta vazia da IA:', JSON.stringify(result));
      throw new Error('Resposta vazia da IA');
    }

    console.log(`🎙️ Transcrição concluída: ${text.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({ text: text.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🎙️ Erro na transcrição:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
