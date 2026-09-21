import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import {
  CONFIG_SECTION,
  getProvider,
  getProviderInstances,
  getSetting,
  isBuiltInInstance,
  resolveProviderProxy,
  saveProviderInstances,
  setGlobalSetting,
  setProviderEnabled
} from '../core/config';
import { DEFAULT_AI_PROMPT } from '../core/aiPrompt';
import { request } from '../core/http';
import { getUiLanguage } from '../core/i18n';
import { TranslationManager } from '../core/manager';
import { withProviderInstance } from '../core/providerScope';
import { Secrets, SecretName } from '../core/secrets';
import { ProviderInstance, ProviderKind } from '../core/types';
import { COMMON_LANGUAGES } from '../utils/language';

interface PanelStrings {
  title: string;
  subtitle: string;
  general: string;
  engines: string;
  dragHint: string;
  dragHandle: string;
  addEngine: string;
  editEngine: string;
  closeEditor: string;
  saveEditor: string;
  name: string;
  deleteEngine: string;
  confirmDelete: string;
  advanced: string;
  interfaceLanguage: string;
  interfaceLanguageHelp: string;
  sourceLanguage: string;
  targetLanguage: string;
  defaultProvider: string;
  defaultProviderHelp: string;
  auto: string;
  autoTranslate: string;
  autoTranslateHelp: string;
  editorPresentation: string;
  terminalPresentation: string;
  presentationHover: string;
  presentationSidebar: string;
  presentationNotification: string;
  presentationEditor: string;
  proxy: string;
  proxyHelp: string;
  proxyEnabled: string;
  proxyEnabledHelp: string;
  providerProxyMode: string;
  providerProxyInherit: string;
  providerProxyEnabled: string;
  providerProxyDisabled: string;
  providerProxyUrl: string;
  providerProxyHelp: string;
  enabled: string;
  disabled: string;
  enableHint: string;
  free: string;
  official: string;
  ai: string;
  selfHosted: string;
  endpoint: string;
  baseUrl: string;
  email: string;
  region: string;
  model: string;
  temperature: string;
  extraHeaders: string;
  advancedSettings: string;
  loadModels: string;
  loadingModels: string;
  modelLoadFailed: string;
  apiKey: string;
  appId: string;
  secretKey: string;
  secretId: string;
  savedSecret: string;
  noSecret: string;
  saveSecret: string;
  clearSecret: string;
  requestTimeout: string;
  maxSelectionChars: string;
  documentChunkChars: string;
  documentMode: string;
  documentModeSmart: string;
  documentModeWhole: string;
  debounceMs: string;
  showOutput: string;
  nativeSettings: string;
  saved: string;
  saving: string;
  error: string;
  enableProviderFirst: string;
  testProvider: string;
  testingProvider: string;
  providerAvailable: string;
  providerUnavailable: string;
  aiPromptTitle: string;
  aiPromptDescription: string;
  aiPromptPlaceholders: string;
  resetPrompt: string;
  feedback: string;
  version: string;
  providerDescriptions: Record<string, string>;
}

const en: PanelStrings = {
  title: 'PolyLingo Settings',
  subtitle: 'A multi-scenario translation tool for developers, covering editor text, documents, terminals, translation services and AI models.',
  general: 'General', engines: 'Translation engines', advanced: 'Advanced',
  dragHint: 'Drag the handle to set priority. Engines at the top are tried first in Auto mode.', dragHandle: 'Drag to reorder',
  addEngine: 'Add engine', editEngine: 'Edit', closeEditor: 'Close', saveEditor: 'Save', name: 'Custom name', deleteEngine: 'Delete', confirmDelete: 'Delete this translation engine? This cannot be undone.',
  interfaceLanguage: 'Interface language', interfaceLanguageHelp: 'Auto follows the current VS Code display language.',
  sourceLanguage: 'Source language', targetLanguage: 'Target language', defaultProvider: 'Default engine',
  defaultProviderHelp: 'Auto tries enabled engines from top to bottom in the list.', auto: 'Auto',
  autoTranslate: 'Translate automatically in selection hover', autoTranslateHelp: 'Off: show a Translate button in the hover. On: start translating automatically.',
  editorPresentation: 'Editor result location', terminalPresentation: 'Terminal result location',
  presentationHover: 'Hover near selection', presentationSidebar: 'PolyLingo sidebar',
  presentationNotification: 'Bottom-right notification', presentationEditor: 'Editor beside current editor',
  proxy: 'Default proxy URL', proxyHelp: 'When enabled, leave empty to use VS Code http.proxy, environment variables, or the operating system proxy.',
  proxyEnabled: 'Enable proxy by default', proxyEnabledHelp: 'Individual engine proxy settings override this default.',
  providerProxyMode: 'Proxy policy', providerProxyInherit: 'Follow default', providerProxyEnabled: 'Enable for this engine', providerProxyDisabled: 'Disable for this engine',
  providerProxyUrl: 'Engine proxy URL', providerProxyHelp: 'Used when this engine enables proxy. Leave empty to use the default, VS Code, environment, or operating system proxy URL.',
  enabled: 'Enabled', disabled: 'Disabled', enableHint: 'Enable this engine to configure it.',
  free: 'Free', official: 'Official API', ai: 'AI', selfHosted: 'Self-hosted', endpoint: 'Endpoint', baseUrl: 'Base URL',
  email: 'Email', region: 'Region', model: 'Model', temperature: 'Temperature', extraHeaders: 'Extra headers (JSON)', advancedSettings: 'Advanced', loadModels: 'Load models', loadingModels: 'Loading models…', modelLoadFailed: 'Unable to load models',
  apiKey: 'API Key', appId: 'AppId', secretKey: 'Secret Key', secretId: 'SecretId', savedSecret: 'Saved securely', noSecret: 'Not set',
  saveSecret: 'Save', clearSecret: 'Clear', requestTimeout: 'Request timeout (ms)', maxSelectionChars: 'Max selected characters',
  documentChunkChars: 'Document chunk size', documentMode: 'Document translation mode', documentModeSmart: 'Smart', documentModeWhole: 'Whole document',
  debounceMs: 'Selection hover delay (ms)', showOutput: 'Also show results in Output channel', nativeSettings: 'Open native VS Code settings',
  saved: 'Saved', saving: 'Saving…', error: 'Unable to save', enableProviderFirst: 'Enable at least one engine before selecting a fixed default engine.',
  testProvider: 'Test', testingProvider: 'Testing…', providerAvailable: 'Available', providerUnavailable: 'Unavailable',
  aiPromptTitle: 'AI translation prompt', aiPromptDescription: 'Prompt for this engine only. Edit it for your translation style.',
  aiPromptPlaceholders: 'Available placeholders: {task}, {targetLanguage}, {sourceLanguage}, {context}', resetPrompt: 'Restore default prompt', feedback: 'Feedback', version: 'Version',
  providerDescriptions: {
    'google-free': 'No-key Google web endpoint. Convenient, but unofficial and may change.',
    'bing-web': 'No-key Bing web translator integration. Experimental and may change.',
    mymemory: 'Public MyMemory translation API. An email is optional for a larger quota.',
    libretranslate: 'Open-source translator. Works especially well with your own LibreTranslate server.',
    deepl: 'DeepL official translation API. Requires your own API key.',
    azure: 'Microsoft Azure Translator official API. Requires key and region.',
    'google-cloud': 'Google Cloud Translation official API. Requires your own API key.',
    baidu: 'Baidu General Translation API. Requires AppId and Secret Key.',
    tencent: 'Tencent Cloud TMT. Requires SecretId and SecretKey.',
    'openai-compatible': 'OpenAI-compatible AI translation. Supports OpenAI, DeepSeek, OpenRouter, LM Studio and similar services.',
    ollama: 'Local AI translation through Ollama/OpenAI-compatible endpoint.'
  }
};

