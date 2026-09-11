import * as vscode from 'vscode';

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
    return Promise.resolve(this.storage.get(SECRET_KEYS[name]));
  }

  async set(name: SecretName, value: string): Promise<void> {
    await this.storage.store(SECRET_KEYS[name], value);
  }

  async delete(name: SecretName): Promise<void> {
    await this.storage.delete(SECRET_KEYS[name]);
  }
}
