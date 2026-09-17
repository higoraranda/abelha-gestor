const BACKEND_URL = process.env.BACKEND_URL || 'https://abelha-gestor-api.onrender.com'

const REQUEST_HEADERS_TO_SKIP = new Set(['connection', 'content-length', 'host'])
const RESPONSE_HEADERS_TO_SKIP = new Set(['connection', 'content-encoding', 'content-length', 'set-cookie', 'transfer-encoding'])

function serializeBody(request) {
  if (request.body == null) return undefined
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) return request.body

  const contentType = String(request.headers['content-type'] || '')
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(request.body).toString()
  }

  return JSON.stringify(request.body)
}

export default async function handler(request, response) {
  const targetUrl = new URL(request.url || '/', BACKEND_URL)
  const headers = new Headers()

  for (const [name, value] of Object.entries(request.headers)) {
    if (REQUEST_HEADERS_TO_SKIP.has(name.toLowerCase()) || value == null) continue
    headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }

  headers.set('host', new URL(BACKEND_URL).host)
  headers.set('x-forwarded-host', String(request.headers.host || 'abelha-gestor.vercel.app'))
  headers.set('x-forwarded-proto', 'https')

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : serializeBody(request),
      redirect: 'manual',
    })

    response.statusCode = upstream.status
    upstream.headers.forEach((value, name) => {
      if (!RESPONSE_HEADERS_TO_SKIP.has(name.toLowerCase())) response.setHeader(name, value)
    })

    const cookies = upstream.headers.getSetCookie?.() || []
    if (cookies.length > 0) response.setHeader('set-cookie', cookies)

    response.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (error) {
    console.error('[api-proxy] upstream request failed', error)
    response.statusCode = 502
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(JSON.stringify({ error: 'Não foi possível acessar o servidor do CRM' }))
  }
}
