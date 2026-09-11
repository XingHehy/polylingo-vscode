import { getSetting } from '../core/config';
import { formEncode, request } from '../core/http';
import { Secrets } from '../core/secrets';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { toProviderLanguage } from '../utils/language';

export class DeepLProvider implements TranslationProvider {
  readonly id = 'deepl' as const;
  readonly displayName = 'DeepL API';
  readonly maxChars = 12000;
  constructor(private readonly secrets: Secrets) {}

  async isConfigured(): Promise<boolean> { return Boolean(await this.secrets.get('deepLApiKey')); }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const apiKey = await this.secrets.get('deepLApiKey');
    if (!apiKey) throw new Error('DeepL API key is not configured.');
    const base = getSetting('deepl.baseUrl', 'https://api-free.deepl.com/v2').replace(/\/+$/, '');
    const body = formEncode({
      text: req.text,
      target_lang: toProviderLanguage(req.targetLanguage, 'deepl'),
      source_lang: req.sourceLanguage === 'auto' ? undefined : toProviderLanguage(req.sourceLanguage, 'deepl')
    });
    const res = await request<any>(`${base}/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const data = res.json;
    const item = data?.translations?.[0];
    if (!item?.text) throw new Error('Unexpected DeepL response.');
    return { text: item.text, provider: this.id, detectedLanguage: item.detected_source_language, raw: data };
  }
}
