import { getSetting } from '../core/config';
import { formEncode, request } from '../core/http';
import { TranslateRequest, TranslateResult, TranslationProvider } from '../core/types';
import { normalizeLanguage } from '../utils/language';

interface BingSession {
  token: string;
  key: string;
  ig: string;
  iid: string;
  cookie: string;
  createdAt: number;
}

function bingLang(lang: string): string {
  const n = normalizeLanguage(lang);
  if (n === 'zh-CN') return 'zh-Hans';
  if (n === 'zh-TW') return 'zh-Hant';
  return n;
}

export class BingWebProvider implements TranslationProvider {
  readonly id = 'bing-web' as const;
  readonly displayName = 'Bing Web (experimental)';
  readonly maxChars = 1000;
  private session?: BingSession;

  isConfigured(): boolean { return true; }

  private async getSession(): Promise<BingSession> {
    if (this.session && Date.now() - this.session.createdAt < 8 * 60 * 1000) return this.session;
    const pageUrl = getSetting('bingWeb.endpoint', 'https://www.bing.com/translator');
    const res = await request(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 Smart-Dev-Translator/0.1', Accept: 'text/html' }
    });
    const html = res.body;
    const ig = html.match(/"ig"\s*:\s*"([^"]+)"/i)?.[1]
      || html.match(/IG\s*:\s*"([^"]+)"/)?.[1]
      || html.match(/IG\s*:\s*'([^']+)'/)?.[1];
    const iidMatches = [...html.matchAll(/data-iid="([^"]*translator[^"]*)"/ig)];
    const iid = iidMatches.length ? iidMatches[iidMatches.length - 1][1] : 'translator.5028.1';
    const abuse = html.match(/params_AbusePreventionHelper\s*=\s*\[\s*([0-9]+)\s*,\s*"([^"]+)"\s*,/i);
    if (!ig || !abuse) throw new Error('Unable to obtain Bing web translation token. Bing may have changed its page format.');
    const setCookie = res.headers['set-cookie'];
    const cookie = Array.isArray(setCookie)
      ? setCookie.map((v) => v.split(';')[0]).join('; ')
      : (setCookie ? String(setCookie).split(';')[0] : '');
    this.session = { key: abuse[1], token: abuse[2], ig, iid, cookie, createdAt: Date.now() };
    return this.session;
  }

  async translate(req: TranslateRequest): Promise<TranslateResult> {
    const session = await this.getSession();
    const endpoint = new URL('https://www.bing.com/ttranslatev3');
    endpoint.searchParams.set('isVertical', '1');
    endpoint.searchParams.set('IG', session.ig);
    endpoint.searchParams.set('IID', session.iid);
    const payload = formEncode({
      text: req.text,
      fromLang: req.sourceLanguage === 'auto' ? 'auto-detect' : bingLang(req.sourceLanguage),
      to: bingLang(req.targetLanguage),
      token: session.token,
      key: session.key
    });
    const res = await request<any>(endpoint.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 Smart-Dev-Translator/0.1',
        Origin: 'https://www.bing.com',
        Referer: 'https://www.bing.com/translator',
        Cookie: session.cookie
      },
      body: payload
    });
    const data = res.json;
    if (!Array.isArray(data) || !data[0]?.translations?.[0]?.text) throw new Error('Unexpected Bing translation response.');
    return {
      text: data[0].translations[0].text,
      provider: this.id,
      detectedLanguage: data[0].detectedLanguage?.language,
      raw: data
    };
  }
}
