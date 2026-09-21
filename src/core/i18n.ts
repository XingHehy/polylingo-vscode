import * as vscode from 'vscode';

export type UiLanguage = 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko';

type MessageKey =
  | 'status.selectProviderTooltip'
  | 'loading.translation'
  | 'loading.selection'
  | 'loading.terminal'
  | 'loading.clipboard'
  | 'loading.document'
  | 'loading.documentInPlace'
  | 'loading.aiSelection'
  | 'loading.aiTerminal'
  | 'loading.autoSelection'
  | 'error.noActiveEditor'
  | 'error.selectTextFirst'
  | 'error.selectionTooLarge'
  | 'error.clipboardEmpty'
  | 'error.proxyNotDetected'
  | 'sidebar.input'
  | 'sidebar.inputPlaceholder'
  | 'sidebar.sourceLanguage'
  | 'sidebar.targetLanguage'
  | 'sidebar.provider'
  | 'sidebar.translate'
  | 'sidebar.translating'
  | 'sidebar.history'
  | 'sidebar.clearHistory'
  | 'sidebar.emptyHistory'
  | 'sidebar.original'
  | 'sidebar.result'
  | 'sidebar.delete'
  | 'sidebar.translationFailed'
  | 'hover.detected'
  | 'hover.copy'
  | 'hover.replace'
  | 'hover.explain'
  | 'hover.output'
  | 'floating.copy'
  | 'floating.copyDetail'
  | 'floating.output'
  | 'floating.outputDetail'
  | 'floating.explain'
  | 'floating.explainDetail'
  | 'floating.translation'
  | 'floating.moreLines'
  | 'floating.moreLinesDetail'
  | 'floating.detectedPlaceholder'
  | 'floating.resultPlaceholder'
  | 'warning.editorInactive'
  | 'warning.documentChanged'
  | 'provider.auto'
  | 'provider.autoDescription'
  | 'provider.current'
  | 'language.currentTarget'
  | 'uiLanguage.current'
  | 'uiLanguage.auto'
  | 'uiLanguage.autoDescription'
  | 'uiLanguage.zhCN'
  | 'uiLanguage.zhTW'
  | 'uiLanguage.en'
  | 'uiLanguage.ja'
  | 'uiLanguage.ko'
  | 'credentials.set'
  | 'credentials.clear'
  | 'credentials.secretStorage'
  | 'credentials.managePlaceholder'
  | 'credentials.cleared'
  | 'credentials.saved'
  | 'credentials.inputPlaceholder';

type Messages = Record<MessageKey, string>;