const zhCN: PanelStrings = {
  ...en,
  title: 'PolyLingo 设置',
  subtitle: '面向开发者的多场景翻译工具，支持编辑器、文档、终端、多种翻译服务与 AI 模型。',
  general: '常用设置', engines: '翻译引擎', advanced: '高级设置',
  dragHint: '拖动左侧图标调整优先级；自动模式下越靠前越先尝试。', dragHandle: '拖动调整顺序',
  addEngine: '添加引擎', editEngine: '编辑', closeEditor: '关闭', saveEditor: '保存', name: '自定义名称', deleteEngine: '删除', confirmDelete: '确定删除这个翻译引擎吗？删除后无法恢复。',
  interfaceLanguage: '界面语言', interfaceLanguageHelp: '“自动”会跟随当前 VS Code 显示语言。',
  sourceLanguage: '源语言', targetLanguage: '目标语言', defaultProvider: '默认翻译引擎',
  defaultProviderHelp: '选择“自动”时，会从上到下尝试已启用的翻译引擎。', auto: '自动',
  autoTranslate: '划词浮窗自动翻译', autoTranslateHelp: '关闭时显示“翻译”按钮，点击后才翻译；开启时自动翻译。',
  editorPresentation: '编辑器译文显示位置', terminalPresentation: '终端译文显示位置',
  presentationHover: '选区附近浮窗', presentationSidebar: 'PolyLingo 侧边栏',
  presentationNotification: '右下角通知', presentationEditor: '编辑器分栏',
  proxy: '默认代理地址', proxyHelp: '启用代理后，留空会使用 VS Code http.proxy、系统环境变量或操作系统代理。',
  proxyEnabled: '默认启用代理', proxyEnabledHelp: '每个翻译引擎的代理设置优先于这里的默认值。',
  providerProxyMode: '代理策略', providerProxyInherit: '跟随默认设置', providerProxyEnabled: '为此引擎启用', providerProxyDisabled: '为此引擎禁用',
  providerProxyUrl: '引擎代理地址', providerProxyHelp: '此引擎单独启用代理时使用；留空会使用默认、VS Code、环境变量或操作系统代理地址。',
  enabled: '已启用', disabled: '未启用', enableHint: '勾选启用后才显示这个引擎的配置。',
  free: '免费', official: '官方 API', ai: 'AI', selfHosted: '自托管', endpoint: '接口地址', baseUrl: 'Base URL',
  email: '邮箱', region: '区域', model: '模型', temperature: 'Temperature', extraHeaders: '额外请求头（JSON）', advancedSettings: '高级', loadModels: '获取模型', loadingModels: '正在获取模型…', modelLoadFailed: '获取模型失败',
  apiKey: 'API Key', appId: 'AppId', secretKey: 'Secret Key', secretId: 'SecretId', savedSecret: '已安全保存', noSecret: '未设置',
  saveSecret: '保存', clearSecret: '清除', requestTimeout: '请求超时（毫秒）', maxSelectionChars: '最大划词字符数',
  documentChunkChars: '文档分块字符数', documentMode: '文档翻译模式', documentModeSmart: '智能模式', documentModeWhole: '整篇翻译',
  debounceMs: '划词浮窗延迟（毫秒）', showOutput: '同时在 Output 面板显示结果', nativeSettings: '打开 VS Code 原生设置',
  saved: '已保存', saving: '正在保存…', error: '保存失败', enableProviderFirst: '请先至少启用一个翻译引擎，再选择固定的默认引擎。',
  testProvider: '测试', testingProvider: '测试中…', providerAvailable: '可用', providerUnavailable: '不可用',
  aiPromptTitle: 'AI 翻译 Prompt', aiPromptDescription: '仅用于当前引擎，可按自己的翻译习惯编辑。',
  aiPromptPlaceholders: '可用占位符：{task}、{targetLanguage}、{sourceLanguage}、{context}', resetPrompt: '恢复默认 Prompt', feedback: '反馈邮箱', version: '版本',
  providerDescriptions: {
    'google-free': '免 Key 的 Google 网页翻译接口。方便，但属于非官方接口，可能发生变化。',
    'bing-web': '免 Key 的 Bing 网页翻译。实验性实现，网页变化时可能失效。',
    mymemory: 'MyMemory 公共翻译 API。可选填写邮箱以获得更高额度。',
    libretranslate: '开源翻译服务，适合连接自己的 LibreTranslate 实例。',
    deepl: 'DeepL 官方翻译 API，需要填写自己的 API Key。',
    azure: 'Microsoft Azure Translator 官方 API，需要 Key 和 Region。',
    'google-cloud': 'Google Cloud Translation 官方 API，需要自己的 API Key。',
    baidu: '百度通用翻译 API，需要 AppId 和 Secret Key。',
    tencent: '腾讯云机器翻译 TMT，需要 SecretId 和 SecretKey。',
    'openai-compatible': 'OpenAI Compatible AI 翻译，可连接 OpenAI、DeepSeek、OpenRouter、LM Studio 等兼容服务。',
    ollama: '通过本机 Ollama / OpenAI Compatible 接口进行本地 AI 翻译。'
  }
};

const zhTW: PanelStrings = {
  ...zhCN,
  title: 'PolyLingo 設定', subtitle: '面向開發者的多場景翻譯工具，支援編輯器、文件、終端機、多種翻譯服務與 AI 模型。',
  general: '常用設定', engines: '翻譯引擎', advanced: '進階設定', interfaceLanguage: '介面語言',
  dragHint: '拖曳左側圖示調整優先順序；自動模式會先嘗試前面的引擎。', dragHandle: '拖曳調整順序',
  addEngine: '新增引擎', editEngine: '編輯', closeEditor: '關閉', saveEditor: '儲存', name: '自訂名稱', deleteEngine: '刪除', confirmDelete: '確定刪除這個翻譯引擎嗎？刪除後無法復原。',
  interfaceLanguageHelp: '「自動」會跟隨目前 VS Code 顯示語言。', sourceLanguage: '來源語言', targetLanguage: '目標語言',
  defaultProvider: '預設翻譯引擎', defaultProviderHelp: '選擇「自動」時，會由上而下嘗試已啟用的翻譯引擎。', auto: '自動',
  autoTranslate: '選取浮窗自動翻譯', autoTranslateHelp: '關閉時顯示「翻譯」按鈕；開啟時自動翻譯。', debounceMs: '選取浮窗延遲（毫秒）', proxy: '代理伺服器',
  editorPresentation: '編輯器譯文顯示位置', terminalPresentation: '終端機譯文顯示位置', presentationHover: '選取範圍附近浮窗',
  presentationSidebar: 'PolyLingo 側邊欄', presentationNotification: '右下角通知', presentationEditor: '編輯器分欄',
  proxyHelp: '留空時繼承 VS Code http.proxy 或系統環境變數中的代理。', enabled: '已啟用', disabled: '未啟用',
  enableHint: '勾選啟用後才顯示這個引擎的設定。', advancedSettings: '進階', loadModels: '取得模型', loadingModels: '正在取得模型…', modelLoadFailed: '取得模型失敗', nativeSettings: '開啟 VS Code 原生設定', saved: '已儲存', saving: '儲存中…', error: '儲存失敗', testProvider: '測試', testingProvider: '測試中…', providerAvailable: '可用', providerUnavailable: '不可用', aiPromptTitle: 'AI 翻譯 Prompt', aiPromptDescription: '僅用於目前引擎，可自行編輯。', resetPrompt: '還原預設 Prompt', feedback: '意見回饋', version: '版本'
};

const ja: PanelStrings = {
  ...en,
  title: 'PolyLingo 設定', subtitle: 'エディター、ドキュメント、ターミナル、複数の翻訳サービス、AI モデルに対応した開発者向け翻訳ツールです。',
  general: '基本設定', engines: '翻訳エンジン', advanced: '詳細設定', interfaceLanguage: 'UI 言語',
  dragHint: '左のハンドルをドラッグして優先順位を変更します。自動モードでは上から順に試します。', dragHandle: 'ドラッグして並べ替え',
  addEngine: 'エンジンを追加', editEngine: '編集', closeEditor: '閉じる', saveEditor: '保存', name: 'カスタム名', deleteEngine: '削除', confirmDelete: 'この翻訳エンジンを削除しますか？元に戻せません。',
  interfaceLanguageHelp: '「自動」は VS Code の表示言語に従います。', sourceLanguage: '翻訳元言語', targetLanguage: '翻訳先言語',
  defaultProvider: '既定の翻訳エンジン', defaultProviderHelp: '自動では、有効なエンジンを一覧の上から順に試します。', auto: '自動',
  autoTranslate: '選択時の Hover で自動翻訳', autoTranslateHelp: 'オフでは翻訳ボタンを表示し、オンでは自動翻訳します。', debounceMs: '選択 Hover の遅延（ms）', proxy: 'プロキシ',
  editorPresentation: 'エディター結果の表示場所', terminalPresentation: 'ターミナル結果の表示場所', presentationHover: '選択範囲付近の Hover',
  presentationSidebar: 'PolyLingo サイドバー', presentationNotification: '右下の通知', presentationEditor: 'エディター分割',
  enabled: '有効', disabled: '無効', enableHint: '有効にするとこのエンジンの設定が表示されます。', free: '無料', official: '公式 API', ai: 'AI',
  selfHosted: 'セルフホスト', advancedSettings: '詳細設定', loadModels: 'モデルを取得', loadingModels: 'モデルを取得中…', modelLoadFailed: 'モデルを取得できませんでした', nativeSettings: 'VS Code の標準設定を開く', saved: '保存しました', saving: '保存中…', error: '保存できませんでした', testProvider: 'テスト', testingProvider: 'テスト中…', providerAvailable: '利用可能', providerUnavailable: '利用不可', aiPromptTitle: 'AI 翻訳 Prompt', aiPromptDescription: 'このエンジンだけに適用される Prompt です。', resetPrompt: '既定の Prompt に戻す', feedback: 'フィードバック', version: 'バージョン'
};

const ko: PanelStrings = {
  ...en,
  title: 'PolyLingo 설정', subtitle: '편집기, 문서, 터미널, 다양한 번역 서비스와 AI 모델을 지원하는 개발자용 번역 도구입니다.',
  general: '일반 설정', engines: '번역 엔진', advanced: '고급 설정', interfaceLanguage: '인터페이스 언어',
  dragHint: '왼쪽 핸들을 드래그해 우선순위를 변경합니다. 자동 모드에서는 위에서부터 시도합니다.', dragHandle: '드래그하여 순서 변경',
  addEngine: '엔진 추가', editEngine: '편집', closeEditor: '닫기', saveEditor: '저장', name: '사용자 지정 이름', deleteEngine: '삭제', confirmDelete: '이 번역 엔진을 삭제할까요? 삭제 후 복구할 수 없습니다.',
  interfaceLanguageHelp: '자동은 현재 VS Code 표시 언어를 따릅니다.', sourceLanguage: '원본 언어', targetLanguage: '대상 언어',
  defaultProvider: '기본 번역 엔진', defaultProviderHelp: '자동 모드에서는 활성화된 엔진을 목록 위에서부터 시도합니다.', auto: '자동',
  autoTranslate: '선택 Hover 자동 번역', autoTranslateHelp: '끄면 번역 버튼을 표시하고, 켜면 자동으로 번역합니다.', debounceMs: '선택 Hover 지연 (ms)', proxy: '프록시',
  editorPresentation: '편집기 결과 위치', terminalPresentation: '터미널 결과 위치', presentationHover: '선택 영역 근처 Hover',
  presentationSidebar: 'PolyLingo 사이드바', presentationNotification: '오른쪽 아래 알림', presentationEditor: '편집기 분할',
  enabled: '활성', disabled: '비활성', enableHint: '활성화하면 이 엔진의 설정이 표시됩니다.', free: '무료', official: '공식 API', ai: 'AI',
  selfHosted: '셀프 호스팅', advancedSettings: '고급', loadModels: '모델 가져오기', loadingModels: '모델 가져오는 중…', modelLoadFailed: '모델을 가져오지 못했습니다', nativeSettings: 'VS Code 기본 설정 열기', saved: '저장됨', saving: '저장 중…', error: '저장 실패', testProvider: '테스트', testingProvider: '테스트 중…', providerAvailable: '사용 가능', providerUnavailable: '사용 불가', aiPromptTitle: 'AI 번역 Prompt', aiPromptDescription: '이 엔진에만 적용되는 Prompt입니다.', resetPrompt: '기본 Prompt 복원', feedback: '피드백', version: '버전'
};

