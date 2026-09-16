import { getProvider, getProviderOrder, isProviderEnabled } from './config';
import { TranslateRequest, TranslateResult, TranslationProvider } from './types';

function splitText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf('\n\n', maxChars);
    if (cut < Math.floor(maxChars * 0.45)) cut = remaining.lastIndexOf('\n', maxChars);
    if (cut < Math.floor(maxChars * 0.45)) cut = remaining.lastIndexOf('. ', maxChars);
    if (cut < Math.floor(maxChars * 0.45)) cut = remaining.lastIndexOf(' ', maxChars);
    if (cut < Math.floor(maxChars * 0.25)) cut = maxChars;
    else if (remaining.slice(cut, cut + 2) === '. ') cut += 1;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export class TranslationManager {
  private readonly providers = new Map<string, TranslationProvider>();

  clear(): void {
    this.providers.clear();
  }

  register(provider: TranslationProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): TranslationProvider | undefined {
    return this.providers.get(id);
  }

  listProviders(): TranslationProvider[] {
    return [...this.providers.values()];
  }

  private async runProvider(provider: TranslationProvider, req: TranslateRequest): Promise<TranslateResult> {
    const max = provider.maxChars || Number.MAX_SAFE_INTEGER;
    const chunks = splitText(req.text, max);
    if (chunks.length === 1) {
      const result = await provider.translate(req);
      return { ...result, provider: provider.displayName };
    }

    const results: TranslateResult[] = [];
    for (const chunk of chunks) {
      if (!chunk) continue;
      results.push(await provider.translate({ ...req, text: chunk }));
    }
    return {
      text: results.map((r) => r.text).join(''),
      provider: provider.displayName,
      detectedLanguage: results.find((r) => r.detectedLanguage)?.detectedLanguage
    };
  }

  async translate(req: TranslateRequest, preferredProvider?: string): Promise<TranslateResult> {
    const selected = preferredProvider || getProvider();
    if (selected !== 'auto') {
      const provider = this.providers.get(selected);
      if (!provider) throw new Error(`Unknown provider: ${selected}`);
      if (!isProviderEnabled(selected)) throw new Error(`${provider.displayName} is disabled. Enable it in PolyLingo settings.`);
      if (!await provider.isConfigured()) throw new Error(`${provider.displayName} is not configured.`);
      return this.runProvider(provider, req);
    }

    const errors: string[] = [];
    for (const id of getProviderOrder()) {
      if (id === 'auto') continue;
      const provider = this.providers.get(id);
      if (!provider || !isProviderEnabled(id)) continue;
      try {
        if (!await provider.isConfigured()) continue;
        return await this.runProvider(provider, req);
      } catch (error) {
        errors.push(`${provider.displayName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`No translation provider succeeded.${errors.length ? `\n${errors.join('\n')}` : ' Configure a provider or API credential.'}`);
  }


  async hasAvailableAIProvider(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      if ((provider.kind !== 'openai-compatible' && provider.kind !== 'ollama') || !isProviderEnabled(provider.id)) continue;
      try {
        if (await provider.isConfigured()) return true;
      } catch {
        // Configuration checks should not make menus noisy.
      }
    }
    return false;
  }

  async testProvider(id: string): Promise<TranslateResult> {
    if (id === 'auto') throw new Error('Auto cannot be tested directly.');
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    if (!isProviderEnabled(id)) throw new Error(`${provider.displayName} is disabled.`);
    if (!await provider.isConfigured()) throw new Error(`${provider.displayName} is not configured.`);
    return this.runProvider(provider, {
      text: 'PolyLingo provider test.',
      sourceLanguage: 'en',
      targetLanguage: 'zh-CN',
      context: 'selection',
      explain: false
    });
  }

  async translateWithAI(req: TranslateRequest): Promise<TranslateResult> {
    const errors: string[] = [];
    for (const provider of this.providers.values()) {
      if ((provider.kind !== 'openai-compatible' && provider.kind !== 'ollama') || !isProviderEnabled(provider.id)) continue;
      try {
        if (!await provider.isConfigured()) continue;
        return await this.runProvider(provider, { ...req, explain: true });
      } catch (error) {
        errors.push(`${provider.displayName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`No AI provider is configured or available.${errors.length ? `\n${errors.join('\n')}` : ''}`);
  }
}
