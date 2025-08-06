/**
 * Cloudflare Pages Function to proxy all API requests to the backend
 * This handles all HTTP methods (GET, POST, PUT, DELETE, etc.)
 * 
 * The [[catchall]] syntax captures all paths under /api/
 * For example: /api/v1/auth/google -> proxies to backend
 */

export async function onRequest(context) {
  const { request, params } = context;
  
  try {
    // Build the backend URL
    const url = new URL(request.url);
    const backendUrl = `https://saasit-ai-backend-dgoldman.fly.dev${url.pathname}${url.search}`;
    
    console.log(`Proxying ${request.method} request to: ${backendUrl}`);
    
    // Clone the request headers
    const headers = new Headers(request.headers);
    
    // Add/modify headers if needed
    // Remove CF-specific headers that might cause issues
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    
    // Ensure the host header is correct for the backend
    headers.set('host', 'saasit-ai-backend-dgoldman.fly.dev');
    
    // Forward the origin for CORS
    const origin = request.headers.get('origin');
    if (origin) {
      headers.set('origin', origin);
    }
    
    // Create the backend request
    const backendRequest = new Request(backendUrl, {
      method: request.method,
      headers: headers,
      // Only include body for methods that support it
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
      // Preserve the duplex setting for streaming
      duplex: 'half'
    });
    
    // Fetch from the backend
    const response = await fetch(backendRequest);
    
    // Clone response headers
    const responseHeaders = new Headers(response.headers);
    
    // Add CORS headers if not present
    if (!responseHeaders.has('access-control-allow-origin')) {
      responseHeaders.set('access-control-allow-origin', origin || '*');
    }
    if (!responseHeaders.has('access-control-allow-methods')) {
      responseHeaders.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (!responseHeaders.has('access-control-allow-headers')) {
      responseHeaders.set('access-control-allow-headers', 'Content-Type, Authorization');
    }
    
    // Return the response from the backend
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}