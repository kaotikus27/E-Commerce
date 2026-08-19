/**
 * Scoped HTTP forward-proxy + PAC config for debugging real mobile devices against this dev
 * environment. Only traffic to this PC's dev IP (192.168.100.213) gets proxied — everything else
 * a phone does (other apps, other sites) goes DIRECT, per the PAC rule below. Plain-HTTP only
 * (this dev environment has no TLS), so there's no CONNECT-tunnel/HTTPS-interception logic here.
 *
 * Usage:
 *   node scripts/mobile-debug-proxy.js
 * Then on the phone: Wi-Fi settings -> Configure Proxy -> Automatic -> URL:
 *   http://192.168.100.213:8888/proxy.pac
 *
 * Every request/response is logged to stdout with full method, path, status, timing, and (for
 * small JSON bodies) the actual body content — exactly what a phone browser sent and got back.
 */
const http = require('http');
const { URL } = require('url');

const DEV_HOST = '192.168.100.213';
const PROXY_PORT = 8888;
const MAX_LOGGED_BODY_BYTES = 4000;

const pac = `
function FindProxyForURL(url, host) {
  if (host == "${DEV_HOST}") {
    return "PROXY ${DEV_HOST}:${PROXY_PORT}";
  }
  return "DIRECT";
}
`.trim();

/** Captures the FULL body (needed to forward it intact — truncating here would corrupt
 *  anything larger than the log preview cap, e.g. JS bundles or bigger API responses). Only the
 *  logged preview gets truncated, in summarizeBody below. */
function readBody(stream) {
  return new Promise(resolve => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function summarizeBody(buffer, contentType, maxBytes) {
  if (buffer.length === 0) return '(empty)';
  const isTextual = !contentType || /json|text|urlencoded/i.test(contentType);
  if (!isTextual) return `(binary, ${buffer.length} bytes, ${contentType})`;
  const text = buffer.subarray(0, maxBytes).toString('utf8');
  return buffer.length > maxBytes ? `${text}… (truncated in this log, ${buffer.length} bytes total)` : text;
}

const server = http.createServer(async (clientReq, clientRes) => {
  const startedAt = Date.now();
  const isProxyRequest = clientReq.url.startsWith('http://') || clientReq.url.startsWith('https://');

  if (!isProxyRequest) {
    if (clientReq.url === '/proxy.pac') {
      clientRes.writeHead(200, { 'Content-Type': 'application/x-ns-proxy-autoconfig' });
      clientRes.end(pac);
    } else {
      clientRes.writeHead(404);
      clientRes.end('Not a proxy request and not /proxy.pac. Configure your device to use this as an HTTP proxy, not a direct target.');
    }
    return;
  }

  const target = new URL(clientReq.url);
  const reqBody = await readBody(clientReq);

  console.log(`\n=== REQUEST  ${clientReq.method} ${clientReq.url}`);
  console.log(`Headers: ${JSON.stringify(clientReq.headers)}`);
  if (clientReq.method !== 'GET' && clientReq.method !== 'HEAD') {
    console.log(`Body: ${summarizeBody(reqBody, clientReq.headers['content-type'], MAX_LOGGED_BODY_BYTES)}`);
  }

  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: target.pathname + target.search,
      method: clientReq.method,
      headers: clientReq.headers,
    },
    async proxyRes => {
      const resBody = await readBody(proxyRes);
      const ms = Date.now() - startedAt;
      console.log(`--- RESPONSE ${proxyRes.statusCode} (${ms}ms)`);
      console.log(`Body: ${summarizeBody(resBody, proxyRes.headers['content-type'], MAX_LOGGED_BODY_BYTES)}`);

      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      clientRes.end(resBody);
    }
  );

  proxyReq.on('error', err => {
    const ms = Date.now() - startedAt;
    console.log(`--- PROXY ERROR after ${ms}ms: ${err.message}`);
    clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    clientRes.end(`Proxy error reaching ${target.hostname}:${target.port}: ${err.message}`);
  });

  if (reqBody.length > 0) proxyReq.write(reqBody);
  proxyReq.end();
});

/** Handles CONNECT (the tunnel method browsers send for HTTPS through a proxy). This proxy has
 *  no TLS cert to actually terminate/inspect the tunnel, so it can't complete an HTTPS request -
 *  but logging the attempt is exactly what's needed to confirm or rule out "the browser silently
 *  upgraded an http:// call to https://", which would otherwise fail with zero visible trace. */
server.on('connect', (req, clientSocket) => {
  console.log(`\n=== CONNECT (HTTPS tunnel attempt, not supported by this debug proxy): ${req.url}`);
  clientSocket.end('HTTP/1.1 501 Not Implemented\r\n\r\n');
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Mobile debug proxy listening on 0.0.0.0:${PROXY_PORT}`);
  console.log(`PAC file: http://${DEV_HOST}:${PROXY_PORT}/proxy.pac`);
  console.log(`Only traffic to ${DEV_HOST} is proxied — everything else on the device goes DIRECT.`);
});