function strings(): PanelStrings {
  switch (getUiLanguage()) {
    case 'zh-CN': return zhCN;
    case 'zh-TW': return zhTW;
    case 'ja': return ja;
    case 'ko': return ko;
    default: return en;
  }
}

interface ConfigField {
  key: string;
  label: keyof Pick<PanelStrings, 'endpoint' | 'baseUrl' | 'email' | 'region' | 'model' | 'temperature' | 'extraHeaders'>;
  type?: 'text' | 'number' | 'json';
  placeholder?: string;
}

interface SecretField {
  name: SecretName;
  label: keyof Pick<PanelStrings, 'apiKey' | 'appId' | 'secretKey' | 'secretId'>;
}

interface ProviderDefinition {
  id: ProviderKind;
  name: string;
  category: 'free' | 'official' | 'ai' | 'selfHosted';
  fields: ConfigField[];
  secrets?: SecretField[];
}

const PROVIDERS: ProviderDefinition[] = [
  { id: 'google-free', name: 'Google Free', category: 'free', fields: [{ key: 'googleFree.endpoint', label: 'endpoint', placeholder: 'https://translate.googleapis.com/translate_a/single' }] },
  { id: 'bing-web', name: 'Bing Web', category: 'free', fields: [{ key: 'bingWeb.endpoint', label: 'endpoint', placeholder: 'https://www.bing.com/translator' }] },
  { id: 'mymemory', name: 'MyMemory', category: 'free', fields: [{ key: 'mymemory.email', label: 'email', placeholder: 'name@example.com' }] },
  { id: 'libretranslate', name: 'LibreTranslate', category: 'selfHosted', fields: [{ key: 'libreTranslate.baseUrl', label: 'baseUrl', placeholder: 'http://127.0.0.1:5000' }], secrets: [{ name: 'libreTranslateApiKey', label: 'apiKey' }] },
  { id: 'deepl', name: 'DeepL', category: 'official', fields: [{ key: 'deepl.baseUrl', label: 'baseUrl', placeholder: 'https://api-free.deepl.com/v2' }], secrets: [{ name: 'deepLApiKey', label: 'apiKey' }] },
  { id: 'azure', name: 'Azure Translator', category: 'official', fields: [{ key: 'azure.endpoint', label: 'endpoint', placeholder: 'https://api.cognitive.microsofttranslator.com' }, { key: 'azure.region', label: 'region', placeholder: 'eastus' }], secrets: [{ name: 'azureApiKey', label: 'apiKey' }] },
  { id: 'google-cloud', name: 'Google Cloud Translation', category: 'official', fields: [{ key: 'googleCloud.endpoint', label: 'endpoint', placeholder: 'https://translation.googleapis.com/language/translate/v2' }], secrets: [{ name: 'googleCloudApiKey', label: 'apiKey' }] },
  { id: 'baidu', name: 'Baidu Translate', category: 'official', fields: [{ key: 'baidu.endpoint', label: 'endpoint', placeholder: 'https://fanyi-api.baidu.com/api/trans/vip/translate' }], secrets: [{ name: 'baiduAppId', label: 'appId' }, { name: 'baiduSecret', label: 'secretKey' }] },
  { id: 'tencent', name: 'Tencent Cloud TMT', category: 'official', fields: [{ key: 'tencent.endpoint', label: 'endpoint', placeholder: 'https://tmt.tencentcloudapi.com' }, { key: 'tencent.region', label: 'region', placeholder: 'ap-guangzhou' }], secrets: [{ name: 'tencentSecretId', label: 'secretId' }, { name: 'tencentSecretKey', label: 'secretKey' }] },
  { id: 'openai-compatible', name: 'OpenAI Compatible', category: 'ai', fields: [{ key: 'openAI.baseUrl', label: 'baseUrl', placeholder: 'https://api.openai.com/v1' }, { key: 'openAI.model', label: 'model', placeholder: 'gpt-4.1-mini' }, { key: 'openAI.temperature', label: 'temperature', type: 'number', placeholder: '0.2' }, { key: 'openAI.extraHeaders', label: 'extraHeaders', type: 'json', placeholder: '{\n  "X-Custom-Header": "value"\n}' }], secrets: [{ name: 'openAIApiKey', label: 'apiKey' }] },
  { id: 'ollama', name: 'Ollama', category: 'ai', fields: [{ key: 'ollama.baseUrl', label: 'baseUrl', placeholder: 'http://127.0.0.1:11434/v1' }, { key: 'ollama.model', label: 'model', placeholder: 'qwen2.5:7b' }] }
];
const ADDABLE_PROVIDERS = PROVIDERS.filter((provider) => provider.id !== 'google-free' && provider.id !== 'bing-web');

const SETTING_DEFAULTS: Record<string, unknown> = {
  'ui.language': 'auto', provider: 'auto', sourceLanguage: 'auto', targetLanguage: 'zh-CN', 'proxy.enabled': false, proxy: '', requestTimeoutMs: 15000,
  maxSelectionChars: 12000, 'document.chunkChars': 3500, 'document.mode': 'smart', 'selection.autoTranslate': false,
  'selection.debounceMs': 650, 'result.showOutputChannel': false, 'result.editorPresentation': 'hover', 'result.terminalPresentation': 'sidebar',
  'googleFree.endpoint': 'https://translate.googleapis.com/translate_a/single',
  'bingWeb.endpoint': 'https://www.bing.com/translator', 'mymemory.email': '', 'libreTranslate.baseUrl': 'http://127.0.0.1:5000',
  'deepl.baseUrl': 'https://api-free.deepl.com/v2', 'azure.endpoint': 'https://api.cognitive.microsofttranslator.com', 'azure.region': '',
  'googleCloud.endpoint': 'https://translation.googleapis.com/language/translate/v2', 'baidu.endpoint': 'https://fanyi-api.baidu.com/api/trans/vip/translate',
  'tencent.endpoint': 'https://tmt.tencentcloudapi.com', 'tencent.region': 'ap-guangzhou', 'openAI.baseUrl': 'https://api.openai.com/v1',
  'openAI.model': 'gpt-4.1-mini', 'openAI.temperature': 0.2, 'openAI.extraHeaders': {}, 'ollama.baseUrl': 'http://127.0.0.1:11434/v1',
  'ollama.model': 'qwen2.5:7b'
};

const PROVIDER_SETTING_KEYS = new Set(PROVIDERS.flatMap((provider) => provider.fields.map((field) => field.key)));
const ALLOWED_SETTING_KEYS = new Set(Object.keys(SETTING_DEFAULTS).filter((key) => !PROVIDER_SETTING_KEYS.has(key)));
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i += 1) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function configValue(key: string): unknown {
  const value = getSetting(key, SETTING_DEFAULTS[key]);
  if (key === 'openAI.temperature' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 2)) {
    return SETTING_DEFAULTS[key];
  }
  return value;
}

function fieldHtml(field: ConfigField, instance: ProviderInstance, s: PanelStrings): string {
  const value = instance.settings[field.key] ?? SETTING_DEFAULTS[field.key];
  const label = s[field.label];
  if (field.type === 'json') {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
    return `<label class="field"><span>${escapeHtml(label)}</span><textarea data-instance-setting="${escapeHtml(field.key)}" data-instance-id="${escapeHtml(instance.id)}" data-value-type="json" rows="4" placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(text)}</textarea></label>`;
  }
  const numberLimits = field.key === 'openAI.temperature' ? ' min="0" max="2" step="0.1"' : '';
  const input = `<input data-instance-setting="${escapeHtml(field.key)}" data-instance-id="${escapeHtml(instance.id)}" data-value-type="${field.type === 'number' ? 'number' : 'text'}" type="${field.type === 'number' ? 'number' : 'text'}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}"${numberLimits}>`;
  if (field.key === 'openAI.model') {
    return `<label class="field"><span>${escapeHtml(label)}</span><div class="model-controls">${input}<button type="button" class="secondary model-load" data-load-models="${escapeHtml(instance.id)}" title="${escapeHtml(s.loadModels)}" aria-label="${escapeHtml(s.loadModels)}">⌄</button></div></label>`;
  }
  return `<label class="field"><span>${escapeHtml(label)}</span>${input}</label>`;
}

function secretHtml(field: SecretField, configured: boolean, instance: ProviderInstance, s: PanelStrings): string {
  return `<div class="field secret-field" data-secret-row="${field.name}">
    <span>${escapeHtml(s[field.label])}</span>
    <div class="secret-controls">
      <input type="password" data-secret-input="${field.name}" data-instance-id="${escapeHtml(instance.id)}" autocomplete="new-password" value="${configured ? '********' : ''}">
      <button class="ghost" data-clear-secret="${field.name}" data-instance-id="${escapeHtml(instance.id)}" ${configured ? '' : 'disabled'}>${escapeHtml(s.clearSecret)}</button>
    </div>
    <small data-secret-status="${field.name}" class="${configured ? 'ok' : 'muted'}">${escapeHtml(configured ? s.savedSecret : s.noSecret)}</small>
  </div>`;
}

function providerProxyHtml(instance: ProviderInstance, s: PanelStrings): string {
  const mode = typeof instance.settings['proxy.mode'] === 'string' ? instance.settings['proxy.mode'] : 'inherit';
  const url = typeof instance.settings['proxy.url'] === 'string' ? instance.settings['proxy.url'] : '';
  return `<label class="field"><span>${escapeHtml(s.providerProxyMode)}</span><select data-instance-setting="proxy.mode" data-instance-id="${escapeHtml(instance.id)}" data-value-type="text">
      ${option('inherit', s.providerProxyInherit, mode)}${option('enabled', s.providerProxyEnabled, mode)}${option('disabled', s.providerProxyDisabled, mode)}
    </select><small>${escapeHtml(s.providerProxyHelp)}</small></label>
    <label class="field"><span>${escapeHtml(s.providerProxyUrl)}</span><input data-instance-setting="proxy.url" data-instance-id="${escapeHtml(instance.id)}" data-value-type="text" value="${escapeHtml(url)}" placeholder="http://127.0.0.1:7890"></label>`;
}