const en: Messages = {
  'status.selectProviderTooltip': 'PolyLingo: click to select provider',
  'loading.translation': 'Translating…',
  'loading.selection': 'PolyLingo: translating selection…',
  'loading.terminal': 'PolyLingo: translating terminal selection…',
  'loading.clipboard': 'PolyLingo: translating clipboard…',
  'loading.document': 'PolyLingo: translating document…',
  'loading.documentInPlace': 'PolyLingo: translating document in place…',
  'loading.aiSelection': 'PolyLingo: AI translating and explaining…',
  'loading.aiTerminal': 'PolyLingo: AI translating and explaining terminal selection…',
  'loading.autoSelection': 'PolyLingo: translating selection…',
  'error.noActiveEditor': 'No active text editor.',
  'error.selectTextFirst': 'Select some text first.',
  'error.selectionTooLarge': 'Selection is too large ({count} characters). Current limit: {limit}.',
  'error.clipboardEmpty': 'Clipboard is empty.',
  'error.proxyNotDetected': 'No available proxy was detected. Enter a proxy URL.',
  'sidebar.input': 'Translate text',
  'sidebar.inputPlaceholder': 'Enter text to translate…',
  'sidebar.sourceLanguage': 'From',
  'sidebar.targetLanguage': 'To',
  'sidebar.provider': 'Translation engine',
  'sidebar.translate': 'Translate',
  'sidebar.translating': 'Translating…',
  'sidebar.history': 'History',
  'sidebar.clearHistory': 'Clear history',
  'sidebar.emptyHistory': 'No translation history yet.',
  'sidebar.original': 'Original',
  'sidebar.result': 'Translation result',
  'sidebar.delete': 'Delete',
  'sidebar.translationFailed': 'Translation failed',
  'hover.detected': 'detected',
  'hover.copy': 'Copy translation',
  'hover.replace': 'Replace original',
  'hover.explain': 'AI translate & explain',
  'hover.output': 'Output panel',
  'floating.copy': 'Copy translation',
  'floating.copyDetail': 'Copy the full translation to the clipboard',
  'floating.output': 'Show in PolyLingo Output',
  'floating.outputDetail': 'View the full original text and translation in the Output panel',
  'floating.explain': 'AI translate & explain',
  'floating.explainDetail': 'Use the configured AI provider to translate and explain the current terminal selection',
  'floating.translation': 'Translation',
  'floating.moreLines': '{count} more lines…',
  'floating.moreLinesDetail': 'Choose “Show in PolyLingo Output” to view the complete result',
  'floating.detectedPlaceholder': 'Detected {language} · Esc to close',
  'floating.resultPlaceholder': 'Translation result · Esc to close',
  'warning.editorInactive': 'PolyLingo: the original editor is no longer active.',
  'warning.documentChanged': 'PolyLingo: the document changed after translation; translate the selection again before replacing it.',
  'provider.auto': 'Auto',
  'provider.autoDescription': 'Use fallback order',
  'provider.current': 'Current provider: {provider}',
  'language.currentTarget': 'Current target language: {language}',
  'uiLanguage.current': 'Current interface language: {language}',
  'uiLanguage.auto': 'Auto (VS Code language)',
  'uiLanguage.autoDescription': 'Follow the current VS Code display language',
  'uiLanguage.zhCN': '简体中文',
  'uiLanguage.zhTW': '繁體中文',
  'uiLanguage.en': 'English',
  'uiLanguage.ja': '日本語',
  'uiLanguage.ko': '한국어',
  'credentials.set': 'Set {provider}',
  'credentials.clear': 'Clear {provider}',
  'credentials.secretStorage': 'Stored with VS Code SecretStorage',
  'credentials.managePlaceholder': 'Manage translation API credentials',
  'credentials.cleared': '{provider} credentials cleared.',
  'credentials.saved': '{provider} credentials saved securely.',
  'credentials.inputPlaceholder': 'Enter a new value; press Esc to cancel this provider'
};

