import * as vscode from 'vscode';
import { ProviderInstance, ProviderKind } from './types';
import { currentProviderInstance } from './providerScope';

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

export function getProxy(): string | undefined {
  const own = config().get<string>('proxy', '').trim();
  if (own) return own;
  const vscodeProxy = vscode.workspace.getConfiguration('http').get<string>('proxy', '').trim();
  if (vscodeProxy) return vscodeProxy;
  return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || undefined;
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
