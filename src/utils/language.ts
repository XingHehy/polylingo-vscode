export const COMMON_LANGUAGES = [
  ['auto', 'Auto Detect'],
  ['zh-CN', '简体中文'],
  ['zh-TW', '繁體中文'],
  ['en', 'English'],
  ['ja', '日本語'],
  ['ko', '한국어'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['es', 'Español'],
  ['ru', 'Русский'],
  ['pt', 'Português'],
  ['it', 'Italiano'],
  ['ar', 'العربية'],
  ['hi', 'हिन्दी'],
  ['th', 'ไทย'],
  ['vi', 'Tiếng Việt'],
  ['id', 'Bahasa Indonesia'],
  ['tr', 'Türkçe'],
  ['pl', 'Polski'],
  ['nl', 'Nederlands']
] as const;

export function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh_hans' || lower === 'zh-hans') return 'zh-CN';
  if (lower === 'zh-tw' || lower === 'zh_hant' || lower === 'zh-hant') return 'zh-TW';
  return lang;
}

/** Lightweight fallback for providers such as MyMemory that require an explicit source language. */
export function guessLanguage(text: string): string {
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  return 'en';
}

export function toProviderLanguage(lang: string, provider: string): string {
  const n = normalizeLanguage(lang);
  if (provider === 'deepl') {
    if (n === 'zh-CN' || n === 'zh-TW') return 'ZH';
    if (n === 'en') return 'EN';
    if (n === 'pt') return 'PT-PT';
    return n.toUpperCase();
  }
  if (provider === 'baidu') {
    const map: Record<string, string> = {
      auto: 'auto', 'zh-CN': 'zh', 'zh-TW': 'cht', en: 'en', ja: 'jp', ko: 'kor', fr: 'fra', es: 'spa', ar: 'ara'
    };
    return map[n] || n;
  }
  if (provider === 'tencent') {
    if (n === 'zh-CN') return 'zh';
    if (n === 'zh-TW') return 'zh-TW';
    return n;
  }
  return n;
}
