import * as vscode from 'vscode';
import { execFileSync } from 'child_process';
import { ProviderInstance, ProviderKind } from './types';
import { currentProviderInstance } from './providerScope';
import { t } from './i18n';

export const CONFIG_SECTION = 'polyLingo';

export const ALL_PROVIDER_IDS: ProviderKind[] = [
  'google-free',
  'bing-web',
  'mymemory',
  'libretranslate',
  'deepl',
  'azure',
  'google-cloud',
  'baidu',
  'tencent',
  'openai-compatible',
  'ollama'
];

const BUILTIN_KINDS: ProviderKind[] = ['google-free', 'bing-web', 'mymemory'];
export const PROVIDER_NAMES: Record<ProviderKind, string> = {
  'google-free': 'Google Free', 'bing-web': 'Bing Web', mymemory: 'MyMemory',
  libretranslate: 'LibreTranslate', deepl: 'DeepL', azure: 'Azure Translator',
  'google-cloud': 'Google Cloud Translation', baidu: 'Baidu Translate',
  tencent: 'Tencent Cloud TMT', 'openai-compatible': 'OpenAI Compatible', ollama: 'Ollama'
};
const INSTANCE_SETTING_PREFIXES = [
  'googleFree.', 'bingWeb.', 'mymemory.', 'libreTranslate.', 'deepl.',
  'azure.', 'googleCloud.', 'baidu.', 'tencent.', 'openAI.', 'ollama.'
];

export function isBuiltInInstance(id: string): boolean {
  return BUILTIN_KINDS.includes(id as ProviderKind);
}

export function getProviderInstances(): ProviderInstance[] {
  const saved = config().get<ProviderInstance[]>('providerInstances');
  const instances: ProviderInstance[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(saved) ? saved : []) {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id) || seen.has(item.id)) continue;
    if (!ALL_PROVIDER_IDS.includes(item.kind)) continue;
    if (isBuiltInInstance(item.id) && item.kind !== item.id) continue;
    seen.add(item.id);
    instances.push({
      id: item.id, kind: item.kind,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 80) : PROVIDER_NAMES[item.kind],
      enabled: item.enabled === true,
      settings: item.settings && typeof item.settings === 'object' && !Array.isArray(item.settings) ? item.settings : {}
    });
  }
  for (const kind of [...BUILTIN_KINDS].reverse()) {
    if (!seen.has(kind)) instances.unshift({ id: kind, kind, name: PROVIDER_NAMES[kind], enabled: true, settings: {} });
  }
  return instances;
}

export async function saveProviderInstances(instances: ProviderInstance[]): Promise<void> {
  const selected = config().get<string>('provider', 'auto');
  await config().update('providerInstances', instances, vscode.ConfigurationTarget.Global);
  if (selected !== 'auto' && !instances.some((instance) => instance.id === selected && instance.enabled)) {
    await setGlobalSetting('provider', 'auto');
  }
}

