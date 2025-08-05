// Cloudflare Pages Functions - API catch-all
// This creates a serverless API endpoint on Cloudflare Pages

export async function onRequest(context) {
  const {
    request,
    env,
    params,
    waitUntil,
    next,
    data,
  } = context;

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
    // Since Python doesn't run natively on Cloudflare Workers/Functions,
    // we need to proxy to a hosted Python backend
    const backendUrl = env.BACKEND_URL || 'https://your-python-backend.fly.dev';
    const proxyUrl = new URL(url.pathname + url.search, backendUrl);
    
    // Forward the request
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP'),
        'X-Forwarded-Proto': 'https',
      },
      body: request.body,
    });

    const response = await fetch(proxyRequest);
    
    // Return response with CORS headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}