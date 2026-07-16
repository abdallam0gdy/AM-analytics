export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(context.request.url);
  const model = url.searchParams.get('model') || 'gemini-3.5-flash';

  // Read environment variable securely from Cloudflare Pages environment
  const GEMINI_API_KEY = context.env.GEMINI_API_KEY || context.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Gemini API Key is not configured on Cloudflare. Please set GEMINI_API_KEY in Pages settings." }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }


  try {
    const body = await context.request.json();
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
