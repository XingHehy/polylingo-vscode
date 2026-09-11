import { buildAiSystemPrompt } from '../core/aiPrompt';
import { getSetting } from '../core/config';
import { postJson } from '../core/http';
import { Secrets } from '../core/secrets';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';

export class OpenAICompatibleProvider implements TranslationProvider {
  readonly id = 'openai-compatible' as const;
  readonly displayName = 'OpenAI-compatible AI';
  readonly maxChars = 16000;
  constructor(private readonly secrets: Secrets) {}

  async isConfigured(): Promise<boolean> {
    const base = getSetting('openAI.baseUrl', 'https://api.openai.com/v1').trim();
    const key = await this.secrets.get('openAIApiKey');
    // Local or gateway endpoints may not require a key; OpenAI's default endpoint does.
    return Boolean(base) && (Boolean(key) || !/api\.openai\.com/i.test(base));
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const base = getSetting('openAI.baseUrl', 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = getSetting('openAI.model', 'gpt-4.1-mini');
    const configuredTemperature = getSetting('openAI.temperature', 0.2);
    const temperature = Number.isFinite(configuredTemperature) && configuredTemperature >= 0 && configuredTemperature <= 2
      ? configuredTemperature
      : 0.2;
    const apiKey = await this.secrets.get('openAIApiKey');
    const extraHeaders = getSetting<Record<string, string>>('openAI.extraHeaders', {});
    const headers: Record<string, string> = { ...extraHeaders };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const data = await postJson<any>(`${base}/chat/completions`, {
      model,
      temperature,
      messages: [
        { role: 'system', content: buildAiSystemPrompt(req) },
        { role: 'user', content: req.text }
      ]
    }, headers);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error(data?.error?.message || 'Unexpected OpenAI-compatible response.');
    return { text: content.trim(), provider: this.id, raw: data };
  }
}