const zhCN: Messages = {
  'status.selectProviderTooltip': 'PolyLingo：点击选择翻译引擎',
  'loading.translation': '正在翻译…',
  'loading.selection': 'PolyLingo：正在翻译选中内容…',
  'loading.terminal': 'PolyLingo：正在翻译终端选中内容…',
  'loading.clipboard': 'PolyLingo：正在翻译剪贴板内容…',
  'loading.document': 'PolyLingo：正在翻译文档…',
  'loading.documentInPlace': 'PolyLingo：正在翻译并替换当前文档…',
  'loading.aiSelection': 'PolyLingo：AI 正在翻译并解释…',
  'loading.aiTerminal': 'PolyLingo：AI 正在翻译并解释终端选中内容…',
  'loading.autoSelection': 'PolyLingo：正在翻译选中内容…',
  'error.noActiveEditor': '当前没有活动的文本编辑器。',
  'error.selectTextFirst': '请先选中需要翻译的文字。',
  'error.selectionTooLarge': '选中内容过长（{count} 个字符），当前限制为 {limit} 个字符。',
  'error.clipboardEmpty': '剪贴板为空。',
  'error.proxyNotDetected': '未识别到可用代理，请填写代理地址',
  'sidebar.input': '输入翻译',
  'sidebar.inputPlaceholder': '输入需要翻译的文字…',
  'sidebar.sourceLanguage': '源语言',
  'sidebar.targetLanguage': '目标语言',
  'sidebar.provider': '翻译引擎',
  'sidebar.translate': '翻译',
  'sidebar.translating': '正在翻译…',
  'sidebar.history': '历史记录',
  'sidebar.clearHistory': '清空历史',
  'sidebar.emptyHistory': '暂无翻译历史。',
  'sidebar.original': '原文',
  'sidebar.result': '翻译结果',
  'sidebar.delete': '删除',
  'sidebar.translationFailed': '翻译失败',
  'hover.detected': '检测语言',
  'hover.copy': '复制译文',
  'hover.replace': '替换原文',
  'hover.explain': 'AI 翻译并解释',
  'hover.output': '输出面板',
  'floating.copy': '复制译文',
  'floating.copyDetail': '将完整译文复制到剪贴板',
  'floating.output': '在 PolyLingo 输出中查看',
  'floating.outputDetail': '在输出面板查看完整原文和译文',
  'floating.explain': 'AI 翻译并解释',
  'floating.explainDetail': '使用已配置的 AI Provider 翻译并解释当前终端选区',
  'floating.translation': '译文',
  'floating.moreLines': '还有 {count} 行…',
  'floating.moreLinesDetail': '选择“在 PolyLingo 输出中查看”以查看完整结果',
  'floating.detectedPlaceholder': '检测到 {language} · 按 Esc 关闭',
  'floating.resultPlaceholder': '翻译结果 · 按 Esc 关闭',
  'warning.editorInactive': 'PolyLingo：原编辑器已不是当前活动编辑器。',
  'warning.documentChanged': 'PolyLingo：翻译后文档内容发生了变化，请重新翻译选区后再替换。',
  'provider.auto': '自动',
  'provider.autoDescription': '按备用顺序自动选择可用引擎',
  'provider.current': '当前翻译引擎：{provider}',
  'language.currentTarget': '当前目标语言：{language}',
  'uiLanguage.current': '当前界面语言：{language}',
  'uiLanguage.auto': '自动（跟随 VS Code）',
  'uiLanguage.autoDescription': '跟随当前 VS Code 的显示语言',
  'uiLanguage.zhCN': '简体中文',
  'uiLanguage.zhTW': '繁體中文',
  'uiLanguage.en': 'English',
  'uiLanguage.ja': '日本語',
  'uiLanguage.ko': '한국어',
  'credentials.set': '设置 {provider}',
  'credentials.clear': '清除 {provider}',
  'credentials.secretStorage': '使用 VS Code SecretStorage 安全保存',
  'credentials.managePlaceholder': '管理翻译 API 凭据',
  'credentials.cleared': '已清除 {provider} 凭据。',
  'credentials.saved': '已安全保存 {provider} 凭据。',
  'credentials.inputPlaceholder': '输入新值；按 Esc 取消设置当前 Provider'
};