export function config(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

export function getProvider(): string {
  const selected = config().get<string>('provider', 'auto');
  return selected === 'auto' || getProviderInstances().some((instance) => instance.id === selected) ? selected : 'auto';
}

export function isProviderEnabled(id: string): boolean {
  if (id === 'auto') return true;
  return getProviderInstances().some((instance) => instance.id === id && instance.enabled);
}

export async function setProviderEnabled(id: string, enabled: boolean): Promise<void> {
  if (id === 'auto') return;
  const instances = getProviderInstances();
  const instance = instances.find((item) => item.id === id);
  if (!instance) return;
  instance.enabled = enabled;
  await saveProviderInstances(instances);
}

export function getEnabledProviderIds(): string[] {
  return getProviderInstances().filter((instance) => instance.enabled).map((instance) => instance.id);
}

export function getProviderOrder(): string[] {
  return getEnabledProviderIds();
}

export function getSourceLanguage(): string {
  return config().get<string>('sourceLanguage', 'auto').trim() || 'auto';
}

export function getTargetLanguage(): string {
  return config().get<string>('targetLanguage', 'zh-CN').trim() || 'zh-CN';
}

export function getTimeout(): number {
  return config().get<number>('requestTimeoutMs', 15000);
}

let cachedSystemProxy: { value: string | undefined; expiresAt: number } | undefined;

function proxyUrl(hostValue: string | undefined, portValue?: string): string | undefined {
  const host = hostValue?.trim().replace(/^['"]|['"]$/g, '');
  const port = portValue?.trim().replace(/^['"]|['"]$/g, '').replace(/^uint\d+\s+/, '');
  if (!host) return undefined;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host)) return host;
  if (!port && /^[^:]+:\d+$/.test(host)) return `http://${host}`;
  const formattedHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  return `http://${formattedHost}${port ? `:${port}` : ''}`;
}

function macOsSystemProxy(): string | undefined {
  if (process.platform !== 'darwin') return undefined;
  try {
    const output = execFileSync('/usr/sbin/scutil', ['--proxy'], { encoding: 'utf8', timeout: 1500, maxBuffer: 256 * 1024 });
    const values = new Map<string, string>();
    for (const line of output.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/.exec(line);
      if (match) values.set(match[1], match[2]);
    }
    for (const prefix of ['HTTPS', 'HTTP']) {
      if (values.get(`${prefix}Enable`) !== '1') continue;
      const host = values.get(`${prefix}Proxy`)?.trim();
      const port = values.get(`${prefix}Port`)?.trim();
      if (!host) continue;
      return proxyUrl(host, port);
    }
  } catch {
    // System proxy discovery is best-effort; explicit settings still work.
  }
  return undefined;
}

function windowsSystemProxy(): string | undefined {
  if (process.platform !== 'win32') return undefined;
  try {
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
    const query = (name: string) => execFileSync('reg.exe', ['query', key, '/v', name], { encoding: 'utf8', timeout: 1500, maxBuffer: 256 * 1024 });
    if (!/REG_DWORD\s+0x1\b/i.test(query('ProxyEnable'))) return undefined;
    const match = /ProxyServer\s+REG_SZ\s+(.+)$/im.exec(query('ProxyServer'));
    const raw = match?.[1].trim();
    if (!raw) return undefined;
    if (!raw.includes('=')) return proxyUrl(raw);
    const entries = new Map(raw.split(';').map((item) => item.split('=', 2).map((part) => part.trim()) as [string, string]));
    return proxyUrl(entries.get('https') || entries.get('http'));
  } catch {
    return undefined;
  }
}

function linuxSystemProxy(): string | undefined {
  if (process.platform !== 'linux') return undefined;
  try {
    const get = (schema: string, key: string) => execFileSync('/usr/bin/gsettings', ['get', schema, key], { encoding: 'utf8', timeout: 1500, maxBuffer: 256 * 1024 }).trim();
    if (get('org.gnome.system.proxy', 'mode').replace(/['"]/g, '') !== 'manual') return undefined;
    for (const protocol of ['https', 'http']) {
      const schema = `org.gnome.system.proxy.${protocol}`;
      const resolved = proxyUrl(get(schema, 'host'), get(schema, 'port'));
      if (resolved) return resolved;
    }
  } catch {
    // GNOME settings may be unavailable on headless or non-GNOME systems.
  }
  return undefined;
}

function systemProxy(): string | undefined {
  const now = Date.now();
  if (cachedSystemProxy && cachedSystemProxy.expiresAt > now) return cachedSystemProxy.value;
  const value = macOsSystemProxy() || windowsSystemProxy() || linuxSystemProxy();
  cachedSystemProxy = { value, expiresAt: now + 30_000 };
  return value;
}

function configuredProxy(): string | undefined {
  const own = config().get<string>('proxy', '').trim();
  if (own) return own;
  const vscodeProxy = vscode.workspace.getConfiguration('http').get<string>('proxy', '').trim();
  if (vscodeProxy) return vscodeProxy;
  return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || systemProxy();
}

export function resolveProviderProxy(instance: ProviderInstance, settings: Record<string, unknown> = instance.settings): string | undefined {
  const mode = settings['proxy.mode'];
  if (mode === 'disabled') return undefined;
  if (mode === 'enabled') {
    const own = typeof settings['proxy.url'] === 'string' ? settings['proxy.url'].trim() : '';
    const resolved = own || configuredProxy();
    if (!resolved) throw new Error(t('error.proxyNotDetected'));
    return resolved;
  }
  if (!config().get<boolean>('proxy.enabled', false)) return undefined;
  const resolved = configuredProxy();
  if (!resolved) throw new Error(t('error.proxyNotDetected'));
  return resolved;
}

export function getProxy(): string | undefined {
  const instance = currentProviderInstance();
  if (instance) return resolveProviderProxy(instance);
  if (!config().get<boolean>('proxy.enabled', false)) return undefined;
  const resolved = configuredProxy();
  if (!resolved) throw new Error(t('error.proxyNotDetected'));
  return resolved;
}

export function getSetting<T>(key: string, fallback: T): T {
  const instance = currentProviderInstance();
  if (instance && INSTANCE_SETTING_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    if (Object.prototype.hasOwnProperty.call(instance.settings, key)) return instance.settings[key] as T;
    return fallback;
  }
  return config().get<T>(key, fallback);
}

export async function setGlobalSetting(key: string, value: unknown): Promise<void> {
  await config().update(key, value, vscode.ConfigurationTarget.Global);
}
