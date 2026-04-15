/**
 * Netlify Function: /api/ai-chat
 * Proxies requests to Anthropic API.
 * The ANTHROPIC_API_KEY env var is server-side only — never sent to the browser.
 */
export default async function handler (req, context) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders()
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on server' }), {
      status: 500, headers: corsHeaders()
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: corsHeaders()
    })
  }

  const { messages, system, model = 'claude-opus-4-5', max_tokens = 2000 } = body

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400, headers: corsHeaders()
    })
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens, system, messages })
    })

    const data = await upstream.json()

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Upstream error: ' + err.message }), {
      status: 502, headers: corsHeaders()
    })
  }
}

function corsHeaders () {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

export const config = { path: '/api/ai-chat' }
