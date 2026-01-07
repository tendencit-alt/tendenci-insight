import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limits
const MAX_AUDIO_SIZE_MB = 20;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const TRANSCRIPTION_TIMEOUT_MS = 60000; // 60 seconds
const AI_MODEL = "google/gemini-3-pro-preview";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
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
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for fetch
        
        const audioResponse = await fetch(audio, { signal: controller.signal });
        clearTimeout(fetchTimeout);
        
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
        }
        
        const contentType = audioResponse.headers.get('content-type');
        // Só usar content-type do servidor se for um tipo de áudio válido
        // e não application/octet-stream (genérico usado por muitos CDNs)
        if (contentType && 
            contentType.includes('audio/') && 
            !contentType.includes('octet-stream')) {
          audioMimeType = contentType;
        }
        // Caso contrário, manter o mimeType original passado como parâmetro
        console.log(`🎙️ Final mimeType: ${audioMimeType} (server Content-Type: ${contentType})`);
        
        const contentLength = audioResponse.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_AUDIO_SIZE_BYTES) {
          console.error(`🎙️ Audio too large: ${contentLength} bytes (max: ${MAX_AUDIO_SIZE_BYTES})`);
          return new Response(
            JSON.stringify({ 
              text: "[Áudio muito longo para transcrever. Por favor, envie um áudio mais curto (máximo 5 minutos).]",
              error: "audio_too_large",
              warning: "max_size_exceeded"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const audioBuffer = await audioResponse.arrayBuffer();
        
        // Check size after download
        if (audioBuffer.byteLength > MAX_AUDIO_SIZE_BYTES) {
          console.error(`🎙️ Audio too large after download: ${audioBuffer.byteLength} bytes`);
          return new Response(
            JSON.stringify({ 
              text: "[Áudio muito longo para transcrever. Por favor, envie um áudio mais curto (máximo 5 minutos).]",
              error: "audio_too_large",
              warning: "max_size_exceeded"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const uint8Array = new Uint8Array(audioBuffer);
        
        // Convert to base64
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, [...chunk]);
        }
        audioBase64 = btoa(binary);
        
        console.log(`🎙️ Audio fetched and converted to base64: ${audioBase64.length} chars (${audioBuffer.byteLength} bytes)`);
      } catch (fetchError) {
        console.error('🎙️ Error fetching audio URL:', fetchError);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return new Response(
            JSON.stringify({ 
              text: "[O áudio demorou muito para baixar. Tente enviar novamente.]",
              error: "fetch_timeout"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Falha ao baixar áudio: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
    } else {
      // Check base64 size (with ~37% overhead)
      const estimatedSize = audioBase64.length * 0.73; // Rough estimate of decoded size
      if (estimatedSize > MAX_AUDIO_SIZE_BYTES) {
        console.error(`🎙️ Base64 audio too large: ~${Math.round(estimatedSize / 1024 / 1024)}MB`);
        return new Response(
          JSON.stringify({ 
            text: "[Áudio muito longo para transcrever. Por favor, envie um áudio mais curto (máximo 5 minutos).]",
            error: "audio_too_large",
            warning: "max_size_exceeded"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine audio format for Gemini
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

    // Set up timeout for transcription
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

    try {
      // Gemini multimodal with audio
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
                {
                  type: 'text',
                  text: 'Transcreva o áudio a seguir para texto em português brasileiro. Retorne APENAS a transcrição exata do que foi dito, sem comentários adicionais, sem pontuação extra, sem formatação. Se não conseguir entender algo, escreva [inaudível]. Se o áudio estiver vazio ou só tiver ruído, responda: [áudio vazio ou inaudível]'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${audioMimeType};base64,${audioBase64}`
                  }
                }
              ]
            }
          ],
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎙️ Erro na API Lovable AI:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ 
              text: "[Sistema temporariamente sobrecarregado. Tente novamente em alguns segundos.]",
              error: "rate_limited"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ 
              text: "[Sistema temporariamente indisponível. Tente novamente mais tarde.]",
              error: "credits_exhausted"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const text = result.choices?.[0]?.message?.content;

      // Validate response
      if (!text || text.trim().length < 2) {
        console.warn('🎙️ Empty or too short transcription response');
        return new Response(
          JSON.stringify({ 
            text: "[Áudio não pôde ser transcrito. Pode estar vazio ou com muito ruído.]",
            warning: "transcription_empty"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const duration = Date.now() - startTime;
      console.log(`🎙️ Transcrição concluída em ${duration}ms: ${text.substring(0, 100)}...`);

      return new Response(
        JSON.stringify({ 
          text: text.trim(),
          duration_ms: duration,
          model: AI_MODEL
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('🎙️ Transcription timeout');
        return new Response(
          JSON.stringify({ 
            text: "[Áudio demorou muito para transcrever. Tente enviar um áudio mais curto.]",
            error: "timeout"
          }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw err;
    }

  } catch (error) {
    console.error('🎙️ Erro na transcrição:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        text: "[Erro ao processar áudio. Tente novamente.]"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
