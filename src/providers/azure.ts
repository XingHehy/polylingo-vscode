import { randomBytes } from 'crypto';
import { getSetting } from '../core/config';
import { postJson } from '../core/http';
import { Secrets } from '../core/secrets';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { normalizeLanguage } from '../utils/language';

export class AzureProvider implements TranslationProvider {
  readonly id = 'azure' as const;
  readonly displayName = 'Azure Translator';
  readonly maxChars = 10000;
  constructor(private readonly secrets: Secrets) {}

  async isConfigured(): Promise<boolean> {
    return Boolean(await this.secrets.get('azureApiKey')) && Boolean(getSetting('azure.region', '').trim());
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const key = await this.secrets.get('azureApiKey');
    const region = getSetting('azure.region', '').trim();
    if (!key || !region) throw new Error('Azure API key/region is not configured.');
    const base = getSetting('azure.endpoint', 'https://api.cognitive.microsofttranslator.com').replace(/\/+$/, '');
    const url = new URL(`${base}/translate`);
    url.searchParams.set('api-version', '3.0');
    url.searchParams.append('to', normalizeLanguage(req.targetLanguage));
    if (req.sourceLanguage !== 'auto') url.searchParams.set('from', normalizeLanguage(req.sourceLanguage));
    const data = await postJson<any[]>(url.toString(), [{ Text: req.text }], {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': region,
      'X-ClientTraceId': randomBytes(16).toString('hex')
    });
    const item = data?.[0];
    const text = item?.translations?.[0]?.text;
    if (typeof text !== 'string') throw new Error('Unexpected Azure Translator response.');
    return { text, provider: this.id, detectedLanguage: item?.detectedLanguage?.language, raw: data };
  }
}
