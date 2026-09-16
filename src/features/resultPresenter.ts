import * as vscode from 'vscode';
import { getProvider, getSourceLanguage, getTargetLanguage, isProviderEnabled } from '../core/config';
import { t } from '../core/i18n';
import { TranslateResult } from '../core/types';
import { COMMON_LANGUAGES } from '../utils/language';

const markdownParser = require('marked') as {
  marked: (source: string, options: Record<string, unknown>) => string;
  Renderer: new () => {
    html: (html: string) => string;
    link: (href: string | null, title: string | null, text: string) => string;
    image: (href: string | null, title: string | null, text: string) => string;
  };
};

function escapeMarkdownHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSafeMarkdown(value: string): string {
  const renderer = new markdownParser.Renderer();
  renderer.html = (html) => escapeMarkdownHtml(html);
  renderer.image = (_href, _title, text) => `<span class="markdown-image-placeholder">[${escapeMarkdownHtml(text || 'image')}]</span>`;
  renderer.link = (href, title, text) => {
    const safeHref = href && /^(https?:|mailto:)/i.test(href) ? href : undefined;
    if (!safeHref) return text;
    const titleAttribute = title ? ` title="${escapeMarkdownHtml(title)}"` : '';
    return `<a href="${escapeMarkdownHtml(safeHref)}"${titleAttribute} rel="noopener noreferrer">${text}</a>`;
  };
  return markdownParser.marked(value, {
    renderer,
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false
  });
}

function markdownForHover(value: string): string {
  // Remote images are omitted in Hover to avoid background network requests.
  return value.replace(/!\[([^\]]*)\]\([^\n)]*\)/g, (_match, alt: string) => `[${alt || 'image'}]`);
}

interface EditorStateBase {
  uri: string;
  range: vscode.Range;
  original: string;
  documentVersion: number;
}

interface EditorLoadingState extends EditorStateBase {
  kind: 'loading';
  requestId: number;
}

interface EditorReadyState extends EditorStateBase {
  kind: 'ready';
}

interface EditorResultState extends EditorStateBase {
  kind: 'result';
  result: TranslateResult;
}

interface EditorErrorState extends EditorStateBase {
  kind: 'error';
  message: string;
}

type EditorState = EditorReadyState | EditorLoadingState | EditorResultState | EditorErrorState;
type FloatingAction = 'copy' | 'output' | 'explain' | 'close';
export type ResultPresentation = 'hover' | 'sidebar' | 'notification' | 'editor';

interface FloatingItem extends vscode.QuickPickItem {
  action?: FloatingAction;
}

interface TranslationHistoryEntry {
  id: string;
  createdAt: number;
  original: string;
  result: TranslateResult;
}

type SidebarTranslateHandler = (text: string, sourceLanguage: string, targetLanguage: string, provider: string) => Promise<TranslateResult>;

const HISTORY_KEY = 'polyLingo.translationHistory';
const HISTORY_LIMIT = 30;

/**
 * Presents translation results through the user-selected surface. Terminal
 * results intentionally exclude Hover because VS Code does not expose stable
 * terminal hover decorations; clipboard results retain the compact QuickPick.
 */
export class ResultPresenter implements vscode.HoverProvider, vscode.WebviewViewProvider, vscode.Disposable {
  private readonly output = vscode.window.createOutputChannel('PolyLingo');
  private readonly disposables: vscode.Disposable[] = [];
  private history: TranslationHistoryEntry[];
  private editorState: EditorState | undefined;
  private sidebarView: vscode.WebviewView | undefined;
  private sidebarExplainCommand: string | undefined;
  private sidebarTranslateHandler: SidebarTranslateHandler | undefined;
  private sidebarInput = '';
  private sidebarProvider: string = getProvider();
  private sidebarProviders: Array<{ id: string; name: string }> = [];
  private sidebarSourceLanguage = getSourceLanguage();
  private sidebarTargetLanguage = getTargetLanguage();
  private sidebarBusy = false;
  private sidebarError = '';
  private lastResult: TranslateResult | undefined;
  private lastOriginal: string | undefined;
  private aiAvailable = false;
  private editorRequestSequence = 0;

