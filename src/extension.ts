import * as vscode from 'vscode';
import { CONFIG_SECTION, getProvider, getSourceLanguage, getTargetLanguage, getSetting, isProviderEnabled, setGlobalSetting } from './core/config';
import { getUiLanguage, t } from './core/i18n';
import { TranslationManager } from './core/manager';
import { Secrets } from './core/secrets';
import { TranslateRequest } from './core/types';
import { translateDocumentText } from './features/documentTranslator';
import { LoadingIndicator } from './features/loading';
import { ResultPresentation, ResultPresenter } from './features/resultPresenter';
import { SettingsPanel } from './features/settingsPanel';
import { readTerminalSelection } from './features/terminal';
import { registerProviders } from './providers';
import { COMMON_LANGUAGES } from './utils/language';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function selectionText(): { editor: vscode.TextEditor; selection: vscode.Selection; text: string } {
  const editor = vscode.window.activeTextEditor;
  if (!editor) throw new Error(t('error.noActiveEditor'));
  const selection = editor.selection;
  if (selection.isEmpty) throw new Error(t('error.selectTextFirst'));
  const text = editor.document.getText(selection);
  const max = getSetting('maxSelectionChars', 12000);
  if (text.length > max) {
    throw new Error(t('error.selectionTooLarge', { count: text.length, limit: max }));
  }
  return { editor, selection, text };
}

