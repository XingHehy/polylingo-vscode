import { getSetting } from '../core/config';
import { postJson } from '../core/http';
import { Secrets } from '../core/secrets';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { normalizeLanguage } from '../utils/language';

export class LibreTranslateProvider implements TranslationProvider {
  readonly id = 'libretranslate' as const;
  readonly displayName = 'LibreTranslate';
  readonly maxChars = 6000;
  constructor(private readonly secrets: Secrets) {}

  isConfigured(): boolean {
    return Boolean(getSetting('libreTranslate.baseUrl', 'http://127.0.0.1:5000').trim());
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const base = getSetting('libreTranslate.baseUrl', 'http://127.0.0.1:5000').replace(/\/+$/, '');
    const apiKey = await this.secrets.get('libreTranslateApiKey');
    const data = await postJson<any>(`${base}/translate`, {
      q: req.text,
      source: req.sourceLanguage === 'auto' ? 'auto' : normalizeLanguage(req.sourceLanguage),
      target: normalizeLanguage(req.targetLanguage),
      format: 'text',
      ...(apiKey ? { api_key: apiKey } : {})
    });
    if (typeof data?.translatedText !== 'string') throw new Error(data?.error || 'Unexpected LibreTranslate response.');
    return { text: data.translatedText, provider: this.id, detectedLanguage: data.detectedLanguage?.language, raw: data };
  }
}
