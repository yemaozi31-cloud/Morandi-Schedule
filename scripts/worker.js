// 极简代理——逐步排查连接问题
export default {
  async fetch(request) {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*',
          'Access-Control-Allow-Headers': '*', 'Access-Control-Max-Age': '86400' }
      })
    }

    // 健康检查
    if (url.pathname === '/') {
      return new Response(JSON.stringify({ status: 'ok', worker: 'webdav-proxy' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    if (!url.pathname.startsWith('/dav/')) {
      return new Response('Not Found', { status: 404 })
    }

    const target = 'https://dav.jianguoyun.com' + url.pathname + url.search
    console.log('Proxying:', request.method, target)

    try {
      // 第一步：先做简单测试，不带 auth
      const testResp = await fetch('https://dav.jianguoyun.com/')
      console.log('Root test status:', testResp.status)

      // 第二步：正式请求
      const headers = new Headers(request.headers)
      headers.set('Host', 'dav.jianguoyun.com')

      const response = await fetch(target, {
        method: request.method,
        headers: headers,
        body: request.body,
      })

      const respHeaders = new Headers(response.headers)
      respHeaders.set('Access-Control-Allow-Origin', '*')
      respHeaders.set('Access-Control-Allow-Methods', '*')
      respHeaders.set('Access-Control-Allow-Headers', '*')

      return new Response(response.body, {
        status: response.status,
        headers: respHeaders,
      })
    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message,
        cause: err.cause?.message || '无',
        name: err.name
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }
  },
}
