import { URL } from 'url';
import { getProxy, getTimeout } from './config';
import { currentProviderInstance } from './providerScope';
import { logLine } from './log';
import { rawHttpRequest } from './rawHttp';
import { HttpRequestOptions, HttpResponse } from './types';

let requestSequence = 0;

function safeUrl(url: URL): string {
  const keys = [...url.searchParams.keys()];
  return `${url.origin}${url.pathname}${keys.length ? `?${keys.map((key) => `${encodeURIComponent(key)}=…`).join('&')}` : ''}`;
}

function safeProxy(proxy: string | undefined): string {
  if (!proxy) return 'direct';
  try {
    const parsed = new URL(proxy);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return 'configured (address hidden)';
  }
}

function compactResponseError(status: number, hostname: string, body: string, json: unknown): string {
  if (status === 429) {
    return `HTTP 429 ${hostname}: Too many requests (rate limited). Try again later or use another provider.`;
  }

  let detail = '';
  if (json && typeof json === 'object') {
    const value = json as { error?: unknown; message?: unknown };
    const nestedMessage = value.error && typeof value.error === 'object'
      ? (value.error as { message?: unknown }).message
      : undefined;
    const candidate = nestedMessage ?? value.message ?? value.error;
    if (typeof candidate === 'string') detail = candidate;
  }

  if (!detail && body) {
    detail = body
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  const suffix = detail ? `: ${detail.slice(0, 240)}` : '';
  return `HTTP ${status} ${hostname}${suffix}`;
}

export async function request<T = unknown>(urlString: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
  const url = new URL(urlString);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  const proxy = options.proxy === undefined ? getProxy() : options.proxy;
  const timeoutMs = options.timeoutMs ?? getTimeout();
  const requestId = ++requestSequence;
  const startedAt = Date.now();
  const provider = currentProviderInstance();
  const label = options.logLabel || (provider ? `${provider.name} (${provider.id})` : 'HTTP');
  const method = options.method || 'GET';
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined && headers['Content-Length'] === undefined && headers['content-length'] === undefined) {
    headers['Content-Length'] = Buffer.byteLength(options.body).toString();
  }
  logLine(`[HTTP #${requestId}] ${label} · ${method} ${safeUrl(url)} · proxy=${safeProxy(proxy)} · transport=raw-socket · timeout=${timeoutMs}ms`);

  try {
    const response = await rawHttpRequest(url, { method, headers, body: options.body, timeoutMs, proxy });
    const body = response.body.toString('utf8');
    let json: T | undefined;
    try { json = body ? JSON.parse(body) as T : undefined; } catch { json = undefined; }
    const serverRequestId = response.headers['x-request-id'] || response.headers['x-client-request-id'];
    if (response.status < 200 || response.status >= 300) {
      const error = new Error(compactResponseError(response.status, url.hostname, body, json));
      logLine(`[HTTP #${requestId}] Failed · status=${response.status} · ${Date.now() - startedAt}ms · remote=${response.remoteAddress || 'unknown'}${serverRequestId ? ` · request-id=${serverRequestId}` : ''} · ${error.message}`);
      throw error;
    }
    logLine(`[HTTP #${requestId}] Completed · status=${response.status} · ${Date.now() - startedAt}ms · remote=${response.remoteAddress || 'unknown'}${serverRequestId ? ` · request-id=${serverRequestId}` : ''} · ${response.body.length} bytes`);
    return { status: response.status, headers: response.headers, body, json };
  } catch (error) {
    if (!(error instanceof Error) || !/^HTTP \d{3}\b/.test(error.message)) {
      const message = error instanceof Error ? error.message : String(error);
      logLine(`[HTTP #${requestId}] Failed · ${Date.now() - startedAt}ms · ${message}`);
    }
    throw error;
  }
}

export async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await request<T>(url, { headers });
  if (res.json === undefined) throw new Error('Expected JSON response but received non-JSON data.');
  return res.json;
}

export async function postJson<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const payload = JSON.stringify(body);
  const res = await request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: payload
  });
  if (res.json === undefined) throw new Error('Expected JSON response but received non-JSON data.');
  return res.json;
}

export function formEncode(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}
