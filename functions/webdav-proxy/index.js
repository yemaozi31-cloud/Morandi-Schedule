exports.main = async (event) => {
  const target = 'https://dav.jianguoyun.com' + (event.path || '/')
  const headers = { host: 'dav.jianguoyun.com' }
  const auth = event.headers && event.headers['authorization']
  if (auth) headers['authorization'] = auth
  const res = await fetch(target, { method: event.httpMethod || 'GET', headers })
  return {
    statusCode: res.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'content-type': res.headers.get('content-type') || '',
    },
    body: await res.text(),
  }
}
