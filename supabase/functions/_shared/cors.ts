// Allowed origins for CORS - restrict to known frontends
const allowedOrigins = [
  'https://tendenci-insight.lovable.app',
  'https://id-preview--9a80bfda-a244-46ac-85d4-acf8547596c3.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Get CORS headers for a specific origin
export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is in allowed list
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Legacy export for backward compatibility - defaults to production origin
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tendenci-insight.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
}
