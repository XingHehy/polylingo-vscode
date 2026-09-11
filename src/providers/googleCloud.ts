import { getSetting } from '../core/config';
import { postJson } from '../core/http';
import { Secrets } from '../core/secrets';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { normalizeLanguage } from '../utils/language';

function decodeHtmlEntities(text: string): string {
  return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export class GoogleCloudProvider implements TranslationProvider {
  readonly id = 'google-cloud' as const;
  readonly displayName = 'Google Cloud Translation';
  readonly maxChars = 12000;
  constructor(private readonly secrets: Secrets) {}

  async isConfigured(): Promise<boolean> { return Boolean(await this.secrets.get('googleCloudApiKey')); }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const key = await this.secrets.get('googleCloudApiKey');
    if (!key) throw new Error('Google Cloud API key is not configured.');
    const endpoint = getSetting('googleCloud.endpoint', 'https://translation.googleapis.com/language/translate/v2');
    const url = new URL(endpoint);
    url.searchParams.set('key', key);
    const data = await postJson<any>(url.toString(), {
      q: req.text,
      target: normalizeLanguage(req.targetLanguage),
      format: 'text',
      ...(req.sourceLanguage === 'auto' ? {} : { source: normalizeLanguage(req.sourceLanguage) })
    });
    const item = data?.data?.translations?.[0];
    if (typeof item?.translatedText !== 'string') throw new Error(data?.error?.message || 'Unexpected Google Cloud response.');
    return { text: decodeHtmlEntities(item.translatedText), provider: this.id, detectedLanguage: item.detectedSourceLanguage, raw: data };
  }
}
