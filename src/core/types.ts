export type ProviderId =
  | 'auto'
  | 'google-free'
  | 'bing-web'
  | 'mymemory'
  | 'libretranslate'
  | 'deepl'
  | 'azure'
  | 'google-cloud'
  | 'baidu'
  | 'tencent'
  | 'openai-compatible'
  | 'ollama';

export type ProviderKind = Exclude<ProviderId, 'auto'>;

export interface ProviderInstance {
  id: string;
  kind: ProviderKind;
  name: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export type TranslationContext = 'selection' | 'document' | 'terminal' | 'clipboard' | 'comment';

export interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: TranslationContext;
  explain?: boolean;
}

export interface TranslateResult {
  text: string;
  provider: string;
  detectedLanguage?: string;
  raw?: unknown;
}

export interface TranslationProvider {
  readonly id: string;
  readonly kind?: ProviderKind;
  readonly displayName: string;
  readonly maxChars?: number;
  isConfigured(): Promise<boolean> | boolean;
  translate(request: TranslateRequest): Promise<TranslateResult>;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
  proxy?: string;
}

export interface HttpResponse<T = unknown> {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  json?: T;
}