function requestFor(text: string, context: TranslateRequest['context'], explain = false): TranslateRequest {
  return {
    text,
    sourceLanguage: getSourceLanguage(),
    targetLanguage: getTargetLanguage(),
    context,
    explain
  };
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const secrets = new Secrets(context.secrets);
  const manager = new TranslationManager();
  registerProviders(manager, secrets);
  const presenter = new ResultPresenter(context.globalState, String(context.extension.packageJSON.version));
  const loading = new LoadingIndicator();
  presenter.setSidebarProviders(manager.listProviders().map((provider) => ({ id: provider.id, name: provider.displayName })));
  presenter.setSidebarTranslateHandler(async (text, sourceLanguage, targetLanguage, provider) => {
    const max = getSetting('maxSelectionChars', 12000);
    if (text.length > max) throw new Error(t('error.selectionTooLarge', { count: text.length, limit: max }));
    return loading.run(t('loading.selection'), () => manager.translate({
      text,
      sourceLanguage,
      targetLanguage,
      context: 'selection',
      explain: false
    }, provider));
  });
  presenter.setSidebarExplainHandler((text, sourceLanguage, targetLanguage) => (
    loading.run(t('loading.aiSelection'), () => manager.translateWithAI({
      text,
      sourceLanguage,
      targetLanguage,
      context: 'selection',
      explain: true
    }))
  ));
  let aiAvailable = false;
  const refreshAiAvailability = async () => {
    aiAvailable = await manager.hasAvailableAIProvider();
    presenter.setAiAvailable(aiAvailable);
    await vscode.commands.executeCommand('setContext', 'polyLingo.aiAvailable', aiAvailable);
  };
  await refreshAiAvailability();
  context.subscriptions.push(
    presenter,
    loading,
    vscode.languages.registerHoverProvider('*', presenter),
    vscode.window.registerWebviewViewProvider('polyLingo.translationView', presenter)
  );

  const editorPresentation = (): ResultPresentation => {
    const value = getSetting<ResultPresentation>('result.editorPresentation', 'hover');
    return ['hover', 'sidebar', 'notification', 'editor'].includes(value) ? value : 'hover';
  };
  const terminalPresentation = (): Exclude<ResultPresentation, 'hover'> => {
    const value = getSetting<Exclude<ResultPresentation, 'hover'>>('result.terminalPresentation', 'sidebar');
    return ['sidebar', 'notification', 'editor'].includes(value) ? value : 'sidebar';
  };

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  status.command = 'polyLingo.selectProvider';
  const refreshStatus = () => {
    const selected = getProvider();
    status.text = `$(globe) ${selected === 'auto' ? t('provider.auto') : manager.getProvider(selected)?.displayName || selected} → ${getTargetLanguage()}`;
    status.tooltip = t('status.selectProviderTooltip');
    status.show();
  };
  refreshStatus();
  const refreshProviderState = async () => {
    registerProviders(manager, secrets);
    presenter.setSidebarProviders(manager.listProviders().map((provider) => ({ id: provider.id, name: provider.displayName })));
    refreshStatus();
    await refreshAiAvailability();
  };
  context.subscriptions.push(status, vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(CONFIG_SECTION)) {
      void refreshProviderState();
    }
  }));

  async function translateSelection(replace: boolean): Promise<void> {
    let hoverRequestId: number | undefined;
    try {
      const { editor, selection, text } = selectionText();
      const presentation = editorPresentation();
      if (presentation === 'hover') hoverRequestId = await presenter.showEditorLoading(editor, selection, text);
      else await presenter.clearEditorReady();
      const result = await loading.run(t('loading.selection'), () => manager.translate(requestFor(text, 'selection')));
      if (replace) {
        await editor.edit((edit) => edit.replace(selection, result.text));
        if (hoverRequestId !== undefined) await presenter.clearEditorLoading(hoverRequestId);
      } else if (presentation === 'hover' && hoverRequestId !== undefined) {
        await presenter.showEditor(editor, selection, result, text, hoverRequestId);
      } else {
        await presenter.present(result, text, presentation as Exclude<ResultPresentation, 'hover'>, aiAvailable ? 'polyLingo.explainSelection' : undefined);
      }
    } catch (error) {
      if (hoverRequestId === undefined || !(await presenter.showEditorError(hoverRequestId, error))) {
        vscode.window.showErrorMessage(`PolyLingo: ${errorMessage(error)}`);
      }
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('polyLingo.translateSelection', () => translateSelection(false)),
    vscode.commands.registerCommand('polyLingo.translateAndReplaceSelection', () => translateSelection(true)),
    vscode.commands.registerCommand('polyLingo.translateClipboard', async () => {
      try {
        const text = await vscode.env.clipboard.readText();
        if (!text.trim()) throw new Error(t('error.clipboardEmpty'));
        const result = await loading.run(t('loading.clipboard'), () => manager.translate(requestFor(text, 'clipboard')));
        await presenter.showFloating(result, text);
      } catch (error) {
        vscode.window.showErrorMessage(`PolyLingo: ${errorMessage(error)}`);
      }
    }),
    vscode.commands.registerCommand('polyLingo.translateTerminalSelection', async () => {
      try {
        const text = await readTerminalSelection();
        const result = await loading.run(t('loading.terminal'), () => manager.translate(requestFor(text, 'terminal')));
        await presenter.present(result, text, terminalPresentation(), aiAvailable ? 'polyLingo.explainTerminalSelection' : undefined);
      } catch (error) {
        vscode.window.showErrorMessage(`PolyLingo: ${errorMessage(error)}`);
      }
    }),
    vscode.commands.registerCommand('polyLingo.explainSelection', async () => {
      let hoverRequestId: number | undefined;
      try {
        const { editor, selection, text } = selectionText();
        const presentation = editorPresentation();
        if (presentation === 'hover') hoverRequestId = await presenter.showEditorLoading(editor, selection, text);
        const result = await loading.run(t('loading.aiSelection'), () => manager.translateWithAI(requestFor(text, 'selection', true)));
        if (presentation === 'hover' && hoverRequestId !== undefined) {
          await presenter.showEditor(editor, selection, result, text, hoverRequestId);
        } else {
          await presenter.present(result, text, presentation as Exclude<ResultPresentation, 'hover'>);
        }
      } catch (error) {
        if (hoverRequestId === undefined || !(await presenter.showEditorError(hoverRequestId, error))) {
          vscode.window.showErrorMessage(`PolyLingo: ${errorMessage(error)}`);
        }
      }
    }),
    vscode.commands.registerCommand('polyLingo.explainTerminalSelection', async () => {
      try {
        const text = await readTerminalSelection();
        const result = await loading.run(t('loading.aiTerminal'), () => manager.translateWithAI(requestFor(text, 'terminal', true)));
        await presenter.present(result, text, terminalPresentation());
      } catch (error) {
        vscode.window.showErrorMessage(`PolyLingo: ${errorMessage(error)}`);
      }
    }),
    vscode.commands.registerCommand('polyLingo.translateDocument', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return vscode.window.showErrorMessage(`PolyLingo: ${t('error.noActiveEditor')}`);
      try {
        const translated = await loading.run(t('loading.document'), () => translateDocumentText(manager, editor.document));
        const translatedDocument = await vscode.workspace.openTextDocument({
          content: translated,
          language: editor.document.languageId
        });
        await vscode.window.showTextDocument(translatedDocument, { preview: true, viewColumn: vscode.ViewColumn.Beside });
      } catch (error) {
        vscode.window.showErrorMessage(`PolyLingo: ${errorMessage(error)}`);
      }
    }),
    vscode.commands.registerCommand('polyLingo.translateDocumentInPlace', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return vscode.window.showErrorMessage(`PolyLingo: ${t('error.noActiveEditor')}`);
      try {
        const translated = await loading.run(t('loading.documentInPlace'), () => translateDocumentText(manager, editor.document));
        const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
        await editor.edit((edit) => edit.replace(fullRange, translated));
      } catch (error) {
        vscode.window.showErrorMessage(`PolyLingo: ${errorMessage(error)}`);
      }
    }),
    vscode.commands.registerCommand('polyLingo.copyLastResult', () => presenter.copyLastResult()),
    vscode.commands.registerCommand('polyLingo.replaceLastResult', () => presenter.replaceLastResult()),
    vscode.commands.registerCommand('polyLingo.showLastResultOutput', () => presenter.showLastResultOutput()),
    vscode.commands.registerCommand('polyLingo.selectProvider', async () => {
      const items: Array<vscode.QuickPickItem & { id: string }> = [
        { label: t('provider.auto'), description: t('provider.autoDescription'), id: 'auto' },
        ...manager.listProviders().filter((provider) => isProviderEnabled(provider.id)).map((provider) => ({ label: provider.displayName, description: provider.id, id: provider.id }))
      ];
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: t('provider.current', { provider: getProvider() })
      });
      if (picked) await setGlobalSetting('provider', picked.id);
    }),
    vscode.commands.registerCommand('polyLingo.selectTargetLanguage', async () => {
      const items = COMMON_LANGUAGES.filter(([code]) => code !== 'auto').map(([code, name]) => ({ label: name, description: code, code }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: t('language.currentTarget', { language: getTargetLanguage() })
      });
      if (picked) await setGlobalSetting('targetLanguage', picked.code);
    }),
    vscode.commands.registerCommand('polyLingo.selectInterfaceLanguage', async () => {
      const items = [
        { label: t('uiLanguage.auto'), description: t('uiLanguage.autoDescription'), code: 'auto' },
        { label: t('uiLanguage.zhCN'), description: 'zh-CN', code: 'zh-CN' },
        { label: t('uiLanguage.zhTW'), description: 'zh-TW', code: 'zh-TW' },
        { label: t('uiLanguage.en'), description: 'en', code: 'en' },
        { label: t('uiLanguage.ja'), description: 'ja', code: 'ja' },
        { label: t('uiLanguage.ko'), description: 'ko', code: 'ko' }
      ];
      const current = getSetting('ui.language', 'auto');
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: t('uiLanguage.current', { language: current === 'auto' ? `${current} (${getUiLanguage()})` : current })
      });
      if (picked) {
        await setGlobalSetting('ui.language', picked.code);
        refreshStatus();
      }
    }),
    vscode.commands.registerCommand('polyLingo.manageCredentials', () => SettingsPanel.show(context.extensionUri, String(context.extension.packageJSON.version), secrets, manager, refreshProviderState)),
    vscode.commands.registerCommand('polyLingo.openSettings', () => SettingsPanel.show(context.extensionUri, String(context.extension.packageJSON.version), secrets, manager, refreshProviderState))
  );

  let timer: NodeJS.Timeout | undefined;
  let autoRequestId = 0;
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((event) => {
    if (event.textEditor !== vscode.window.activeTextEditor) return;
    if (timer) clearTimeout(timer);
    const requestId = ++autoRequestId;
    void presenter.clearEditorReady();
    const selection = event.selections[0];
    if (!selection || selection.isEmpty) return;
    const original = event.textEditor.document.getText(selection);
    const text = original.trim();
    if (!text || text.length > getSetting('maxSelectionChars', 12000)) return;
    timer = setTimeout(async () => {
      if (requestId !== autoRequestId) return;
      if (event.textEditor !== vscode.window.activeTextEditor || !event.textEditor.selection.isEqual(selection) || event.textEditor.document.getText(selection) !== original) return;
      if (!getSetting('selection.autoTranslate', false)) {
        try {
          await presenter.showEditorReady(event.textEditor, selection, original);
        } catch {
          // The selection stays available through the command and context menu
          // if VS Code cannot open the hover programmatically.
        }
        return;
      }
      let hoverRequestId: number | undefined;
      try {
        const presentation = editorPresentation();
        if (presentation === 'hover') hoverRequestId = await presenter.showEditorLoading(event.textEditor, selection, original);
        const result = await loading.run(t('loading.autoSelection'), () => manager.translate(requestFor(text, 'selection')));
        if (requestId !== autoRequestId) {
          if (hoverRequestId !== undefined) await presenter.clearEditorLoading(hoverRequestId);
          return;
        }
        if (presentation === 'hover' && hoverRequestId !== undefined) {
          await presenter.showEditor(event.textEditor, selection, result, original, hoverRequestId);
        } else {
          await presenter.present(result, original, presentation as Exclude<ResultPresentation, 'hover'>, aiAvailable ? 'polyLingo.explainSelection' : undefined);
        }
      } catch (error) {
        if (requestId !== autoRequestId) {
          if (hoverRequestId !== undefined) await presenter.clearEditorLoading(hoverRequestId);
          return;
        }
        if (hoverRequestId !== undefined) await presenter.showEditorError(hoverRequestId, error);
        // Automatic translation outside Hover remains quiet.
      }
    }, getSetting('selection.debounceMs', 650));
  }));
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions from the extension context.
}