  constructor(private readonly storage: vscode.Memento) {
    this.history = storage.get<TranslationHistoryEntry[]>(HISTORY_KEY, []).filter((entry) => (
      entry && typeof entry.id === 'string' && typeof entry.original === 'string' && typeof entry.result?.text === 'string'
    )).slice(0, HISTORY_LIMIT);
  }

  setAiAvailable(value: boolean): void {
    this.aiAvailable = value;
  }

  setSidebarTranslateHandler(handler: SidebarTranslateHandler): void {
    this.sidebarTranslateHandler = handler;
  }

  setSidebarProviders(providers: Array<{ id: string; name: string }>): void {
    this.sidebarProviders = providers;
    if (this.sidebarProvider !== 'auto' && !providers.some((provider) => provider.id === this.sidebarProvider)) this.sidebarProvider = 'auto';
    this.renderSidebar();
  }

  setSidebarInput(original: string): void {
    if (this.sidebarInput === original) return;
    this.sidebarInput = original;
    this.sidebarError = '';
    this.renderSidebar();
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.sidebarView = view;
    view.webview.options = { enableScripts: true };
    this.disposables.push(view.webview.onDidReceiveMessage(async (message) => {
      if (message?.type === 'copy') await this.copyLastResult();
      if (message?.type === 'output') this.showLastResultOutput();
      if (message?.type === 'explain' && this.sidebarExplainCommand) {
        await vscode.commands.executeCommand(this.sidebarExplainCommand);
      }
      if (message?.type === 'translate' && this.sidebarTranslateHandler && !this.sidebarBusy) {
        const text = String(message.text || '').trim();
        if (!text) return;
        const languageCodes = COMMON_LANGUAGES.map(([code]) => code as string);
        this.sidebarInput = text;
        const sourceLanguage = String(message.sourceLanguage || 'auto');
        const targetLanguage = String(message.targetLanguage || getTargetLanguage());
        const provider = String(message.provider || 'auto');
        this.sidebarSourceLanguage = languageCodes.includes(sourceLanguage) ? sourceLanguage : 'auto';
        this.sidebarTargetLanguage = targetLanguage !== 'auto' && languageCodes.includes(targetLanguage) ? targetLanguage : getTargetLanguage();
        this.sidebarProvider = provider === 'auto' || (this.sidebarProviders.some((item) => item.id === provider) && isProviderEnabled(provider)) ? provider : 'auto';
        this.sidebarBusy = true;
        this.sidebarError = '';
        this.renderSidebar();
        try {
          const result = await this.sidebarTranslateHandler(text, this.sidebarSourceLanguage, this.sidebarTargetLanguage, this.sidebarProvider);
          this.remember(result, text);
        } catch (error) {
          this.sidebarError = error instanceof Error ? error.message : String(error);
        } finally {
          this.sidebarBusy = false;
          this.renderSidebar();
        }
      }
      if (message?.type === 'draft') {
        this.sidebarInput = String(message.text || '');
        this.sidebarSourceLanguage = String(message.sourceLanguage || 'auto');
        this.sidebarTargetLanguage = String(message.targetLanguage || getTargetLanguage());
        this.sidebarProvider = String(message.provider || 'auto');
      }
      if (message?.type === 'showHistory') {
        const entry = this.history.find((item) => item.id === String(message.id));
        if (entry) {
          this.lastOriginal = entry.original;
          this.lastResult = entry.result;
          this.sidebarInput = entry.original;
          this.sidebarExplainCommand = undefined;
          this.sidebarError = '';
          this.renderSidebar();
        }
      }
      if (message?.type === 'deleteHistory') {
        this.history = this.history.filter((item) => item.id !== String(message.id));
        await this.storage.update(HISTORY_KEY, this.history);
        this.renderSidebar();
      }
      if (message?.type === 'clearHistory') {
        this.history = [];
        await this.storage.update(HISTORY_KEY, this.history);
        this.renderSidebar();
      }
    }));
    this.renderSidebar();
  }

