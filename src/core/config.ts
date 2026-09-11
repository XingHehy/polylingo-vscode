import * as vscode from 'vscode';
import { ProviderId } from './types';

export const CONFIG_SECTION = 'polyLingo';

export const ALL_PROVIDER_IDS: ProviderId[] = [
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

const PROVIDER_ENABLED_KEYS: Record<Exclude<ProviderId, 'auto'>, string> = {
  'google-free': 'googleFree.enabled',
  'bing-web': 'bingWeb.enabled',
  mymemory: 'mymemory.enabled',
  libretranslate: 'libreTranslate.enabled',
  deepl: 'deepl.enabled',
  azure: 'azure.enabled',
  'google-cloud': 'googleCloud.enabled',
  baidu: 'baidu.enabled',
  tencent: 'tencent.enabled',
  'openai-compatible': 'openAI.enabled',
  ollama: 'ollama.enabled'
};

const DEFAULT_PROVIDER_ENABLED: Record<Exclude<ProviderId, 'auto'>, boolean> = {
  'google-free': true,
  'bing-web': true,
  mymemory: true,
  libretranslate: false,
  deepl: false,
  azure: false,
  'google-cloud': false,
  baidu: false,
  tencent: false,
  'openai-compatible': false,
  ollama: false
};

export function config(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

export function getProvider(): ProviderId {
  return config().get<ProviderId>('provider', 'auto');
}

export function isProviderEnabled(id: ProviderId): boolean {
  if (id === 'auto') return true;
  const key = PROVIDER_ENABLED_KEYS[id];
  return config().get<boolean>(key, DEFAULT_PROVIDER_ENABLED[id]);
}

export async function setProviderEnabled(id: ProviderId, enabled: boolean): Promise<void> {
  if (id === 'auto') return;
  await config().update(PROVIDER_ENABLED_KEYS[id], enabled, vscode.ConfigurationTarget.Global);
  if (!enabled && getProvider() === id) {
    await config().update('provider', 'auto', vscode.ConfigurationTarget.Global);
  }
}

export function getEnabledProviderIds(): ProviderId[] {
  return ALL_PROVIDER_IDS.filter((id) => isProviderEnabled(id));
}

export function getProviderOrder(): ProviderId[] {
  const configured = config().get<ProviderId[]>('providerOrder', ALL_PROVIDER_IDS);
  const result: ProviderId[] = [];
  for (const id of [...configured, ...ALL_PROVIDER_IDS]) {
    if (id === 'auto' || !ALL_PROVIDER_IDS.includes(id) || result.includes(id)) continue;
    if (isProviderEnabled(id)) result.push(id);
  }
  return result;
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
  return config().get<T>(key, fallback);
}

export async function setGlobalSetting(key: string, value: unknown): Promise<void> {
  await config().update(key, value, vscode.ConfigurationTarget.Global);
}
