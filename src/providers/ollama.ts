import { buildAiSystemPrompt } from '../core/aiPrompt';
import { getSetting } from '../core/config';
import { postJson } from '../core/http';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';

export class OllamaProvider implements TranslationProvider {
  readonly id = 'ollama' as const;
  readonly displayName = 'Ollama (local)';
  readonly maxChars = 16000;
  isConfigured(): boolean { return Boolean(getSetting('ollama.baseUrl', 'http://127.0.0.1:11434/v1').trim()); }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const base = getSetting('ollama.baseUrl', 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');
    const model = getSetting('ollama.model', 'qwen2.5:7b');
    const data = await postJson<any>(`${base}/chat/completions`, {
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: buildAiSystemPrompt(req) },
        { role: 'user', content: req.text }
      ]
    });
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error(data?.error?.message || 'Unexpected Ollama response.');
    return { text: content.trim(), provider: this.id, raw: data };
  }
}
