import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import HttpsProxyAgent = require('https-proxy-agent');
import { getProxy, getTimeout } from './config';
import { HttpRequestOptions, HttpResponse } from './types';

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
  const transport = url.protocol === 'https:' ? https : http;
  const proxy = options.proxy === undefined ? getProxy() : options.proxy;
  const timeoutMs = options.timeoutMs ?? getTimeout();
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined && headers['Content-Length'] === undefined && headers['content-length'] === undefined) {
    headers['Content-Length'] = Buffer.byteLength(options.body).toString();
  }

  return new Promise<HttpResponse<T>>((resolve, reject) => {
    const req = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      path: `${url.pathname}${url.search}`,
      method: options.method || 'GET',
      headers,
      agent: proxy ? HttpsProxyAgent(proxy) : undefined
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const status = res.statusCode || 0;
        let json: T | undefined;
        try { json = body ? JSON.parse(body) as T : undefined; } catch { json = undefined; }
        if (status < 200 || status >= 300) {
          reject(new Error(compactResponseError(status, url.hostname, body, json)));
          return;
        }
        resolve({ status, headers: res.headers as Record<string, string | string[] | undefined>, body, json });
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Request timed out after ${timeoutMs} ms`)));
    req.on('error', reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
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
