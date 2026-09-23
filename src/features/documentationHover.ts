import * as vscode from 'vscode';
import { getSetting } from '../core/config';
import { t } from '../core/i18n';
import { TranslateResult } from '../core/types';

function documentationText(hovers: vscode.Hover[]): string {
  const paragraphs: string[] = [];
  for (const hover of hovers) {
    if (hover.contents.some((content) => {
      const value = typeof content === 'string' ? content : content.value;
      return value.startsWith('**PolyLingo**');
    })) continue;
    for (const content of hover.contents) {
      if (typeof content === 'object' && 'language' in content) continue;
      const markdown = typeof content === 'string' ? content : content.value;
      const prose = markdown
        .replace(/(^|\n)\s*(```|~~~)[^\n]*\n[\s\S]*?\n\s*\2[^\n]*(?=\n|$)/g, '\n')
        .replace(/^\s*\((?:module|class|function|method|property|variable)\)\s+[^\n]*(?:\n|$)/i, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/^\s*[-*_]{3,}\s*$/gm, '')
        .trim();
      if (prose && /[\p{L}]{2}.*\s+[\p{L}]{2}/u.test(prose)) paragraphs.push(prose);
    }
  }
  return [...new Set(paragraphs)].join('\n\n');
}

export class DocumentationHover implements vscode.HoverProvider {
  private readonly lookingUp = new Set<string>();
  private readonly cache = new Map<string, string>();
  private readonly translations = new Map<string, Promise<TranslateResult>>();
  private readonly hoverResults = new Map<string, TranslateResult>();
  private readonly loading = new Set<string>();

  constructor(private readonly translate: (text: string) => Promise<TranslateResult>) {}

  clearTranslations(): void {
    this.translations.clear();
    this.hoverResults.clear();
  }

  setLoading(document: vscode.TextDocument, position: vscode.Position, value: boolean): void {
    const key = this.key(document, position);
    if (value) this.loading.add(key);
    else this.loading.delete(key);
  }

  setHoverResult(document: vscode.TextDocument, position: vscode.Position, result: TranslateResult): void {
    this.hoverResults.set(this.key(document, position), result);
    if (this.hoverResults.size > 40) this.hoverResults.delete(this.hoverResults.keys().next().value as string);
  }

  private resultHover(document: vscode.TextDocument, position: vscode.Position, result: TranslateResult): vscode.Hover {
    const heading = new vscode.MarkdownString(`**PolyLingo · ${result.provider}**`);
    const translated = new vscode.MarkdownString(result.text.trim().replace(/!\[([^\]]*)\]\([^\n)]*\)/g, '$1'));
    translated.isTrusted = false;
    translated.supportHtml = false;
    return new vscode.Hover([heading, translated], document.getWordRangeAtPosition(position));
  }

  translateText(text: string): Promise<TranslateResult> {
    let translation = this.translations.get(text);
    if (!translation) {
      translation = this.translate(text);
      this.translations.set(text, translation);
      if (this.translations.size > 80) this.translations.delete(this.translations.keys().next().value as string);
      void translation.catch(() => {
        if (this.translations.get(text) === translation) this.translations.delete(text);
      });
    }
    return translation;
  }

  private key(document: vscode.TextDocument, position: vscode.Position): string {
    return `${document.uri.toString()}@${document.version}:${position.line}:${position.character}`;
  }

  async getText(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
    const key = this.key(document, position);
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    if (this.lookingUp.has(key)) return '';
    this.lookingUp.add(key);
    try {
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider', document.uri, position
      );
      const text = documentationText(hovers || []).slice(0, getSetting('maxSelectionChars', 12000));
      if (text) {
        this.cache.set(key, text);
        if (this.cache.size > 40) this.cache.delete(this.cache.keys().next().value as string);
      }
      return text;
    } finally {
      this.lookingUp.delete(key);
    }
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    if (this.lookingUp.has(this.key(document, position))) return undefined;
    if (this.loading.has(this.key(document, position))) {
      const spinner = new vscode.MarkdownString(`**PolyLingo**\n\n$(sync~spin) ${t('loading.translation')}`, true);
      return new vscode.Hover(spinner, document.getWordRangeAtPosition(position));
    }
    if (getSetting<'hover' | 'sidebar'>('documentationHover.presentation', 'hover') === 'hover') {
      const result = this.hoverResults.get(this.key(document, position));
      if (result) return this.resultHover(document, position, result);
    }
    const text = await this.getText(document, position);
    if (!text || token.isCancellationRequested) return undefined;
    const args = encodeURIComponent(JSON.stringify([document.uri.toString(), position.line, position.character]))
      .replace(/\(/g, '%28').replace(/\)/g, '%29');
    const link = new vscode.MarkdownString(`[${t('hover.translateDocumentation')}](command:polyLingo.translateDocumentationHover?${args})`);
    link.isTrusted = true;
    return new vscode.Hover(link, document.getWordRangeAtPosition(position));
  }
}
