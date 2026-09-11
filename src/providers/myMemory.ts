import { getSetting } from '../core/config';
import { getJson } from '../core/http';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { guessLanguage, normalizeLanguage } from '../utils/language';

export class MyMemoryProvider implements TranslationProvider {
  readonly id = 'mymemory' as const;
  readonly displayName = 'MyMemory';
  // Official API documents q as max 500 bytes. Keeping a conservative character bound.
  readonly maxChars = 140;

  isConfigured(): boolean { return true; }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const source = req.sourceLanguage === 'auto' ? guessLanguage(req.text) : normalizeLanguage(req.sourceLanguage);
    const target = normalizeLanguage(req.targetLanguage);
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', req.text);
    url.searchParams.set('langpair', `${source}|${target}`);
    url.searchParams.set('mt', '1');
    const email = getSetting('mymemory.email', '').trim();
    if (email) url.searchParams.set('de', email);
    const data = await getJson<any>(url.toString());
    const text = data?.responseData?.translatedText;
    if (typeof text !== 'string') throw new Error(data?.responseDetails || 'Unexpected MyMemory response.');
    return { text, provider: this.id, detectedLanguage: source, raw: data };
  }
}
