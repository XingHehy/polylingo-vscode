import * as vscode from 'vscode';
import { currentProviderInstance } from './providerScope';

export const SECRET_KEYS = {
  libreTranslateApiKey: 'polyLingo.libreTranslate.apiKey',
  deepLApiKey: 'polyLingo.deepl.apiKey',
  azureApiKey: 'polyLingo.azure.apiKey',
  googleCloudApiKey: 'polyLingo.googleCloud.apiKey',
  baiduAppId: 'polyLingo.baidu.appId',
  baiduSecret: 'polyLingo.baidu.secret',
  tencentSecretId: 'polyLingo.tencent.secretId',
  tencentSecretKey: 'polyLingo.tencent.secretKey',
  openAIApiKey: 'polyLingo.openAI.apiKey'
} as const;

export type SecretName = keyof typeof SECRET_KEYS;

export class Secrets {
  constructor(private readonly storage: vscode.SecretStorage) {}

  get(name: SecretName): Promise<string | undefined> {
    const instance = currentProviderInstance();
    return Promise.resolve(this.storage.get(instance ? this.instanceKey(instance.id, name) : SECRET_KEYS[name]));
  }

  private instanceKey(id: string, name: SecretName): string {
    return `polyLingo.instance.${id}.${name}`;
  }

  getForInstance(id: string, name: SecretName): Promise<string | undefined> {
    return Promise.resolve(this.storage.get(this.instanceKey(id, name)));
  }

  setForInstance(id: string, name: SecretName, value: string): Promise<void> {
    return Promise.resolve(this.storage.store(this.instanceKey(id, name), value));
  }

  deleteForInstance(id: string, name: SecretName): Promise<void> {
    return Promise.resolve(this.storage.delete(this.instanceKey(id, name)));
  }

  async deleteInstance(id: string): Promise<void> {
    for (const name of Object.keys(SECRET_KEYS) as SecretName[]) await this.storage.delete(this.instanceKey(id, name));
  }

  async set(name: SecretName, value: string): Promise<void> {
    await this.storage.store(SECRET_KEYS[name], value);
  }

  async delete(name: SecretName): Promise<void> {
    await this.storage.delete(SECRET_KEYS[name]);
  }
}