function providerCard(def: ProviderDefinition, instance: ProviderInstance, s: PanelStrings): string {
  const enabled = instance.enabled;
  return `<section class="provider-card ${enabled ? 'enabled' : ''}" data-provider-card="${escapeHtml(instance.id)}" data-provider-name="${escapeHtml(def.name)}" data-provider-kind="${escapeHtml(instance.kind)}">
    <button type="button" class="drag-handle" draggable="true" data-drag-provider="${escapeHtml(instance.id)}" aria-label="${escapeHtml(s.dragHandle)}：${escapeHtml(instance.name)}" title="${escapeHtml(s.dragHandle)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" draggable="false"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    <div class="provider-copy">
      <div class="provider-title-row"><strong>${escapeHtml(instance.name)} · ${escapeHtml(def.name)}</strong><span class="tag">${escapeHtml(s[def.category])}</span></div>
    </div>
    <div class="provider-controls">
      <label class="switch-wrap">
        <span data-enabled-label="${escapeHtml(instance.id)}">${escapeHtml(enabled ? s.enabled : s.disabled)}</span>
        <input type="checkbox" data-provider-toggle="${escapeHtml(instance.id)}" ${enabled ? 'checked' : ''}>
        <span class="switch"></span>
      </label>
      <button class="secondary" data-edit-provider="${escapeHtml(instance.id)}">${escapeHtml(s.editEngine)}</button>
      ${isBuiltInInstance(instance.id) ? '' : `<button class="ghost" data-delete-provider="${escapeHtml(instance.id)}">${escapeHtml(s.deleteEngine)}</button>`}
    </div>
  </section>`;
}

function providerEditor(def: ProviderDefinition, instance: ProviderInstance, secretState: Record<string, boolean>, s: PanelStrings): string {
  const advancedKeys = new Set(instance.kind === 'openai-compatible' ? ['openAI.temperature', 'openAI.extraHeaders'] : []);
  const fields = def.fields.filter((field) => !advancedKeys.has(field.key)).map((field) => fieldHtml(field, instance, s)).join('');
  const advancedFields = providerProxyHtml(instance, s) + def.fields.filter((field) => advancedKeys.has(field.key)).map((field) => fieldHtml(field, instance, s)).join('');
  const secrets = (def.secrets || []).map((field) => secretHtml(field, Boolean(secretState[`${instance.id}:${field.name}`]), instance, s)).join('');
  const isAi = instance.kind === 'openai-compatible' || instance.kind === 'ollama';
  const prompt = typeof instance.settings['ai.prompt'] === 'string' ? instance.settings['ai.prompt'] : DEFAULT_AI_PROMPT;
  return `<section class="provider-editor" data-provider-editor="${escapeHtml(instance.id)}" hidden>
    <div class="editor-header"><div><h2 data-editor-title="${escapeHtml(instance.id)}">${escapeHtml(instance.name)} · ${escapeHtml(def.name)}</h2><p>${escapeHtml(s.providerDescriptions[def.id] || '')}</p></div><div class="editor-header-actions"><button data-save-provider="${escapeHtml(instance.id)}">${escapeHtml(s.saveEditor)}</button><button class="ghost" data-close-editor>${escapeHtml(s.closeEditor)}</button></div></div>
    <div class="form-grid"><label class="field"><span>${escapeHtml(s.name)}</span><input data-instance-name="${escapeHtml(instance.id)}" maxlength="80" value="${escapeHtml(instance.name)}"></label>${fields}${secrets}</div>
    <details class="provider-advanced"><summary>${escapeHtml(s.advancedSettings)}</summary><div class="form-grid">${advancedFields}</div></details>
    ${isAi ? `<div class="instance-prompt"><label class="field"><span>${escapeHtml(s.aiPromptTitle)}</span><textarea data-instance-setting="ai.prompt" data-instance-id="${escapeHtml(instance.id)}" rows="11">${escapeHtml(prompt)}</textarea><small>${escapeHtml(s.aiPromptDescription)}<br>${escapeHtml(s.aiPromptPlaceholders)}</small></label><div class="prompt-actions"><button class="ghost" data-reset-instance-prompt="${escapeHtml(instance.id)}">${escapeHtml(s.resetPrompt)}</button></div></div>` : ''}
    <div class="provider-test-row"><button class="secondary" data-test-provider="${escapeHtml(instance.id)}">${escapeHtml(s.testProvider)}</button><span class="test-status muted" data-test-status="${escapeHtml(instance.id)}"></span></div>
  </section>`;
}