  private renderSidebar(): void {
    if (!this.sidebarView) return;
    const result = this.lastOriginal === this.sidebarInput ? this.lastResult : undefined;
    const nonce = Math.random().toString(36).slice(2);
    const escape = (value: string) => value
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const option = (code: string, name: string, selected: string) => `<option value="${escape(code)}" ${code === selected ? 'selected' : ''}>${escape(name)}</option>`;
    const sourceOptions = COMMON_LANGUAGES.map(([code, name]) => option(code, name, this.sidebarSourceLanguage)).join('');
    const targetOptions = COMMON_LANGUAGES.filter(([code]) => code !== 'auto').map(([code, name]) => option(code, name, this.sidebarTargetLanguage)).join('');
    const providerOptions = [option('auto', t('provider.auto'), this.sidebarProvider), ...this.sidebarProviders
      .filter((provider) => isProviderEnabled(provider.id))
      .map((provider) => option(provider.id, provider.name, this.sidebarProvider))].join('');
    const actions = result ? `<div class="actions">
      <button data-action="copy">${escape(t('floating.copy'))}</button>
      ${this.sidebarExplainCommand ? `<button data-action="explain">${escape(t('floating.explain'))}</button>` : ''}
      <button class="secondary" data-action="output">${escape(t('floating.output'))}</button>
    </div>` : '';
    const resultBody = result ? `
      <section class="result-card">
        <div class="translated-text markdown-body">${renderSafeMarkdown(result.text.trim())}</div>
        <div class="meta">${escape(result.provider)}${result.detectedLanguage ? ` · ${escape(result.detectedLanguage)}` : ''}</div>
        ${actions}
      </section>` : `<p class="empty">${escape(t('sidebar.emptyHistory'))}</p>`;
    const history = this.history.length ? this.history.map((entry) => {
      const source = entry.original.replace(/\s+/g, ' ').trim();
      const translated = entry.result.text.replace(/\s+/g, ' ').trim();
      return `<div class="history-item"><button class="history-main" data-history="${escape(entry.id)}"><strong>${escape(source.slice(0, 80))}</strong><span>${escape(translated.slice(0, 100))}</span></button><button class="icon-button" title="${escape(t('sidebar.delete'))}" data-delete-history="${escape(entry.id)}">×</button></div>`;
    }).join('') : `<p class="empty">${escape(t('sidebar.emptyHistory'))}</p>`;
    const error = this.sidebarError ? `<div class="error"><strong>${escape(t('sidebar.translationFailed'))}</strong><br>${escape(this.sidebarError)}</div>` : '';
    this.sidebarView.webview.html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <style>*{box-sizing:border-box}body{padding:12px;color:var(--vscode-foreground);font-family:var(--vscode-font-family)}h2{font-size:13px;margin:4px 0 10px}.meta,.empty,.history-item span{color:var(--vscode-descriptionForeground)}textarea,select{width:100%;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,transparent);padding:7px;font:inherit}textarea{min-height:92px;resize:vertical}.languages{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.field{display:flex;flex-direction:column;gap:4px;font-size:11px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.55;margin:0}.result-card{padding:14px;border:1px solid var(--vscode-widget-border,var(--vscode-panel-border));border-left:3px solid var(--vscode-focusBorder);border-radius:6px;background:var(--vscode-editorWidget-background)}.translated-text{font-size:calc(var(--vscode-font-size) + 1px);line-height:1.65;color:var(--vscode-editor-foreground)}.markdown-body>:first-child{margin-top:0}.markdown-body>:last-child{margin-bottom:0}.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4{line-height:1.3;margin:1em 0 .45em}.markdown-body h1{font-size:1.55em}.markdown-body h2{font-size:1.35em}.markdown-body h3{font-size:1.18em}.markdown-body p,.markdown-body ul,.markdown-body ol,.markdown-body blockquote,.markdown-body pre,.markdown-body table{margin:.65em 0}.markdown-body ul,.markdown-body ol{padding-left:1.6em}.markdown-body blockquote{border-left:3px solid var(--vscode-textBlockQuote-border);margin-left:0;padding:.15em .8em;color:var(--vscode-textBlockQuote-foreground);background:var(--vscode-textBlockQuote-background)}.markdown-body code{font-family:var(--vscode-editor-font-family);font-size:.92em;background:var(--vscode-textCodeBlock-background);padding:.12em .3em;border-radius:3px}.markdown-body pre{overflow:auto;white-space:pre;padding:10px;background:var(--vscode-textCodeBlock-background);border-radius:4px}.markdown-body pre code{padding:0;background:transparent}.markdown-body table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}.markdown-body th,.markdown-body td{border:1px solid var(--vscode-panel-border);padding:5px 8px;text-align:left}.markdown-body a{color:var(--vscode-textLink-foreground)}.markdown-image-placeholder{color:var(--vscode-descriptionForeground);font-style:italic}.result-card .meta{margin-top:10px;font-size:11px}.original{margin-top:12px;border-top:1px solid var(--vscode-panel-border);padding-top:9px}.original summary{cursor:pointer;color:var(--vscode-descriptionForeground);font-size:11px}.original pre{margin-top:8px;color:var(--vscode-descriptionForeground)}.actions,.section-title{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:12px}.section-title{justify-content:space-between;margin-top:24px;border-top:1px solid var(--vscode-panel-border);padding-top:14px}button{border:0;padding:6px 10px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer}button:hover{background:var(--vscode-button-hoverBackground)}button.secondary,.history-main,.icon-button{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}button:disabled{opacity:.55;cursor:default}.error{margin-top:10px;padding:8px;color:var(--vscode-errorForeground);background:var(--vscode-inputValidation-errorBackground);border:1px solid var(--vscode-inputValidation-errorBorder)}.history-item{display:grid;grid-template-columns:1fr auto;gap:4px;margin:6px 0}.history-main{text-align:left;min-width:0;display:flex;flex-direction:column;gap:3px}.history-main strong,.history-main span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.icon-button{padding:4px 9px;font-size:16px}</style>
      </head><body><h2>${escape(t('sidebar.input'))}</h2><form id="translate-form"><textarea id="source-text" placeholder="${escape(t('sidebar.inputPlaceholder'))}">${escape(this.sidebarInput)}</textarea><div class="languages"><label class="field">${escape(t('sidebar.sourceLanguage'))}<select id="source-language">${sourceOptions}</select></label><label class="field">${escape(t('sidebar.targetLanguage'))}<select id="target-language">${targetOptions}</select></label></div><label class="field">${escape(t('sidebar.provider'))}<select id="provider">${providerOptions}</select></label><button type="submit" ${this.sidebarBusy ? 'disabled' : ''}>${escape(this.sidebarBusy ? t('sidebar.translating') : t('sidebar.translate'))}</button></form>${error}<div class="section-title"><h2>${escape(t('sidebar.result'))}</h2></div>${resultBody}<div class="section-title"><h2>${escape(t('sidebar.history'))}</h2>${this.history.length ? `<button class="secondary" data-clear-history>${escape(t('sidebar.clearHistory'))}</button>` : ''}</div>${history}<script nonce="${nonce}">const vscode=acquireVsCodeApi();const form=document.getElementById('translate-form'),text=document.getElementById('source-text'),source=document.getElementById('source-language'),target=document.getElementById('target-language'),provider=document.getElementById('provider');const payload=type=>({type,text:text.value,sourceLanguage:source.value,targetLanguage:target.value,provider:provider.value});form.addEventListener('submit',event=>{event.preventDefault();vscode.postMessage(payload('translate'))});text.addEventListener('input',()=>vscode.postMessage(payload('draft')));source.addEventListener('change',()=>vscode.postMessage(payload('draft')));target.addEventListener('change',()=>vscode.postMessage(payload('draft')));provider.addEventListener('change',()=>vscode.postMessage(payload('draft')));text.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();form.requestSubmit()}});document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({type:button.dataset.action})));document.querySelectorAll('[data-history]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({type:'showHistory',id:button.dataset.history})));document.querySelectorAll('[data-delete-history]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({type:'deleteHistory',id:button.dataset.deleteHistory})));document.querySelector('[data-clear-history]')?.addEventListener('click',()=>vscode.postMessage({type:'clearHistory'}));</script></body></html>`;
  }

  private remember(result: TranslateResult, original?: string, explainCommand?: string): void {
    this.lastResult = result;
    this.lastOriginal = original;
    if (original !== undefined) this.sidebarInput = original;
    this.sidebarExplainCommand = explainCommand;
    if (original?.trim()) {
      const storedResult: TranslateResult = {
        text: result.text.slice(0, 10000),
        provider: result.provider,
        detectedLanguage: result.detectedLanguage
      };
      const entry: TranslationHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        original: original.slice(0, 10000),
        result: storedResult
      };
      this.history = [entry, ...this.history.filter((item) => item.original !== entry.original || item.result.text !== entry.result.text)].slice(0, HISTORY_LIMIT);
      void this.storage.update(HISTORY_KEY, this.history);
    }
    this.renderSidebar();
  }

  async present(
    result: TranslateResult,
    original: string | undefined,
    presentation: Exclude<ResultPresentation, 'hover'>,
    explainCommand?: string
  ): Promise<void> {
    this.remember(result, original, explainCommand);
    if (presentation === 'sidebar') {
      this.renderSidebar();
      await vscode.commands.executeCommand('polyLingo.translationView.focus');
      this.renderSidebar();
      return;
    }
    if (presentation === 'editor') {
      const content = [
        `PolyLingo · ${result.provider}`,
        result.detectedLanguage ? `${t('hover.detected')}: ${result.detectedLanguage}` : '',
        original ? `\n--- Original ---\n${original}` : '',
        `\n--- ${t('floating.translation')} ---\n${result.text}`
      ].filter(Boolean).join('\n');
      const document = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
      await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside });
      try {
        await vscode.commands.executeCommand('markdown.showPreview', document.uri);
      } catch {
        // Keep the Markdown source document open if the built-in preview
        // command is unavailable or another extension has disabled it.
      }
      return;
    }

    const preview = result.text.trim().replace(/\s+/g, ' ');
    const copy = t('floating.copy');
    const output = t('floating.output');
    const explain = t('floating.explain');
    const picked = await vscode.window.showInformationMessage(
      `PolyLingo · ${result.provider}: ${preview.length > 500 ? `${preview.slice(0, 500)}…` : preview}`,
      ...[copy, ...(explainCommand ? [explain] : []), output]
    );
    if (picked === copy) await this.copyLastResult();
    if (picked === output) this.showLastResultOutput();
    if (picked === explain && explainCommand) await vscode.commands.executeCommand(explainCommand);
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    const state = this.editorState;
    if (!state || state.uri !== document.uri.toString() || !state.range.contains(position)) return undefined;

    const markdown = new vscode.MarkdownString();
    if (state.kind === 'ready') {
      markdown.appendMarkdown(`**PolyLingo**\n\n[${t('sidebar.translate')}](command:polyLingo.translateSelection)`);
      markdown.isTrusted = true;
      return new vscode.Hover(markdown, state.range);
    }
    if (state.kind === 'loading') {
      markdown.appendMarkdown('**PolyLingo**\n\n');
      markdown.appendText(`⏳ ${t('loading.translation')}`);
      return new vscode.Hover(markdown, state.range);
    }
    if (state.kind === 'error') {
      markdown.appendMarkdown('**PolyLingo**\n\n');
      markdown.appendText(`${t('sidebar.translationFailed')}: ${state.message}`);
      const retry = new vscode.MarkdownString(`[${t('sidebar.translate')}](command:polyLingo.translateSelection)`);
      retry.isTrusted = true;
      return new vscode.Hover([markdown, retry], state.range);
    }

    // Keep translated Markdown untrusted and separate from the trusted,
    // hard-coded PolyLingo command links below.
    markdown.appendMarkdown(`**PolyLingo** · \`${state.result.provider}\``);
    if (state.result.detectedLanguage) {
      markdown.appendMarkdown(` · ${t('hover.detected')} \`${state.result.detectedLanguage}\``);
    }

    const translatedMarkdown = new vscode.MarkdownString(markdownForHover(state.result.text.trim()));
    translatedMarkdown.isTrusted = false;
    translatedMarkdown.supportHtml = false;

    const actions = [
      `[${t('hover.copy')}](command:polyLingo.copyLastResult)`,
      `[${t('hover.replace')}](command:polyLingo.replaceLastResult)`
    ];
    if (this.aiAvailable) actions.push(`[${t('hover.explain')}](command:polyLingo.explainSelection)`);
    actions.push(`[${t('hover.output')}](command:polyLingo.showLastResultOutput)`);

    const actionMarkdown = new vscode.MarkdownString(`---\n\n${actions.join(' · ')}`);
    actionMarkdown.isTrusted = true;

    return new vscode.Hover([markdown, translatedMarkdown, actionMarkdown], state.range);
  }

  private async refreshEditorHover(): Promise<void> {
    // An already visible hover keeps the Markdown returned by the previous
    // provider call. Close it first so showHover asks the provider for the
    // current loading/result state instead of continuing to show that snapshot.
    try {
      await vscode.commands.executeCommand('editor.action.hideHover');
    } catch {
      // Older VS Code versions may not expose hideHover as a command. Calling
      // showHover still preserves the previous best-effort behaviour there.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await vscode.commands.executeCommand('editor.action.showHover');
  }

  async showEditorReady(editor: vscode.TextEditor, selection: vscode.Selection, original: string): Promise<void> {
    this.editorState = {
      kind: 'ready',
      uri: editor.document.uri.toString(),
      range: new vscode.Range(selection.start, selection.end),
      original,
      documentVersion: editor.document.version
    };
    await this.refreshEditorHover();
  }

  async clearEditorReady(): Promise<void> {
    if (this.editorState?.kind !== 'ready' && this.editorState?.kind !== 'error') return;
    this.editorState = undefined;
    try {
      await vscode.commands.executeCommand('editor.action.hideHover');
    } catch {
      // The state is already cleared on VS Code versions without hideHover.
    }
  }

  async showEditorLoading(editor: vscode.TextEditor, selection: vscode.Selection, original: string): Promise<number> {
    const requestId = ++this.editorRequestSequence;
    this.editorState = {
      kind: 'loading',
      requestId,
      uri: editor.document.uri.toString(),
      range: new vscode.Range(selection.start, selection.end),
      original,
      documentVersion: editor.document.version
    };
    // Let VS Code process the selection change before opening the hover. This
    // makes the loading popup reliable when translation starts immediately
    // after a mouse selection or keyboard selection.
    await this.refreshEditorHover();
    return requestId;
  }

  async clearEditorLoading(requestId?: number): Promise<void> {
    if (this.editorState?.kind !== 'loading') return;
    if (requestId !== undefined && this.editorState.requestId !== requestId) return;
    this.editorState = undefined;
    try {
      await vscode.commands.executeCommand('editor.action.hideHover');
    } catch {
      // See refreshEditorHover: clearing the provider state is still useful on
      // VS Code versions where the internal hide command is unavailable.
    }
  }

  async showEditorError(requestId: number, error: unknown): Promise<boolean> {
    const state = this.editorState;
    if (state?.kind !== 'loading' || state.requestId !== requestId) return false;
    this.editorState = {
      kind: 'error',
      uri: state.uri,
      range: state.range,
      original: state.original,
      documentVersion: state.documentVersion,
      message: error instanceof Error ? error.message : String(error)
    };
    try {
      await this.refreshEditorHover();
      return true;
    } catch {
      // Keep the error state available to the Hover provider even if VS Code
      // cannot reopen the popup automatically.
      return false;
    }
  }

  async showEditor(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    result: TranslateResult,
    original: string,
    requestId?: number
  ): Promise<boolean> {
    if (requestId !== undefined) {
      const state = this.editorState;
      if (state?.kind !== 'loading' || state.requestId !== requestId) return false;
    }
    this.remember(result, original);
    this.editorState = {
      kind: 'result',
      uri: editor.document.uri.toString(),
      range: new vscode.Range(selection.start, selection.end),
      original,
      result,
      documentVersion: editor.document.version
    };

    // editor.action.showHover is a long-standing built-in command and keeps us
    // on stable VS Code APIs instead of requiring a proposed overlay API.
    await this.refreshEditorHover();
    return true;
  }

  async showFloating(result: TranslateResult, original?: string, explainCommand?: string): Promise<void> {
    this.remember(result, original, explainCommand);

    const text = result.text.trim();
    const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
    const previewLines = lines.length > 0 ? lines : [text];

    const actionItems: FloatingItem[] = [
      {
        label: `$(copy)  ${t('floating.copy')}`,
        description: result.provider,
        detail: t('floating.copyDetail'),
        action: 'copy'
      },
      {
        label: `$(output)  ${t('floating.output')}`,
        detail: t('floating.outputDetail'),
        action: 'output'
      }
    ];
    if (explainCommand) {
      actionItems.splice(1, 0, {
        label: `$(sparkle)  ${t('floating.explain')}`,
        detail: t('floating.explainDetail'),
        action: 'explain'
      });
    }

    const items: FloatingItem[] = [
      ...actionItems,
      ...previewLines.slice(0, 18).map((line, index) => ({
        label: `$(quote)  ${line || ' '}`,
        description: index === 0 ? t('floating.translation') : undefined,
        action: 'close' as FloatingAction
      }))
    ];

    if (previewLines.length > 18) {
      items.push({
        label: `$(ellipsis)  ${t('floating.moreLines', { count: previewLines.length - 18 })}`,
        detail: t('floating.moreLinesDetail'),
        action: 'output'
      });
    }

    const picked = await vscode.window.showQuickPick(items, {
      title: `PolyLingo · ${result.provider}`,
      placeHolder: result.detectedLanguage
        ? t('floating.detectedPlaceholder', { language: result.detectedLanguage })
        : t('floating.resultPlaceholder'),
      ignoreFocusOut: false,
      matchOnDescription: false,
      matchOnDetail: false
    });

    if (picked?.action === 'copy') {
      await vscode.env.clipboard.writeText(result.text);
    } else if (picked?.action === 'output') {
      this.showLastResultOutput();
    } else if (picked?.action === 'explain' && explainCommand) {
      await vscode.commands.executeCommand(explainCommand);
    }
  }

  async copyLastResult(): Promise<void> {
    if (!this.lastResult) return;
    await vscode.env.clipboard.writeText(this.lastResult.text);
  }

  async replaceLastResult(): Promise<void> {
    const state = this.editorState;
    if (!state || state.kind !== 'result') return;

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== state.uri) {
      void vscode.window.showWarningMessage(t('warning.editorInactive'));
      return;
    }

    if (editor.document.version !== state.documentVersion || editor.document.getText(state.range) !== state.original) {
      void vscode.window.showWarningMessage(t('warning.documentChanged'));
      return;
    }

    const ok = await editor.edit((edit) => edit.replace(state.range, state.result.text));
    if (ok) {
      const end = editor.document.positionAt(editor.document.offsetAt(state.range.start) + state.result.text.length);
      editor.selection = new vscode.Selection(state.range.start, end);
      this.editorState = undefined;
    }
  }

  showLastResultOutput(): void {
    const result = this.lastResult;
    if (!result) return;

    this.output.clear();
    this.output.appendLine(`Provider: ${result.provider}`);
    if (result.detectedLanguage) this.output.appendLine(`Detected: ${result.detectedLanguage}`);
    this.output.appendLine('');
    if (this.lastOriginal) {
      this.output.appendLine('--- Original ---');
      this.output.appendLine(this.lastOriginal);
      this.output.appendLine('');
      this.output.appendLine('--- Translation ---');
    }
    this.output.appendLine(result.text);
    this.output.show(true);
  }

  dispose(): void {
    for (const disposable of this.disposables) disposable.dispose();
    this.output.dispose();
  }
}
