import * as net from 'net';
import * as tls from 'tls';
import * as zlib from 'zlib';
import { URL } from 'url';

export interface RawHttpOptions {
  method: string;
  headers: Record<string, string>;
  body?: string | Buffer;
  timeoutMs: number;
  proxy?: string;
}

export interface RawHttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
  remoteAddress?: string;
}

const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

function connect(host: string, port: number, secure: boolean, timeoutMs: number, servername = host, socket?: net.Socket): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const connection = secure
      ? tls.connect({ host: socket ? undefined : host, port: socket ? undefined : port, socket, servername, rejectUnauthorized: true })
      : net.connect({ host, port });
    const event = secure ? 'secureConnect' : 'connect';
    const onError = (error: Error) => reject(error);
    connection.once('error', onError);
    connection.setTimeout(timeoutMs, () => connection.destroy(new Error(`Request timed out after ${timeoutMs} ms`)));
    connection.once(event, () => {
      connection.removeListener('error', onError);
      resolve(connection);
    });
  });
}

function proxyAuthorization(proxy: URL): string | undefined {
  if (!proxy.username && !proxy.password) return undefined;
  return `Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64')}`;
}

function readConnectResponse(socket: net.Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const cleanup = () => {
      socket.removeListener('data', onData);
      socket.removeListener('error', onError);
      socket.removeListener('end', onEnd);
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const onEnd = () => { cleanup(); reject(new Error('Proxy closed the CONNECT tunnel.')); };
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) {
        if (buffer.length > 64 * 1024) onError(new Error('Proxy CONNECT response headers are too large.'));
        return;
      }
      cleanup();
      const statusLine = buffer.subarray(0, end).toString('latin1').split('\r\n')[0];
      const match = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\b/.exec(statusLine);
      if (!match || Number(match[1]) < 200 || Number(match[1]) >= 300) {
        reject(new Error(`Proxy CONNECT failed: ${statusLine || 'invalid response'}`));
        return;
      }
      const remainder = buffer.subarray(end + 4);
      if (remainder.length) socket.unshift(remainder);
      resolve();
    };
    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('end', onEnd);
  });
}

async function openConnection(target: URL, proxyValue: string | undefined, timeoutMs: number): Promise<{ socket: net.Socket; requestTarget: string }> {
  const targetPort = target.port ? Number(target.port) : target.protocol === 'https:' ? 443 : 80;
  if (!proxyValue) {
    return {
      socket: await connect(target.hostname, targetPort, target.protocol === 'https:', timeoutMs),
      requestTarget: `${target.pathname}${target.search}`
    };
  }

  const proxy = new URL(proxyValue);
  if (proxy.protocol !== 'http:' && proxy.protocol !== 'https:') {
    throw new Error(`Unsupported proxy protocol: ${proxy.protocol}`);
  }
  const proxyPort = proxy.port ? Number(proxy.port) : proxy.protocol === 'https:' ? 443 : 80;
  const proxySocket = await connect(proxy.hostname, proxyPort, proxy.protocol === 'https:', timeoutMs);

  if (target.protocol === 'http:') {
    return { socket: proxySocket, requestTarget: target.toString() };
  }

  const authority = `${target.hostname}:${targetPort}`;
  const authorization = proxyAuthorization(proxy);
  const connectHeaders = [
    `CONNECT ${authority} HTTP/1.1`,
    `Host: ${authority}`,
    'Proxy-Connection: Keep-Alive'
  ];
  if (authorization) connectHeaders.push(`Proxy-Authorization: ${authorization}`);
  proxySocket.write(`${connectHeaders.join('\r\n')}\r\n\r\n`);
  await readConnectResponse(proxySocket);
  return {
    socket: await connect(target.hostname, targetPort, true, timeoutMs, target.hostname, proxySocket),
    requestTarget: `${target.pathname}${target.search}`
  };
}