function option(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

export class SettingsPanel implements vscode.Disposable {
  private static current: SettingsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private messageQueue: Promise<void> = Promise.resolve();

  static async show(extensionUri: vscode.Uri, version: string, secrets: Secrets, manager: TranslationManager, onStateChanged?: () => Promise<void>): Promise<void> {
    if (SettingsPanel.current) {
      SettingsPanel.current.panel.reveal(vscode.ViewColumn.Active);
      await SettingsPanel.current.render();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'polyLingo.settings',
      'PolyLingo Settings',
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    SettingsPanel.current = new SettingsPanel(panel, extensionUri, version, secrets, manager, onStateChanged);
    await SettingsPanel.current.render();
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly version: string,
    private readonly secrets: Secrets,
    private readonly manager: TranslationManager,
    private readonly onStateChanged?: () => Promise<void>
  ) {
    this.panel = panel;
    void this.extensionUri; // reserved for future bundled webview assets
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage((message) => {
      this.messageQueue = this.messageQueue.then(() => this.onMessage(message));
    }, null, this.disposables);
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION) && SettingsPanel.current === this) {
        this.post({ type: 'externalConfigurationChanged' });
      }
    }, null, this.disposables);
  }

  dispose(): void {
    if (SettingsPanel.current === this) SettingsPanel.current = undefined;
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }

  private post(message: unknown): void {
    void this.panel.webview.postMessage(message);
  }

  private async secretState(): Promise<Record<string, boolean>> {
    const state: Record<string, boolean> = {};
    for (const instance of getProviderInstances()) {
      const def = PROVIDERS.find((provider) => provider.id === instance.kind);
      for (const field of def?.secrets || []) {
        state[`${instance.id}:${field.name}`] = Boolean(await this.secrets.getForInstance(instance.id, field.name));
      }
    }
    return state;
  }

  private async render(): Promise<void> {
    const s = strings();
    this.panel.title = s.title;
    this.panel.webview.html = this.html(await this.secretState(), s);
  }

  private async onMessage(message: any): Promise<void> {
    try {
      if (!message || typeof message.type !== 'string') return;
      if (message.type === 'reorderProviders') {
        const order: unknown = message.order;
        const instances = getProviderInstances();
        if (!Array.isArray(order) || order.length !== instances.length ||
          !order.every((id) => typeof id === 'string') || new Set(order).size !== instances.length) return;
        const byId = new Map(instances.map((instance) => [instance.id, instance]));
        if (!order.every((id) => byId.has(id))) return;
        await saveProviderInstances(order.map((id) => byId.get(id)!));
        await this.onStateChanged?.();
        this.post({ type: 'saved' });
        return;
      }
      if (message.type === 'addProvider') {
        const kind = message.kind as ProviderKind;
        const def = ADDABLE_PROVIDERS.find((provider) => provider.id === kind);
        if (!def) return;
        const instances = getProviderInstances();
        const name = String(message.name || '').trim().slice(0, 80) || def.name;
        instances.push({ id: `${kind}-${randomBytes(6).toString('hex')}`, kind, name, enabled: true, settings: {} });
        await saveProviderInstances(instances);
        await this.onStateChanged?.();
        await this.render();
        return;
      }
      if (message.type === 'removeProvider') {
        const id = String(message.provider || '');
        const instances = getProviderInstances();
        if (isBuiltInInstance(id) || !instances.some((instance) => instance.id === id)) return;
        const s = strings();
        const confirmed = await vscode.window.showWarningMessage(s.confirmDelete, { modal: true }, s.deleteEngine);
        if (confirmed !== s.deleteEngine) return;
        await this.secrets.deleteInstance(id);
        await saveProviderInstances(instances.filter((instance) => instance.id !== id));
        await this.onStateChanged?.();
        await this.render();
        return;
      }
      if (message.type === 'saveProvider') {
        const id = String(message.provider || '');
        const instances = getProviderInstances();
        const instance = instances.find((item) => item.id === id);
        const def = instance && PROVIDERS.find((provider) => provider.id === instance.kind);
        if (!instance || !def) return;
        const name = String(message.name || '').trim().slice(0, 80);
        if (!name) throw new Error('Engine name cannot be empty.');
        instance.name = name;
        const draft = message.settings && typeof message.settings === 'object' ? message.settings as Record<string, unknown> : {};
        for (const field of def.fields) {
          if (!Object.prototype.hasOwnProperty.call(draft, field.key)) continue;
          let value: unknown = draft[field.key];
          if (field.type === 'json') {
            value = typeof value === 'string' && value.trim() ? JSON.parse(value) : {};
            if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Extra headers must be a JSON object.');
          } else if (field.type === 'number') {
            value = Number(value);
            if (!Number.isFinite(value)) throw new Error(`Invalid number for ${field.key}`);
            if (field.key === 'openAI.temperature' && ((value as number) < 0 || (value as number) > 2)) throw new Error('Temperature must be between 0 and 2.');
          } else {
            value = String(value ?? '');
          }
          instance.settings[field.key] = value;
        }
        const proxyMode = String(draft['proxy.mode'] ?? 'inherit');
        if (!['inherit', 'enabled', 'disabled'].includes(proxyMode)) throw new Error('Invalid proxy policy.');
        const proxyUrl = String(draft['proxy.url'] ?? '').trim();
        resolveProviderProxy(instance, { ...instance.settings, 'proxy.mode': proxyMode, 'proxy.url': proxyUrl });
        instance.settings['proxy.mode'] = proxyMode;
        instance.settings['proxy.url'] = proxyUrl;
        if ((instance.kind === 'openai-compatible' || instance.kind === 'ollama') && typeof draft['ai.prompt'] === 'string') {
          instance.settings['ai.prompt'] = draft['ai.prompt'];
        }
        await saveProviderInstances(instances);
        const secretDraft = message.secrets && typeof message.secrets === 'object' ? message.secrets as Record<string, unknown> : {};
        const configuredSecrets: string[] = [];
        for (const field of def.secrets || []) {
          const value = String(secretDraft[field.name] ?? '').trim();
          if (value && value !== '********') await this.secrets.setForInstance(id, field.name, value);
          if (await this.secrets.getForInstance(id, field.name)) configuredSecrets.push(field.name);
        }
        await this.onStateChanged?.();
        this.post({ type: 'providerSaved', provider: id, name: instance.name, configuredSecrets });
        return;
      }
      if (message.type === 'requestProviderModels') {
        const id = String(message.provider || '');
        const instance = getProviderInstances().find((item) => item.id === id);
        if (!instance || instance.kind !== 'openai-compatible') return;
        this.post({ type: 'modelsLoading', provider: id });
        try {
          const draft = message.settings && typeof message.settings === 'object' ? message.settings as Record<string, unknown> : {};
          const baseUrl = String(draft['openAI.baseUrl'] ?? instance.settings['openAI.baseUrl'] ?? SETTING_DEFAULTS['openAI.baseUrl']).trim().replace(/\/+$/, '');
          let extraHeaders: Record<string, string> = {};
          const rawHeaders = draft['openAI.extraHeaders'];
          if (typeof rawHeaders === 'string' && rawHeaders.trim()) {
            const parsed = JSON.parse(rawHeaders);
            if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Extra headers must be a JSON object.');
            extraHeaders = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
          }
          const typedKey = String(message.apiKey || '').trim();
          const apiKey = typedKey && typedKey !== '********' ? typedKey : await this.secrets.getForInstance(id, 'openAIApiKey');
          const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };
          if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
          const modelsUrl = `${baseUrl}/models`;
          const effectiveInstance: ProviderInstance = { ...instance, settings: { ...instance.settings, ...draft } };
          const result = await withProviderInstance(effectiveInstance, () => request<any>(modelsUrl, {
            headers,
            logLabel: `Model discovery · ${instance.name} (${instance.id})`
          }));
          if (result.json === undefined) throw new Error('Expected JSON response but received non-JSON data.');
          const response = result.json;
          const source: any[] = Array.isArray(response?.data) ? response.data : Array.isArray(response?.models) ? response.models : [];
          const models: string[] = [...new Set<string>(source.map((item: any) => typeof item === 'string' ? item : item?.id || item?.name || item?.model).filter((item: unknown): item is string => typeof item === 'string' && Boolean(item.trim())))].sort();
          if (!models.length) throw new Error('The provider returned no models.');
          const picked = await vscode.window.showQuickPick(models, { placeHolder: strings().loadModels });
          this.post({ type: 'modelsLoaded', provider: id, model: picked || '' });
        } catch (error) {
          this.post({ type: 'modelsLoaded', provider: id, error: error instanceof Error ? error.message : String(error) });
        }
        return;
      }
      if (message.type === 'renameProvider' || message.type === 'updateProviderSetting') {
        const id = String(message.provider || '');
        const instances = getProviderInstances();
        const instance = instances.find((item) => item.id === id);
        if (!instance) return;
        if (message.type === 'renameProvider') {
          const name = String(message.name || '').trim().slice(0, 80);
          if (!name) throw new Error('Engine name cannot be empty.');
          instance.name = name;
        } else {
          const key = String(message.key || '');
          const def = PROVIDERS.find((provider) => provider.id === instance.kind);
          const isAiPrompt = key === 'ai.prompt' && (instance.kind === 'openai-compatible' || instance.kind === 'ollama');
          if (!isAiPrompt && !def?.fields.some((field) => field.key === key)) return;
          let value: unknown = message.value;
          if (isAiPrompt && typeof value !== 'string') throw new Error('Invalid AI prompt.');
          if (key === 'openAI.extraHeaders') {
            value = typeof value === 'string' && value.trim() ? JSON.parse(value) : {};
            if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Extra headers must be a JSON object.');
          }
          if (key === 'openAI.temperature') {
            value = Number(value);
            if (!Number.isFinite(value) || (value as number) < 0 || (value as number) > 2) throw new Error('Temperature must be between 0 and 2.');
          }
          instance.settings[key] = value;
        }
        await saveProviderInstances(instances);
        await this.onStateChanged?.();
        this.post({ type: 'saved' });
        if (message.type === 'renameProvider') this.post({ type: 'providerRenamed', provider: id, name: instance.name });
        return;
      }
      if (message.type === 'toggleProvider') {
        const id = String(message.provider || '');
        if (!getProviderInstances().some((instance) => instance.id === id) || typeof message.enabled !== 'boolean') return;
        await setProviderEnabled(id, message.enabled);
        this.post({ type: 'saved', setting: `provider:${id}` });
        await this.onStateChanged?.();
        return;
      }
      if (message.type === 'updateSetting') {
        const key = String(message.key || '');
        if (!ALLOWED_SETTING_KEYS.has(key)) return;
        let value: unknown = message.value;
        if (['requestTimeoutMs', 'maxSelectionChars', 'document.chunkChars', 'selection.debounceMs'].includes(key)) {
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue)) throw new Error(`Invalid number for ${key}`);
          value = numericValue;
        }
        if (['proxy.enabled', 'selection.autoTranslate', 'result.showOutputChannel'].includes(key)) value = Boolean(value);
        if (key === 'result.editorPresentation' && !['hover', 'sidebar', 'notification', 'editor'].includes(String(value))) {
          throw new Error('Invalid editor result location.');
        }
        if (key === 'result.terminalPresentation' && !['sidebar', 'notification', 'editor'].includes(String(value))) {
          throw new Error('Invalid terminal result location.');
        }
        await setGlobalSetting(key, value);
        this.post({ type: 'saved', setting: key });
        if (key === 'ui.language') await this.render();
        await this.onStateChanged?.();
        return;
      }
      if (message.type === 'saveSecret') {
        const id = String(message.provider || '');
        const instance = getProviderInstances().find((item) => item.id === id);
        const name = message.name as SecretName;
        if (!instance || !PROVIDERS.find((provider) => provider.id === instance.kind)?.secrets?.some((field) => field.name === name)) return;
        const value = String(message.value || '').trim();
        if (!value) return;
        await this.secrets.setForInstance(id, name, value);
        this.post({ type: 'secretState', provider: id, name, configured: true });
        await this.onStateChanged?.();
        return;
      }
      if (message.type === 'clearSecret') {
        const id = String(message.provider || '');
        const instance = getProviderInstances().find((item) => item.id === id);
        const name = message.name as SecretName;
        if (!instance || !PROVIDERS.find((provider) => provider.id === instance.kind)?.secrets?.some((field) => field.name === name)) return;
        await this.secrets.deleteForInstance(id, name);
        this.post({ type: 'secretState', provider: id, name, configured: false });
        await this.onStateChanged?.();
        return;
      }
      if (message.type === 'testProvider') {
        const id = String(message.provider || '');
        if (!getProviderInstances().some((instance) => instance.id === id)) return;
        this.post({ type: 'providerTestStarted', provider: id });
        try {
          const result = await this.manager.testProvider(id);
          this.post({ type: 'providerTestResult', provider: id, ok: true, message: result.text.trim().slice(0, 180) });
        } catch (error) {
          this.post({ type: 'providerTestResult', provider: id, ok: false, message: error instanceof Error ? error.message : String(error) });
        }
        return;
      }
      if (message.type === 'openFeedback') {
        await vscode.env.openExternal(vscode.Uri.parse('mailto:xinghehy@qq.com'));
        return;
      }
      if (message.type === 'openGitHub') {
        await vscode.env.openExternal(vscode.Uri.parse('https://github.com/XingHehy/polylingo-vscode'));
        return;
      }
      if (message.type === 'openNativeSettings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_SECTION);
      }
    } catch (error) {
      const editorOperations = new Set(['saveProvider', 'addProvider', 'clearSecret', 'requestProviderModels']);
      this.post({
        type: 'error',
        scope: editorOperations.has(String(message?.type)) ? 'editor' : 'global',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private html(secretState: Record<string, boolean>, s: PanelStrings): string {
    const webview = this.panel.webview;
    const n = nonce();
    const currentProvider = getProvider();
    const instances = getProviderInstances();
    const source = String(configValue('sourceLanguage'));
    const target = String(configValue('targetLanguage'));
    const uiLanguage = String(configValue('ui.language'));
    const languageOptions = COMMON_LANGUAGES.map(([code, name]) => option(code, `${name} · ${code}`, source)).join('');
    const targetOptions = COMMON_LANGUAGES.filter(([code]) => code !== 'auto').map(([code, name]) => option(code, `${name} · ${code}`, target)).join('');
    const providerOptions = [`<option value="auto" ${currentProvider === 'auto' ? 'selected' : ''}>${escapeHtml(s.auto)}</option>`]
      .concat(instances.map((instance) => `<option value="${escapeHtml(instance.id)}" data-provider-option="${escapeHtml(instance.id)}" ${instance.enabled ? '' : 'disabled'} ${currentProvider === instance.id ? 'selected' : ''}>${escapeHtml(instance.name)} · ${escapeHtml(PROVIDERS.find((provider) => provider.id === instance.kind)?.name || instance.kind)}</option>`)).join('');
    const cards = instances.map((instance) => providerCard(PROVIDERS.find((provider) => provider.id === instance.kind)!, instance, s)).join('');
    const editors = instances.map((instance) => providerEditor(PROVIDERS.find((provider) => provider.id === instance.kind)!, instance, secretState, s)).join('');
    const addOptions = ADDABLE_PROVIDERS.map((provider) => option(provider.id, provider.name, '')).join('');
    const uiOptions = [
      ['auto', `${s.auto} (${vscode.env.language})`], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['en', 'English'], ['ja', '日本語'], ['ko', '한국어']
    ].map(([value, label]) => option(value, label, uiLanguage)).join('');

    const autoTranslate = Boolean(configValue('selection.autoTranslate'));
    const proxyEnabled = Boolean(configValue('proxy.enabled'));
    const showOutput = Boolean(configValue('result.showOutputChannel'));
    const docMode = String(configValue('document.mode'));
    const editorPresentation = String(configValue('result.editorPresentation'));
    const terminalPresentation = String(configValue('result.terminalPresentation'));
    const editorPresentationOptions = [
      ['hover', s.presentationHover], ['sidebar', s.presentationSidebar], ['notification', s.presentationNotification], ['editor', s.presentationEditor]
    ].map(([value, label]) => option(value, label, editorPresentation)).join('');
    const terminalPresentationOptions = [
      ['sidebar', s.presentationSidebar], ['notification', s.presentationNotification], ['editor', s.presentationEditor]
    ].map(([value, label]) => option(value, label, terminalPresentation)).join('');
    return `<!DOCTYPE html>
<html lang="${escapeHtml(getUiLanguage())}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${n}';">
<title>${escapeHtml(s.title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 28px 80px; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  .page { max-width: 980px; margin: 0 auto; }
  h1 { margin: 0 0 8px; font-size: 28px; font-weight: 650; }
  h2 { margin: 34px 0 14px; font-size: 18px; font-weight: 650; }
  p { line-height: 1.55; }
  .subtitle { color: var(--vscode-descriptionForeground); max-width: 760px; margin: 0; }
  .section { border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); border-radius: 10px; background: var(--vscode-sideBar-background); overflow: hidden; }
  .general-grid, .advanced-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 18px; padding: 18px; }
  .field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .field > span { font-weight: 550; }
  .field small, .help, .muted { color: var(--vscode-descriptionForeground); }
  input, select, textarea { width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px; padding: 7px 9px; font: inherit; outline: none; }
  input:focus, select:focus, textarea:focus { border-color: var(--vscode-focusBorder); }
  textarea { resize: vertical; min-height: 78px; font-family: var(--vscode-editor-font-family); }
  .check-row { display: flex; gap: 10px; align-items: flex-start; }
  .check-row input { width: auto; margin-top: 2px; }
  .provider-list { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); border-radius: 10px; overflow: hidden; background: var(--vscode-sideBar-background); }
  .engine-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .engine-heading h2 { margin-bottom: 4px; }
  .drag-hint { margin: 0 0 14px; color: var(--vscode-descriptionForeground); font-size: 12px; }
  .instance-prompt { margin-top: 18px; }
  .instance-prompt textarea { min-height: 200px; }
  .provider-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 13px 16px; border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); }
  .provider-card:last-child { border-bottom: 0; }
  .provider-card.dragging { opacity: .45; }
  .provider-card.drop-before { box-shadow: inset 0 3px var(--vscode-focusBorder); }
  .provider-card.drop-after { box-shadow: inset 0 -3px var(--vscode-focusBorder); }
  .drag-handle { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 28px; width: 28px; height: 32px; padding: 0; color: var(--vscode-descriptionForeground); background: transparent; cursor: grab; }
  .drag-handle:hover, .drag-handle:focus { color: var(--vscode-foreground); background: var(--vscode-list-hoverBackground); }
  .drag-handle:active { cursor: grabbing; }
  .provider-card:not(.enabled) .provider-copy { opacity: .66; }
  .provider-copy { min-width: 0; flex: 1; }
  .provider-controls { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .provider-title-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .tag { font-size: 11px; font-weight: 600; color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); border-radius: 10px; padding: 2px 8px; }
  .editor-backdrop[hidden], .editor-drawer[hidden], .provider-editor[hidden], .add-engine-panel[hidden] { display: none !important; }
  .editor-backdrop { position: fixed; inset: 0; z-index: 20; background: rgba(0, 0, 0, .45); }
  .editor-drawer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 21; max-height: min(82vh, 820px); overflow-y: auto; background: var(--vscode-editor-background); border-top: 1px solid var(--vscode-focusBorder); border-radius: 12px 12px 0 0; box-shadow: 0 -10px 35px rgba(0, 0, 0, .2); animation: drawer-in .16s ease-out; }
  .editor-inner { max-width: 980px; margin: 0 auto; padding: 20px 28px 32px; }
  .editor-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .editor-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .editor-header h2 { margin: 0; }
  .editor-header p { margin: 6px 0 0; color: var(--vscode-descriptionForeground); }
  #editor-save-status { min-height: 20px; margin-bottom: 8px; color: var(--vscode-descriptionForeground); }
  #editor-save-status.error { color: var(--vscode-errorForeground); }
  @keyframes drawer-in { from { transform: translateY(18px); opacity: .7; } to { transform: translateY(0); opacity: 1; } }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px 18px; padding-top: 14px; }
  .provider-test-row { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
  .test-status { min-width: 0; overflow-wrap: anywhere; }
  .test-status.ok { color: var(--vscode-testing-iconPassed, #2ea043); }
  .test-status.fail { color: var(--vscode-testing-iconFailed, var(--vscode-errorForeground)); }
  .prompt-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
  .feedback { display: flex; flex-direction: column; gap: 4px; color: var(--vscode-descriptionForeground); }
  .link-button { color: var(--vscode-textLink-foreground); background: transparent; padding: 0; border: 0; text-decoration: none; }
  .link-button:hover { color: var(--vscode-textLink-activeForeground); background: transparent; text-decoration: underline; }
  .secret-field { grid-column: 1 / -1; }
  .secret-controls { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  .model-controls { display: grid; grid-template-columns: 1fr 34px; gap: 6px; }
  .model-load { padding: 4px; font-size: 18px; line-height: 1; }
  .provider-advanced { margin-top: 18px; border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); border-radius: 6px; }
  .provider-advanced summary { cursor: pointer; padding: 11px 13px; font-weight: 600; user-select: none; }
  .provider-advanced[open] summary { border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); }
  .provider-advanced .form-grid { padding: 14px; }
  .ok { color: var(--vscode-testing-iconPassed, #2ea043); }
  button { border: 1px solid transparent; border-radius: 4px; padding: 6px 12px; font: inherit; cursor: pointer; color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
  button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.ghost { color: var(--vscode-foreground); background: transparent; border-color: var(--vscode-button-border, var(--vscode-widget-border)); }
  button:disabled { opacity: .45; cursor: default; }
  .switch-wrap { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; white-space: nowrap; }
  .switch-wrap input { position: absolute; opacity: 0; pointer-events: none; }
  .switch { width: 34px; height: 18px; border-radius: 10px; background: var(--vscode-input-background); border: 1px solid var(--vscode-widget-border); position: relative; transition: .15s; }
  .switch::after { content: ''; position: absolute; width: 12px; height: 12px; border-radius: 50%; left: 2px; top: 2px; background: var(--vscode-descriptionForeground); transition: .15s; }
  .switch-wrap input:checked + .switch { background: var(--vscode-button-background); border-color: var(--vscode-button-background); }
  .switch-wrap input:checked + .switch::after { transform: translateX(16px); background: var(--vscode-button-foreground); }
  details.section summary { cursor: pointer; padding: 16px 18px; font-weight: 600; user-select: none; }
  details.section[open] summary { border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); }
  .footer { margin-top: 22px; display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; }
  .footer-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .footer-version { color: var(--vscode-descriptionForeground); font-size: 12px; }
  #save-status { min-height: 20px; color: var(--vscode-descriptionForeground); }
  #save-status.error { color: var(--vscode-errorForeground); }
  @media (max-width: 720px) { .general-grid, .advanced-grid, .form-grid { grid-template-columns: 1fr; } .provider-card { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px 12px; } .provider-controls { grid-column: 2; width: 100%; justify-content: flex-end; flex-wrap: wrap; } .secret-controls { grid-template-columns: 1fr; } .secret-field { grid-column: auto; } }
</style>
</head>
<body>
<div class="page">
  <h1>${escapeHtml(s.title)}</h1>
  <p class="subtitle">${escapeHtml(s.subtitle)}</p>

  <h2>${escapeHtml(s.general)}</h2>
  <section class="section">
    <div class="general-grid">
      <label class="field"><span>${escapeHtml(s.interfaceLanguage)}</span><select data-setting="ui.language" data-value-type="text">${uiOptions}</select><small>${escapeHtml(s.interfaceLanguageHelp)}</small></label>
      <label class="field"><span>${escapeHtml(s.defaultProvider)}</span><select id="provider-select" data-setting="provider" data-value-type="text">${providerOptions}</select><small>${escapeHtml(s.defaultProviderHelp)}</small></label>
      <label class="field"><span>${escapeHtml(s.sourceLanguage)}</span><select data-setting="sourceLanguage" data-value-type="text">${languageOptions}</select></label>
      <label class="field"><span>${escapeHtml(s.targetLanguage)}</span><select data-setting="targetLanguage" data-value-type="text">${targetOptions}</select></label>
      <label class="field"><span>${escapeHtml(s.autoTranslate)}</span><span class="check-row"><input type="checkbox" data-setting="selection.autoTranslate" data-value-type="boolean" ${autoTranslate ? 'checked' : ''}><span class="help">${escapeHtml(s.autoTranslateHelp)}</span></span></label>
      <label class="field"><span>${escapeHtml(s.editorPresentation)}</span><select data-setting="result.editorPresentation" data-value-type="text">${editorPresentationOptions}</select></label>
      <label class="field"><span>${escapeHtml(s.terminalPresentation)}</span><select data-setting="result.terminalPresentation" data-value-type="text">${terminalPresentationOptions}</select></label>
    </div>
  </section>

  <div class="engine-heading"><div><h2>${escapeHtml(s.engines)}</h2><p class="drag-hint">${escapeHtml(s.dragHint)}</p></div><button id="add-engine">${escapeHtml(s.addEngine)}</button></div>
  <div class="provider-list" id="provider-list">${cards}</div>

  <h2>${escapeHtml(s.advanced)}</h2>
  <details class="section">
    <summary>${escapeHtml(s.advanced)}</summary>
    <div class="advanced-grid">
      <label class="field"><span>${escapeHtml(s.proxyEnabled)}</span><span class="check-row"><input type="checkbox" data-setting="proxy.enabled" data-value-type="boolean" ${proxyEnabled ? 'checked' : ''}><span class="help">${escapeHtml(s.proxyEnabledHelp)}</span></span></label>
      <label class="field"><span>${escapeHtml(s.proxy)}</span><input type="text" data-setting="proxy" data-value-type="text" value="${escapeHtml(configValue('proxy'))}" placeholder="http://127.0.0.1:7890"><small>${escapeHtml(s.proxyHelp)}</small></label>
      <label class="field"><span>${escapeHtml(s.requestTimeout)}</span><input type="number" min="1000" max="120000" data-setting="requestTimeoutMs" data-value-type="number" value="${escapeHtml(configValue('requestTimeoutMs'))}"></label>
      <label class="field"><span>${escapeHtml(s.maxSelectionChars)}</span><input type="number" min="100" max="100000" data-setting="maxSelectionChars" data-value-type="number" value="${escapeHtml(configValue('maxSelectionChars'))}"></label>
      <label class="field"><span>${escapeHtml(s.documentChunkChars)}</span><input type="number" min="500" max="20000" data-setting="document.chunkChars" data-value-type="number" value="${escapeHtml(configValue('document.chunkChars'))}"></label>
      <label class="field"><span>${escapeHtml(s.documentMode)}</span><select data-setting="document.mode" data-value-type="text"><option value="smart" ${docMode === 'smart' ? 'selected' : ''}>${escapeHtml(s.documentModeSmart)}</option><option value="whole" ${docMode === 'whole' ? 'selected' : ''}>${escapeHtml(s.documentModeWhole)}</option></select></label>
      <label class="field"><span>${escapeHtml(s.debounceMs)}</span><input type="number" min="150" max="5000" data-setting="selection.debounceMs" data-value-type="number" value="${escapeHtml(configValue('selection.debounceMs'))}"></label>
      <label class="field"><span>${escapeHtml(s.showOutput)}</span><span class="check-row"><input type="checkbox" data-setting="result.showOutputChannel" data-value-type="boolean" ${showOutput ? 'checked' : ''}></span></label>
    </div>
  </details>

  <div class="footer"><div class="footer-info"><div id="save-status"></div><div class="feedback"><div>${escapeHtml(s.feedback)}：<button class="link-button" id="feedback-email">xinghehy@qq.com</button></div><div>GitHub：<button class="link-button" id="github-link">XingHehy/polylingo-vscode</button></div></div><div class="footer-version">PolyLingo ${escapeHtml(s.version)} ${escapeHtml(this.version)}</div></div><button class="ghost" id="open-native">${escapeHtml(s.nativeSettings)}</button></div>
</div>
<div class="editor-backdrop" id="editor-backdrop" hidden></div>
<div class="editor-drawer" id="editor-drawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(s.editEngine)}" hidden><div class="editor-inner"><div id="editor-save-status"></div>
  <section class="add-engine-panel" id="add-engine-panel" hidden>
    <div class="editor-header"><h2>${escapeHtml(s.addEngine)}</h2><button class="ghost" data-close-editor>${escapeHtml(s.closeEditor)}</button></div>
    <div class="form-grid"><label class="field"><span>${escapeHtml(s.engines)}</span><select id="add-engine-kind">${addOptions}</select></label><label class="field"><span>${escapeHtml(s.name)}</span><input id="add-engine-name" maxlength="80" placeholder="${escapeHtml(ADDABLE_PROVIDERS[0].name)}"></label></div>
    <div class="provider-test-row"><button id="confirm-add-engine">${escapeHtml(s.addEngine)}</button></div>
  </section>${editors}</div></div>
<script nonce="${n}">
(() => {
  const vscode = acquireVsCodeApi();
  const strings = ${JSON.stringify({ enabled: s.enabled, disabled: s.disabled, saved: s.saved, saving: s.saving, error: s.error, savedSecret: s.savedSecret, noSecret: s.noSecret, testProvider: s.testProvider, testingProvider: s.testingProvider, providerAvailable: s.providerAvailable, providerUnavailable: s.providerUnavailable, addEngine: s.addEngine, editEngine: s.editEngine, confirmDelete: s.confirmDelete, loadModels: s.loadModels, loadingModels: s.loadingModels, modelLoadFailed: s.modelLoadFailed })};
  const status = document.getElementById('save-status');
  const editorStatus = document.getElementById('editor-save-status');
  const drawer = document.getElementById('editor-drawer');
  const backdrop = document.getElementById('editor-backdrop');
  const providerList = document.getElementById('provider-list');
  let draggedProvider;
  function providerOrder() {
    return Array.from(providerList.querySelectorAll('[data-provider-card]')).map((card) => card.dataset.providerCard);
  }
  function clearDragState() {
    providerList.querySelectorAll('.dragging, .drop-before, .drop-after').forEach((card) => card.classList.remove('dragging', 'drop-before', 'drop-after'));
    draggedProvider = undefined;
  }
  function saveProviderOrder(previousOrder) {
    const order = providerOrder();
    if (order.every((id, index) => id === previousOrder[index])) return;
    showGlobalStatus(strings.saving);
    vscode.postMessage({ type: 'reorderProviders', order });
  }
  providerList.querySelectorAll('[data-drag-provider]').forEach((handle) => {
    handle.addEventListener('dragstart', (event) => {
      draggedProvider = handle.dataset.dragProvider;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedProvider);
      handle.closest('[data-provider-card]').classList.add('dragging');
    });
    handle.addEventListener('dragend', clearDragState);
    handle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const card = handle.closest('[data-provider-card]');
      const other = event.key === 'ArrowUp' ? card.previousElementSibling : card.nextElementSibling;
      if (!other) return;
      event.preventDefault();
      const previousOrder = providerOrder();
      if (event.key === 'ArrowUp') providerList.insertBefore(card, other);
      else providerList.insertBefore(other, card);
      saveProviderOrder(previousOrder);
    });
  });
  providerList.addEventListener('dragover', (event) => {
    if (!draggedProvider) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('[data-provider-card]');
    providerList.querySelectorAll('.drop-before, .drop-after').forEach((card) => card.classList.remove('drop-before', 'drop-after'));
    if (!target || target.dataset.providerCard === draggedProvider) return;
    target.classList.add(event.clientY < target.getBoundingClientRect().top + target.offsetHeight / 2 ? 'drop-before' : 'drop-after');
  });
  providerList.addEventListener('drop', (event) => {
    if (!draggedProvider) return;
    event.preventDefault();
    const source = providerList.querySelector('[data-provider-card="' + draggedProvider + '"]');
    const target = event.target.closest('[data-provider-card]');
    const previousOrder = providerOrder();
    if (source && target && source !== target) {
      const before = event.clientY < target.getBoundingClientRect().top + target.offsetHeight / 2;
      providerList.insertBefore(source, before ? target : target.nextElementSibling);
    } else if (source && !target) {
      providerList.appendChild(source);
    }
    clearDragState();
    saveProviderOrder(previousOrder);
  });
  const previousState = vscode.getState() || {};
  let drawerTrigger;
  requestAnimationFrame(() => window.scrollTo(0, previousState.scrollY || 0));
  window.addEventListener('scroll', () => vscode.setState({ scrollY: window.scrollY }));
  let globalStatusTimer, editorStatusTimer;
  function setStatus(element, text, isError, editor) {
    clearTimeout(editor ? editorStatusTimer : globalStatusTimer);
    element.textContent = text;
    element.classList.toggle('error', isError);
    if (!isError) {
      const next = setTimeout(() => { element.textContent = ''; }, 1400);
      if (editor) editorStatusTimer = next; else globalStatusTimer = next;
    }
  }
  const showGlobalStatus = (text, isError = false) => setStatus(status, text, isError, false);
  const showEditorStatus = (text, isError = false) => setStatus(editorStatus, text, isError, true);
  function closeEditor() {
    clearTimeout(editorStatusTimer);
    editorStatus.textContent = '';
    editorStatus.classList.remove('error');
    drawer.hidden = true;
    backdrop.hidden = true;
    document.body.style.overflow = '';
    document.getElementById('add-engine-panel').hidden = true;
    document.querySelectorAll('[data-provider-editor]').forEach((editor) => { editor.hidden = true; });
    drawerTrigger?.focus();
  }
  function showDrawer(panel, trigger) {
    drawerTrigger = trigger;
    document.getElementById('add-engine-panel').hidden = panel.id !== 'add-engine-panel';
    document.querySelectorAll('[data-provider-editor]').forEach((item) => { item.hidden = item !== panel; });
    editorStatus.textContent = '';
    drawer.hidden = false;
    drawer.setAttribute('aria-label', panel.id === 'add-engine-panel' ? strings.addEngine : strings.editEngine);
    backdrop.hidden = false;
    drawer.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    (panel.querySelector('select, [data-instance-name]') || panel.querySelector('[data-close-editor]')).focus();
  }
  document.querySelectorAll('[data-edit-provider]').forEach((button) => {
    button.addEventListener('click', () => {
      const editor = document.querySelector('[data-provider-editor="' + button.dataset.editProvider + '"]');
      if (!editor) return;
      showDrawer(editor, button);
    });
  });
  document.querySelectorAll('[data-close-editor]').forEach((button) => button.addEventListener('click', closeEditor));
  backdrop.addEventListener('click', closeEditor);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !drawer.hidden) closeEditor(); });
  function valueFor(el) {
    const type = el.dataset.valueType || 'text';
    if (type === 'boolean') return !!el.checked;
    if (type === 'number') return Number(el.value);
    return el.value;
  }
  document.querySelectorAll('[data-setting]').forEach((el) => {
    el.addEventListener('change', () => {
      showGlobalStatus(strings.saving);
      vscode.postMessage({ type: 'updateSetting', key: el.dataset.setting, value: valueFor(el) });
    });
  });
  function editorDraft(editor) {
    const settings = {};
    const secrets = {};
    editor.querySelectorAll('[data-instance-setting]').forEach((el) => { settings[el.dataset.instanceSetting] = valueFor(el); });
    editor.querySelectorAll('[data-secret-input]').forEach((el) => { secrets[el.dataset.secretInput] = el.value; });
    return { settings, secrets };
  }
  document.querySelectorAll('[data-save-provider]').forEach((button) => {
    button.addEventListener('click', () => {
      const editor = button.closest('[data-provider-editor]');
      const name = editor && editor.querySelector('[data-instance-name]');
      if (!editor || !name) return;
      const draft = editorDraft(editor);
      button.disabled = true;
      showEditorStatus(strings.saving);
      vscode.postMessage({ type: 'saveProvider', provider: button.dataset.saveProvider, name: name.value, settings: draft.settings, secrets: draft.secrets });
    });
  });
  document.getElementById('add-engine').addEventListener('click', () => {
    showDrawer(document.getElementById('add-engine-panel'), document.getElementById('add-engine'));
  });
  document.getElementById('add-engine-kind').addEventListener('change', (event) => {
    const selected = event.target.selectedOptions[0];
    document.getElementById('add-engine-name').placeholder = selected ? selected.textContent : '';
  });
  document.getElementById('confirm-add-engine').addEventListener('click', () => {
    showEditorStatus(strings.saving);
    vscode.postMessage({ type: 'addProvider', kind: document.getElementById('add-engine-kind').value, name: document.getElementById('add-engine-name').value });
  });
  document.querySelectorAll('[data-delete-provider]').forEach((button) => {
    button.addEventListener('click', () => {
      vscode.postMessage({ type: 'removeProvider', provider: button.dataset.deleteProvider });
    });
  });
  document.querySelectorAll('[data-provider-toggle]').forEach((el) => {
    el.addEventListener('change', () => {
      const id = el.dataset.providerToggle;
      const enabled = !!el.checked;
      const card = document.querySelector('[data-provider-card="' + id + '"]');
      const label = document.querySelector('[data-enabled-label="' + id + '"]');
      if (card) card.classList.toggle('enabled', enabled);
      if (label) label.textContent = enabled ? strings.enabled : strings.disabled;
      const option = document.querySelector('[data-provider-option="' + id + '"]');
      if (option) option.disabled = !enabled;
      const providerSelect = document.getElementById('provider-select');
      if (!enabled && providerSelect && providerSelect.value === id) {
        providerSelect.value = 'auto';
      }
      showGlobalStatus(strings.saving);
      vscode.postMessage({ type: 'toggleProvider', provider: id, enabled });
    });
  });
  document.querySelectorAll('[data-test-provider]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.testProvider;
      const statusEl = document.querySelector('[data-test-status="' + id + '"]');
      button.disabled = true;
      button.textContent = strings.testingProvider;
      if (statusEl) { statusEl.textContent = strings.testingProvider; statusEl.className = 'test-status muted'; }
      vscode.postMessage({ type: 'testProvider', provider: id });
    });
  });
  document.querySelectorAll('[data-load-models]').forEach((button) => {
    button.addEventListener('click', () => {
      const editor = button.closest('[data-provider-editor]');
      if (!editor) return;
      const draft = editorDraft(editor);
      const apiKey = editor.querySelector('[data-secret-input="openAIApiKey"]');
      button.disabled = true;
      button.textContent = '…';
      showEditorStatus(strings.loadingModels);
      vscode.postMessage({ type: 'requestProviderModels', provider: button.dataset.loadModels, settings: draft.settings, apiKey: apiKey ? apiKey.value : '' });
    });
  });
  document.querySelectorAll('[data-secret-input]').forEach((input) => {
    input.addEventListener('focus', () => { if (input.value === '********') input.select(); });
  });
  document.querySelectorAll('[data-clear-secret]').forEach((button) => {
    button.addEventListener('click', () => {
      showEditorStatus(strings.saving);
      vscode.postMessage({ type: 'clearSecret', provider: button.dataset.instanceId, name: button.dataset.clearSecret });
    });
  });
  document.querySelectorAll('[data-reset-instance-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      const editor = button.closest('[data-provider-editor]');
      const textarea = editor && editor.querySelector('[data-instance-setting="ai.prompt"]');
      if (!textarea) return;
      textarea.value = ${JSON.stringify(DEFAULT_AI_PROMPT)};
    });
  });
  document.getElementById('feedback-email').addEventListener('click', () => vscode.postMessage({ type: 'openFeedback' }));
  document.getElementById('github-link').addEventListener('click', () => vscode.postMessage({ type: 'openGitHub' }));
  document.getElementById('open-native').addEventListener('click', () => vscode.postMessage({ type: 'openNativeSettings' }));
  window.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type === 'saved') showGlobalStatus(strings.saved);
    if (message.type === 'error') {
      document.querySelectorAll('[data-save-provider], [data-load-models]').forEach((button) => { button.disabled = false; });
      document.querySelectorAll('[data-load-models]').forEach((button) => { button.textContent = '⌄'; });
      const display = message.scope === 'editor' ? showEditorStatus : showGlobalStatus;
      display(strings.error + ': ' + message.message, true);
    }
    if (message.type === 'providerSaved') {
      const editor = document.querySelector('[data-provider-editor="' + message.provider + '"]');
      const save = editor && editor.querySelector('[data-save-provider]');
      if (save) save.disabled = false;
      const card = document.querySelector('[data-provider-card="' + message.provider + '"]');
      const title = card && card.querySelector('.provider-title-row strong');
      const option = document.querySelector('[data-provider-option="' + message.provider + '"]');
      const providerName = card && card.dataset.providerName;
      const editorTitle = editor && editor.querySelector('[data-editor-title]');
      if (title && providerName) title.textContent = message.name + ' · ' + providerName;
      if (option && providerName) option.textContent = message.name + ' · ' + providerName;
      if (editorTitle && providerName) editorTitle.textContent = message.name + ' · ' + providerName;
      (message.configuredSecrets || []).forEach((name) => {
        const input = editor && editor.querySelector('[data-secret-input="' + name + '"]');
        const statusEl = editor && editor.querySelector('[data-secret-status="' + name + '"]');
        const clear = editor && editor.querySelector('[data-clear-secret="' + name + '"]');
        if (input) input.value = '********';
        if (statusEl) { statusEl.textContent = strings.savedSecret; statusEl.className = 'ok'; }
        if (clear) clear.disabled = false;
      });
      showEditorStatus(strings.saved);
    }
    if (message.type === 'modelsLoading') showEditorStatus(strings.loadingModels);
    if (message.type === 'modelsLoaded') {
      const editor = document.querySelector('[data-provider-editor="' + message.provider + '"]');
      const button = editor && editor.querySelector('[data-load-models]');
      if (button) { button.disabled = false; button.textContent = '⌄'; }
      if (message.model) {
        const input = editor && editor.querySelector('[data-instance-setting="openAI.model"]');
        if (input) input.value = message.model;
        showEditorStatus('');
      } else if (message.error) showEditorStatus(strings.modelLoadFailed + ': ' + message.error, true);
      else showEditorStatus('');
    }
    if (message.type === 'providerTestStarted') {
      const button = document.querySelector('[data-test-provider="' + message.provider + '"]');
      const statusEl = document.querySelector('[data-test-status="' + message.provider + '"]');
      if (button) { button.disabled = true; button.textContent = strings.testingProvider; }
      if (statusEl) { statusEl.textContent = strings.testingProvider; statusEl.className = 'test-status muted'; }
    }
    if (message.type === 'providerTestResult') {
      const button = document.querySelector('[data-test-provider="' + message.provider + '"]');
      const statusEl = document.querySelector('[data-test-status="' + message.provider + '"]');
      if (button) { button.disabled = false; button.textContent = strings.testProvider; }
      if (statusEl) {
        statusEl.textContent = (message.ok ? strings.providerAvailable : strings.providerUnavailable) + (message.message ? ' · ' + message.message : '');
        statusEl.className = 'test-status ' + (message.ok ? 'ok' : 'fail');
      }
    }
    if (message.type === 'secretState') {
      const editor = document.querySelector('[data-provider-editor="' + message.provider + '"]');
      const statusEl = editor && editor.querySelector('[data-secret-status="' + message.name + '"]');
      const clear = editor && editor.querySelector('[data-clear-secret="' + message.name + '"]');
      const input = editor && editor.querySelector('[data-secret-input="' + message.name + '"]');
      if (statusEl) {
        statusEl.textContent = message.configured ? strings.savedSecret : strings.noSecret;
        statusEl.classList.toggle('ok', !!message.configured);
        statusEl.classList.toggle('muted', !message.configured);
      }
      if (clear) clear.disabled = !message.configured;
      if (input) input.value = message.configured ? '********' : '';
      showEditorStatus(strings.saved);
    }
    if (message.type === 'providerRenamed') {
      const card = document.querySelector('[data-provider-card="' + message.provider + '"]');
      const title = card && card.querySelector('.provider-title-row strong');
      const option = document.querySelector('[data-provider-option="' + message.provider + '"]');
      const providerName = card && card.dataset.providerName;
      const editorTitle = document.querySelector('[data-editor-title="' + message.provider + '"]');
      if (title && providerName) title.textContent = message.name + ' · ' + providerName;
      if (option && providerName) option.textContent = message.name + ' · ' + providerName;
      if (editorTitle && providerName) editorTitle.textContent = message.name + ' · ' + providerName;
    }
    if (message.type === 'externalConfigurationChanged') {
      // Keep the panel stable while the user is typing. Values changed through
      // this panel are already reflected locally; reopen to refresh external edits.
    }
  });
})();
</script>
</body>
</html>`;
  }
}
