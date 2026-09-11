import { createHash, randomBytes } from 'crypto';
import { getSetting } from '../core/config';
import { formEncode, request } from '../core/http';
import { Secrets } from '../core/secrets';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { toProviderLanguage } from '../utils/language';

export class BaiduProvider implements TranslationProvider {
  readonly id = 'baidu' as const;
  readonly displayName = 'Baidu Translate API';
  readonly maxChars = 5000;
  constructor(private readonly secrets: Secrets) {}

  async isConfigured(): Promise<boolean> {
    return Boolean(await this.secrets.get('baiduAppId')) && Boolean(await this.secrets.get('baiduSecret'));
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const appid = await this.secrets.get('baiduAppId');
    const secret = await this.secrets.get('baiduSecret');
    if (!appid || !secret) throw new Error('Baidu AppId/Secret is not configured.');
    const salt = randomBytes(8).toString('hex');
    const sign = createHash('md5').update(`${appid}${req.text}${salt}${secret}`, 'utf8').digest('hex');
    const body = formEncode({
      q: req.text,
      from: toProviderLanguage(req.sourceLanguage, 'baidu'),
      to: toProviderLanguage(req.targetLanguage, 'baidu'),
      appid,
      salt,
      sign
    });
    const endpoint = getSetting('baidu.endpoint', 'https://fanyi-api.baidu.com/api/trans/vip/translate');
    const res = await request<any>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = res.json;
    if (data?.error_code) throw new Error(`Baidu ${data.error_code}: ${data.error_msg || 'translation failed'}`);
    const list = data?.trans_result;
    if (!Array.isArray(list)) throw new Error('Unexpected Baidu response.');
    return { text: list.map((x: any) => x.dst).join('\n'), provider: this.id, detectedLanguage: data.from, raw: data };
  }
}