const zhTW: Messages = {
  ...zhCN,
  'status.selectProviderTooltip': 'PolyLingo：點擊選擇翻譯引擎',
  'loading.translation': '正在翻譯…',
  'loading.selection': 'PolyLingo：正在翻譯選取內容…',
  'loading.terminal': 'PolyLingo：正在翻譯終端機選取內容…',
  'loading.clipboard': 'PolyLingo：正在翻譯剪貼簿內容…',
  'loading.document': 'PolyLingo：正在翻譯文件…',
  'loading.documentInPlace': 'PolyLingo：正在翻譯並取代目前文件…',
  'loading.aiSelection': 'PolyLingo：AI 正在翻譯並解釋…',
  'loading.aiTerminal': 'PolyLingo：AI 正在翻譯並解釋終端機選取內容…',
  'error.noActiveEditor': '目前沒有作用中的文字編輯器。',
  'error.selectTextFirst': '請先選取需要翻譯的文字。',
  'error.selectionTooLarge': '選取內容過長（{count} 個字元），目前限制為 {limit} 個字元。',
  'error.clipboardEmpty': '剪貼簿是空的。',
  'error.proxyNotDetected': '未偵測到可用的 Proxy，請填寫 Proxy 位址',
  'sidebar.input': '輸入翻譯',
  'sidebar.inputPlaceholder': '輸入需要翻譯的文字…',
  'sidebar.sourceLanguage': '來源語言',
  'sidebar.targetLanguage': '目標語言',
  'sidebar.provider': '翻譯引擎',
  'sidebar.translate': '翻譯',
  'sidebar.translating': '正在翻譯…',
  'sidebar.history': '歷史記錄',
  'sidebar.clearHistory': '清除歷史',
  'sidebar.emptyHistory': '暫無翻譯歷史。',
  'sidebar.original': '原文',
  'sidebar.result': '翻譯結果',
  'sidebar.delete': '刪除',
  'sidebar.translationFailed': '翻譯失敗',
  'hover.detected': '偵測語言',
  'hover.copy': '複製譯文',
  'hover.replace': '取代原文',
  'hover.explain': 'AI 翻譯並解釋',
  'hover.output': '輸出面板',
  'floating.copy': '複製譯文',
  'floating.copyDetail': '將完整譯文複製到剪貼簿',
  'floating.output': '在 PolyLingo 輸出中檢視',
  'floating.outputDetail': '在輸出面板檢視完整原文與譯文',
  'floating.explain': 'AI 翻譯並解釋',
  'floating.translation': '譯文',
  'floating.resultPlaceholder': '翻譯結果 · 按 Esc 關閉',
  'provider.auto': '自動',
  'provider.autoDescription': '依備援順序自動選擇可用引擎',
  'provider.current': '目前翻譯引擎：{provider}',
  'language.currentTarget': '目前目標語言：{language}',
  'uiLanguage.current': '目前介面語言：{language}',
  'uiLanguage.auto': '自動（跟隨 VS Code）',
  'uiLanguage.autoDescription': '跟隨目前 VS Code 的顯示語言',
  'credentials.set': '設定 {provider}',
  'credentials.clear': '清除 {provider}',
  'credentials.managePlaceholder': '管理翻譯 API 憑證',
  'credentials.cleared': '已清除 {provider} 憑證。',
  'credentials.saved': '已安全儲存 {provider} 憑證。'
};

const ja: Messages = {
  ...en,
  'status.selectProviderTooltip': 'PolyLingo：クリックして翻訳プロバイダーを選択',
  'loading.translation': '翻訳中…',
  'loading.selection': 'PolyLingo：選択範囲を翻訳中…',
  'loading.terminal': 'PolyLingo：ターミナルの選択範囲を翻訳中…',
  'loading.clipboard': 'PolyLingo：クリップボードを翻訳中…',
  'loading.document': 'PolyLingo：ドキュメントを翻訳中…',
  'loading.documentInPlace': 'PolyLingo：ドキュメントを翻訳して置換中…',
  'loading.aiSelection': 'PolyLingo：AI で翻訳・解説中…',
  'loading.aiTerminal': 'PolyLingo：ターミナル選択範囲を AI で翻訳・解説中…',
  'error.noActiveEditor': 'アクティブなテキストエディターがありません。',
  'error.selectTextFirst': '先に翻訳するテキストを選択してください。',
  'error.clipboardEmpty': 'クリップボードが空です。',
  'error.proxyNotDetected': '利用可能なプロキシを検出できませんでした。プロキシ URL を入力してください。',
  'sidebar.input': 'テキストを翻訳',
  'sidebar.inputPlaceholder': '翻訳するテキストを入力…',
  'sidebar.sourceLanguage': '翻訳元',
  'sidebar.targetLanguage': '翻訳先',
  'sidebar.provider': '翻訳エンジン',
  'sidebar.translate': '翻訳',
  'sidebar.translating': '翻訳中…',
  'sidebar.history': '履歴',
  'sidebar.clearHistory': '履歴を消去',
  'sidebar.emptyHistory': '翻訳履歴はありません。',
  'sidebar.original': '原文',
  'sidebar.result': '翻訳結果',
  'sidebar.delete': '削除',
  'sidebar.translationFailed': '翻訳に失敗しました',
  'hover.detected': '検出',
  'hover.copy': '訳文をコピー',
  'hover.replace': '原文を置換',
  'hover.explain': 'AI 翻訳・解説',
  'hover.output': '出力パネル',
  'provider.auto': '自動',
  'provider.autoDescription': 'フォールバック順で利用可能なプロバイダーを使用',
  'provider.current': '現在の翻訳プロバイダー：{provider}',
  'language.currentTarget': '現在の翻訳先言語：{language}',
  'uiLanguage.current': '現在の UI 言語：{language}',
  'uiLanguage.auto': '自動（VS Code に従う）',
  'uiLanguage.autoDescription': '現在の VS Code 表示言語に従います',
  'credentials.managePlaceholder': '翻訳 API 認証情報を管理'
};

