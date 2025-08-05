// Cloudflare Worker entry point for Python backend
// This uses Cloudflare's Python Workers beta or proxies to a hosted instance

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // For now, proxy to a hosted Python backend
      // Replace with your actual backend URL
      const backendUrl = env.BACKEND_URL || 'https://your-backend.herokuapp.com';
      const proxyUrl = new URL(url.pathname + url.search, backendUrl);
      
      const proxyRequest = new Request(proxyUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = await fetch(proxyRequest);
      
      // Clone response and add CORS headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...corsHeaders,
        },
      });

      return newResponse;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};