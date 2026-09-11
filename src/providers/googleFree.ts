import { getSetting } from '../core/config';
import { getJson } from '../core/http';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { normalizeLanguage } from '../utils/language';

export class GoogleFreeProvider implements TranslationProvider {
  readonly id = 'google-free' as const;
  readonly displayName = 'Google Free (unofficial web endpoint)';
  readonly maxChars = 4500;

  isConfigured(): boolean { return true; }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const endpoint = getSetting('googleFree.endpoint', 'https://translate.googleapis.com/translate_a/single');
    const url = new URL(endpoint);
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', req.sourceLanguage === 'auto' ? 'auto' : normalizeLanguage(req.sourceLanguage));
    url.searchParams.set('tl', normalizeLanguage(req.targetLanguage));
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', req.text);

    const data = await getJson<any>(url.toString(), {
      'User-Agent': 'Mozilla/5.0 Smart-Dev-Translator/0.1'
    });
    if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Unexpected Google translation response.');
    const text = data[0].map((part: any) => Array.isArray(part) ? (part[0] || '') : '').join('');
    return { text, provider: this.id, detectedLanguage: typeof data[2] === 'string' ? data[2] : undefined, raw: data };
  }
}