function parseHeaders(text: string): { status: number; headers: Record<string, string | string[] | undefined> } {
  const lines = text.split('\r\n');
  const match = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\b/.exec(lines.shift() || '');
  if (!match) throw new Error('Invalid HTTP response status line.');
  const headers: Record<string, string | string[] | undefined> = {};
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    const current = headers[name];
    headers[name] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
  }
  return { status: Number(match[1]), headers };
}

function decodeChunked(input: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < input.length) {
    const lineEnd = input.indexOf('\r\n', offset);
    if (lineEnd < 0) throw new Error('Invalid chunked HTTP response.');
    const sizeText = input.subarray(offset, lineEnd).toString('ascii').split(';')[0].trim();
    const size = Number.parseInt(sizeText, 16);
    if (!Number.isFinite(size)) throw new Error('Invalid HTTP chunk size.');
    offset = lineEnd + 2;
    if (size === 0) break;
    if (offset + size + 2 > input.length) throw new Error('Incomplete chunked HTTP response.');
    chunks.push(input.subarray(offset, offset + size));
    offset += size + 2;
  }
  return Buffer.concat(chunks);
}

function decodeBody(body: Buffer, headers: Record<string, string | string[] | undefined>): Buffer {
  const transferEncoding = String(headers['transfer-encoding'] || '').toLowerCase();
  let decoded = transferEncoding.includes('chunked') ? decodeChunked(body) : body;
  const encoding = String(headers['content-encoding'] || '').toLowerCase();
  if (encoding === 'gzip') decoded = zlib.gunzipSync(decoded);
  else if (encoding === 'deflate') decoded = zlib.inflateSync(decoded);
  else if (encoding === 'br') decoded = zlib.brotliDecompressSync(decoded);
  return decoded;
}

function validateHeader(name: string, value: string): void {
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(value)) {
    throw new Error(`Invalid HTTP header: ${name}`);
  }
}

export async function rawHttpRequest(target: URL, options: RawHttpOptions): Promise<RawHttpResponse> {
  const { socket, requestTarget } = await openConnection(target, options.proxy, options.timeoutMs);
  const headers: Record<string, string> = { ...options.headers };
  if (headers.Host === undefined && headers.host === undefined) headers.Host = target.host;
  if (headers.Connection === undefined && headers.connection === undefined) headers.Connection = 'close';
  const proxy = options.proxy ? new URL(options.proxy) : undefined;
  const authorization = proxy && target.protocol === 'http:' ? proxyAuthorization(proxy) : undefined;
  if (authorization && headers['Proxy-Authorization'] === undefined && headers['proxy-authorization'] === undefined) {
    headers['Proxy-Authorization'] = authorization;
  }
  for (const [name, value] of Object.entries(headers)) validateHeader(name, value);
  const head = [`${options.method} ${requestTarget || '/'} HTTP/1.1`, ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`), '', ''].join('\r\n');

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const cleanup = () => {
      socket.removeAllListeners('data');
      socket.removeAllListeners('end');
      socket.removeAllListeners('close');
      socket.removeAllListeners('error');
      socket.removeAllListeners('timeout');
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      reject(error);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      const response = Buffer.concat(chunks);
      cleanup();
      const separator = response.indexOf('\r\n\r\n');
      if (separator < 0) return reject(new Error('Invalid HTTP response headers.'));
      try {
        const parsed = parseHeaders(response.subarray(0, separator).toString('latin1'));
        resolve({
          ...parsed,
          body: decodeBody(response.subarray(separator + 4), parsed.headers),
          remoteAddress: socket.remoteAddress
        });
      } catch (error) {
        reject(error);
      }
    };
    socket.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_RESPONSE_BYTES) return fail(new Error('HTTP response exceeds 25 MB.'));
      chunks.push(chunk);
    });
    socket.once('end', finish);
    socket.once('close', finish);
    socket.once('error', fail);
    socket.setTimeout(options.timeoutMs, () => fail(new Error(`Request timed out after ${options.timeoutMs} ms`)));
    socket.write(head);
    if (options.body !== undefined) socket.write(options.body);
  });
}