const ko: Messages = {
  ...en,
  'status.selectProviderTooltip': 'PolyLingo: 클릭하여 번역 공급자 선택',
  'loading.translation': '번역 중…',
  'loading.selection': 'PolyLingo: 선택 영역 번역 중…',
  'loading.terminal': 'PolyLingo: 터미널 선택 영역 번역 중…',
  'loading.clipboard': 'PolyLingo: 클립보드 번역 중…',
  'loading.document': 'PolyLingo: 문서 번역 중…',
  'loading.documentInPlace': 'PolyLingo: 문서를 번역하고 교체하는 중…',
  'loading.aiSelection': 'PolyLingo: AI 번역 및 설명 중…',
  'loading.aiTerminal': 'PolyLingo: 터미널 선택 영역 AI 번역 및 설명 중…',
  'error.noActiveEditor': '활성 텍스트 편집기가 없습니다.',
  'error.selectTextFirst': '먼저 번역할 텍스트를 선택하세요.',
  'error.clipboardEmpty': '클립보드가 비어 있습니다.',
  'error.proxyNotDetected': '사용 가능한 프록시를 감지하지 못했습니다. 프록시 URL을 입력하세요.',
  'sidebar.input': '텍스트 번역',
  'sidebar.inputPlaceholder': '번역할 텍스트 입력…',
  'sidebar.sourceLanguage': '원본 언어',
  'sidebar.targetLanguage': '대상 언어',
  'sidebar.provider': '번역 엔진',
  'sidebar.translate': '번역',
  'sidebar.translating': '번역 중…',
  'sidebar.history': '기록',
  'sidebar.clearHistory': '기록 지우기',
  'sidebar.emptyHistory': '번역 기록이 없습니다.',
  'sidebar.original': '원문',
  'sidebar.result': '번역 결과',
  'sidebar.delete': '삭제',
  'sidebar.translationFailed': '번역 실패',
  'hover.detected': '감지',
  'hover.copy': '번역 복사',
  'hover.replace': '원문 교체',
  'hover.explain': 'AI 번역 및 설명',
  'hover.output': '출력 패널',
  'provider.auto': '자동',
  'provider.autoDescription': '대체 순서에 따라 사용 가능한 공급자 사용',
  'provider.current': '현재 번역 공급자: {provider}',
  'language.currentTarget': '현재 대상 언어: {language}',
  'uiLanguage.current': '현재 UI 언어: {language}',
  'uiLanguage.auto': '자동(VS Code 언어 따름)',
  'uiLanguage.autoDescription': '현재 VS Code 표시 언어를 따릅니다',
  'credentials.managePlaceholder': '번역 API 자격 증명 관리'
};

const dictionaries: Record<UiLanguage, Messages> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  ko
};

export function normalizeUiLanguage(value: string): UiLanguage {
  const normalized = value.toLowerCase().replace('_', '-');
  if (normalized === 'zh-cn' || normalized === 'zh-hans' || normalized === 'zh') return 'zh-CN';
  if (normalized === 'zh-tw' || normalized === 'zh-hant' || normalized === 'zh-hk') return 'zh-TW';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  return 'en';
}

export function getUiLanguage(): UiLanguage {
  const configured = vscode.workspace.getConfiguration('polyLingo').get<string>('ui.language', 'auto');
  if (configured && configured !== 'auto') return normalizeUiLanguage(configured);
  return normalizeUiLanguage(vscode.env.language || 'en');
}

export function t(key: MessageKey, values?: Record<string, string | number>): string {
  let result = dictionaries[getUiLanguage()][key] || en[key];
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
  }
  return result;
}
