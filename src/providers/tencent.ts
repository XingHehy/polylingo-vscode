import { createHash, createHmac } from 'crypto';
import { getSetting } from '../core/config';
import { request } from '../core/http';
import { Secrets } from '../core/secrets';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { toProviderLanguage } from '../utils/language';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}
function utcDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

export class TencentProvider implements TranslationProvider {
  readonly id = 'tencent' as const;
  readonly displayName = 'Tencent Cloud TMT';
  readonly maxChars = 5000;
  constructor(private readonly secrets: Secrets) {}

  async isConfigured(): Promise<boolean> {
    return Boolean(await this.secrets.get('tencentSecretId')) && Boolean(await this.secrets.get('tencentSecretKey'));
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const secretId = await this.secrets.get('tencentSecretId');
    const secretKey = await this.secrets.get('tencentSecretKey');
    if (!secretId || !secretKey) throw new Error('Tencent SecretId/SecretKey is not configured.');

    const host = 'tmt.tencentcloudapi.com';
    const service = 'tmt';
    const action = 'TextTranslate';
    const version = '2018-03-21';
    const region = getSetting('tencent.region', 'ap-guangzhou');
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      SourceText: req.text,
      Source: req.sourceLanguage === 'auto' ? 'auto' : toProviderLanguage(req.sourceLanguage, 'tencent'),
      Target: toProviderLanguage(req.targetLanguage, 'tencent'),
      ProjectId: 0
    });

    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = 'content-type;host;x-tc-action';
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(payload)}`;
    const date = utcDate(timestamp);
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;
    const secretDate = hmac(`TC3${secretKey}`, date);
    const secretService = hmac(secretDate, service);
    const secretSigning = hmac(secretService, 'tc3_request');
    const signature = createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');
    const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await request<any>(getSetting('tencent.endpoint', 'https://tmt.tencentcloudapi.com'), {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json; charset=utf-8',
        Host: host,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Region': region
      },
      body: payload
    });
    const response = res.json?.Response;
    if (response?.Error) throw new Error(`Tencent ${response.Error.Code}: ${response.Error.Message}`);
    if (typeof response?.TargetText !== 'string') throw new Error('Unexpected Tencent TMT response.');
    return { text: response.TargetText, provider: this.id, detectedLanguage: response.Source, raw: res.json };
  }
}
