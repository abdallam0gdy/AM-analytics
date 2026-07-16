export async function onRequest(context) {
  const url = new URL(context.request.url);
  const endpoint = url.searchParams.get('endpoint');

  if (!endpoint) {
    return new Response(
      JSON.stringify({ error: "Missing required 'endpoint' parameter" }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Delete 'endpoint' parameter so it's not forwarded to YouTube
  url.searchParams.delete('endpoint');

  // Read environment variable securely from Cloudflare Pages environment
  const YOUTUBE_API_KEY = context.env.VITE_YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "YouTube API Key is not configured on Cloudflare. Please set VITE_YOUTUBE_API_KEY in Page settings." }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Re-construct the target YouTube v3 API URL
    const ytUrl = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    ytUrl.searchParams.set('key', YOUTUBE_API_KEY);

    // Forward all other search params received from the client
    for (const [k, v] of url.searchParams.entries()) {
      ytUrl.searchParams.set(k, v);
    }

    const response = await fetch(ytUrl.toString(), {
      method: context.request.method,
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
