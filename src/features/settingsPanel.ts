import * as vscode from 'vscode';
import {
  ALL_PROVIDER_IDS,
  CONFIG_SECTION,
  getProvider,
  getSetting,
  isProviderEnabled,
  setGlobalSetting,
  setProviderEnabled
} from '../core/config';
import { DEFAULT_AI_PROMPT } from '../core/aiPrompt';
import { getUiLanguage } from '../core/i18n';
import { TranslationManager } from '../core/manager';
import { Secrets, SecretName } from '../core/secrets';
import { ProviderId } from '../core/types';
import { COMMON_LANGUAGES } from '../utils/language';

interface PanelStrings {
  title: string;
  subtitle: string;
  general: string;
  engines: string;
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
  providerDescriptions: Record<string, string>;
}

const en: PanelStrings = {
  title: 'PolyLingo Settings',
  subtitle: 'A multi-scenario translation tool for developers, covering editor text, documents, terminals, translation services and AI models.',
  general: 'General', engines: 'Translation engines', advanced: 'Advanced',
  interfaceLanguage: 'Interface language', interfaceLanguageHelp: 'Auto follows the current VS Code display language.',
  sourceLanguage: 'Source language', targetLanguage: 'Target language', defaultProvider: 'Default engine',
  defaultProviderHelp: 'Auto tries enabled engines in the configured fallback order.', auto: 'Auto',
  autoTranslate: 'Translate selected text automatically', autoTranslateHelp: 'Translate after the selection stops changing.',
  editorPresentation: 'Editor result location', terminalPresentation: 'Terminal result location',
  presentationHover: 'Hover near selection', presentationSidebar: 'PolyLingo sidebar',
  presentationNotification: 'Bottom-right notification', presentationEditor: 'Editor beside current editor',
  proxy: 'Proxy', proxyHelp: 'Leave empty to inherit VS Code http.proxy or environment proxy variables.',
  enabled: 'Enabled', disabled: 'Disabled', enableHint: 'Enable this engine to configure it.',
  free: 'Free', official: 'Official API', ai: 'AI', selfHosted: 'Self-hosted', endpoint: 'Endpoint', baseUrl: 'Base URL',
  email: 'Email', region: 'Region', model: 'Model', temperature: 'Temperature', extraHeaders: 'Extra headers (JSON)',
  apiKey: 'API Key', appId: 'AppId', secretKey: 'Secret Key', secretId: 'SecretId', savedSecret: 'Saved securely', noSecret: 'Not set',
  saveSecret: 'Save', clearSecret: 'Clear', requestTimeout: 'Request timeout (ms)', maxSelectionChars: 'Max selected characters',
  documentChunkChars: 'Document chunk size', documentMode: 'Document translation mode', documentModeSmart: 'Smart', documentModeWhole: 'Whole document',
  debounceMs: 'Auto-translate debounce (ms)', showOutput: 'Also show results in Output channel', nativeSettings: 'Open native VS Code settings',
  saved: 'Saved', saving: 'Saving…', error: 'Unable to save', enableProviderFirst: 'Enable at least one engine before selecting a fixed default engine.',
  testProvider: 'Test', testingProvider: 'Testing…', providerAvailable: 'Available', providerUnavailable: 'Unavailable',
  aiPromptTitle: 'AI translation prompt', aiPromptDescription: 'Built-in prompt used by OpenAI Compatible and Ollama. You can edit it for your own translation style.',
  aiPromptPlaceholders: 'Available placeholders: {task}, {targetLanguage}, {sourceLanguage}, {context}', resetPrompt: 'Restore default prompt', feedback: 'Feedback',
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
  interfaceLanguage: '界面语言', interfaceLanguageHelp: '“自动”会跟随当前 VS Code 显示语言。',
  sourceLanguage: '源语言', targetLanguage: '目标语言', defaultProvider: '默认翻译引擎',
  defaultProviderHelp: '选择“自动”时，只会按顺序尝试已经启用的翻译引擎。', auto: '自动',
  autoTranslate: '划词后自动翻译', autoTranslateHelp: '选区停止变化后自动开始翻译。',
  editorPresentation: '编辑器译文显示位置', terminalPresentation: '终端译文显示位置',
  presentationHover: '选区附近浮窗', presentationSidebar: 'PolyLingo 侧边栏',
  presentationNotification: '右下角通知', presentationEditor: '编辑器分栏',
  proxy: '代理', proxyHelp: '留空时继承 VS Code http.proxy 或系统环境变量中的代理。',
  enabled: '已启用', disabled: '未启用', enableHint: '勾选启用后才显示这个引擎的配置。',
  free: '免费', official: '官方 API', ai: 'AI', selfHosted: '自托管', endpoint: '接口地址', baseUrl: 'Base URL',
  email: '邮箱', region: '区域', model: '模型', temperature: 'Temperature', extraHeaders: '额外请求头（JSON）',
  apiKey: 'API Key', appId: 'AppId', secretKey: 'Secret Key', secretId: 'SecretId', savedSecret: '已安全保存', noSecret: '未设置',
  saveSecret: '保存', clearSecret: '清除', requestTimeout: '请求超时（毫秒）', maxSelectionChars: '最大划词字符数',
  documentChunkChars: '文档分块字符数', documentMode: '文档翻译模式', documentModeSmart: '智能模式', documentModeWhole: '整篇翻译',
  debounceMs: '自动划词延迟（毫秒）', showOutput: '同时在 Output 面板显示结果', nativeSettings: '打开 VS Code 原生设置',
  saved: '已保存', saving: '正在保存…', error: '保存失败', enableProviderFirst: '请先至少启用一个翻译引擎，再选择固定的默认引擎。',
  testProvider: '测试', testingProvider: '测试中…', providerAvailable: '可用', providerUnavailable: '不可用',
  aiPromptTitle: 'AI 翻译 Prompt', aiPromptDescription: 'OpenAI Compatible 和 Ollama 共用的内置 Prompt，可按自己的翻译习惯编辑。',
  aiPromptPlaceholders: '可用占位符：{task}、{targetLanguage}、{sourceLanguage}、{context}', resetPrompt: '恢复默认 Prompt', feedback: '反馈邮箱',
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
  interfaceLanguageHelp: '「自動」會跟隨目前 VS Code 顯示語言。', sourceLanguage: '來源語言', targetLanguage: '目標語言',
  defaultProvider: '預設翻譯引擎', defaultProviderHelp: '選擇「自動」時，只會依序嘗試已啟用的翻譯引擎。', auto: '自動',
  autoTranslate: '選取文字後自動翻譯', autoTranslateHelp: '選取範圍停止變動後自動開始翻譯。', proxy: '代理伺服器',
  editorPresentation: '編輯器譯文顯示位置', terminalPresentation: '終端機譯文顯示位置', presentationHover: '選取範圍附近浮窗',
  presentationSidebar: 'PolyLingo 側邊欄', presentationNotification: '右下角通知', presentationEditor: '編輯器分欄',
  proxyHelp: '留空時繼承 VS Code http.proxy 或系統環境變數中的代理。', enabled: '已啟用', disabled: '未啟用',
  enableHint: '勾選啟用後才顯示這個引擎的設定。', nativeSettings: '開啟 VS Code 原生設定', saved: '已儲存', saving: '儲存中…', error: '儲存失敗', testProvider: '測試', testingProvider: '測試中…', providerAvailable: '可用', providerUnavailable: '不可用', aiPromptTitle: 'AI 翻譯 Prompt', aiPromptDescription: 'OpenAI Compatible 與 Ollama 共用的內建 Prompt，可自行編輯。', resetPrompt: '還原預設 Prompt', feedback: '意見回饋'
};

const ja: PanelStrings = {
  ...en,
  title: 'PolyLingo 設定', subtitle: 'エディター、ドキュメント、ターミナル、複数の翻訳サービス、AI モデルに対応した開発者向け翻訳ツールです。',
  general: '基本設定', engines: '翻訳エンジン', advanced: '詳細設定', interfaceLanguage: 'UI 言語',
  interfaceLanguageHelp: '「自動」は VS Code の表示言語に従います。', sourceLanguage: '翻訳元言語', targetLanguage: '翻訳先言語',
  defaultProvider: '既定の翻訳エンジン', defaultProviderHelp: '自動では、有効なエンジンだけをフォールバック順に試します。', auto: '自動',
  autoTranslate: '選択範囲を自動翻訳', autoTranslateHelp: '選択範囲の変更が止まると翻訳します。', proxy: 'プロキシ',
  editorPresentation: 'エディター結果の表示場所', terminalPresentation: 'ターミナル結果の表示場所', presentationHover: '選択範囲付近の Hover',
  presentationSidebar: 'PolyLingo サイドバー', presentationNotification: '右下の通知', presentationEditor: 'エディター分割',
  enabled: '有効', disabled: '無効', enableHint: '有効にするとこのエンジンの設定が表示されます。', free: '無料', official: '公式 API', ai: 'AI',
  selfHosted: 'セルフホスト', nativeSettings: 'VS Code の標準設定を開く', saved: '保存しました', saving: '保存中…', error: '保存できませんでした', testProvider: 'テスト', testingProvider: 'テスト中…', providerAvailable: '利用可能', providerUnavailable: '利用不可', aiPromptTitle: 'AI 翻訳 Prompt', aiPromptDescription: 'OpenAI Compatible と Ollama で共通利用する組み込み Prompt です。編集できます。', resetPrompt: '既定の Prompt に戻す', feedback: 'フィードバック'
};

const ko: PanelStrings = {
  ...en,
  title: 'PolyLingo 설정', subtitle: '편집기, 문서, 터미널, 다양한 번역 서비스와 AI 모델을 지원하는 개발자용 번역 도구입니다.',
  general: '일반 설정', engines: '번역 엔진', advanced: '고급 설정', interfaceLanguage: '인터페이스 언어',
  interfaceLanguageHelp: '자동은 현재 VS Code 표시 언어를 따릅니다.', sourceLanguage: '원본 언어', targetLanguage: '대상 언어',
  defaultProvider: '기본 번역 엔진', defaultProviderHelp: '자동은 활성화된 엔진만 대체 순서대로 시도합니다.', auto: '자동',
  autoTranslate: '선택 텍스트 자동 번역', autoTranslateHelp: '선택 영역 변경이 멈춘 뒤 자동으로 번역합니다.', proxy: '프록시',
  editorPresentation: '편집기 결과 위치', terminalPresentation: '터미널 결과 위치', presentationHover: '선택 영역 근처 Hover',
  presentationSidebar: 'PolyLingo 사이드바', presentationNotification: '오른쪽 아래 알림', presentationEditor: '편집기 분할',
  enabled: '활성', disabled: '비활성', enableHint: '활성화하면 이 엔진의 설정이 표시됩니다.', free: '무료', official: '공식 API', ai: 'AI',
  selfHosted: '셀프 호스팅', nativeSettings: 'VS Code 기본 설정 열기', saved: '저장됨', saving: '저장 중…', error: '저장 실패', testProvider: '테스트', testingProvider: '테스트 중…', providerAvailable: '사용 가능', providerUnavailable: '사용 불가', aiPromptTitle: 'AI 번역 Prompt', aiPromptDescription: 'OpenAI Compatible 및 Ollama에서 공통으로 사용하는 내장 Prompt이며 편집할 수 있습니다.', resetPrompt: '기본 Prompt 복원', feedback: '피드백'
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
  id: Exclude<ProviderId, 'auto'>;
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

const SETTING_DEFAULTS: Record<string, unknown> = {
  'ui.language': 'auto', provider: 'auto', sourceLanguage: 'auto', targetLanguage: 'zh-CN', proxy: '', requestTimeoutMs: 15000,
  'ai.prompt': DEFAULT_AI_PROMPT,
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

const ALLOWED_SETTING_KEYS = new Set(Object.keys(SETTING_DEFAULTS));
const ALLOWED_SECRET_NAMES = new Set<SecretName>([
  'libreTranslateApiKey', 'deepLApiKey', 'azureApiKey', 'googleCloudApiKey', 'baiduAppId', 'baiduSecret',
  'tencentSecretId', 'tencentSecretKey', 'openAIApiKey'
]);

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

function fieldHtml(field: ConfigField, s: PanelStrings): string {
  const value = configValue(field.key);
  const label = s[field.label];
  if (field.type === 'json') {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
    return `<label class="field"><span>${escapeHtml(label)}</span><textarea data-setting="${escapeHtml(field.key)}" data-value-type="json" rows="4" placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(text)}</textarea></label>`;
  }
  const numberLimits = field.key === 'openAI.temperature' ? ' min="0" max="2" step="0.1"' : '';
  return `<label class="field"><span>${escapeHtml(label)}</span><input data-setting="${escapeHtml(field.key)}" data-value-type="${field.type === 'number' ? 'number' : 'text'}" type="${field.type === 'number' ? 'number' : 'text'}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}"${numberLimits}></label>`;
}

function secretHtml(field: SecretField, configured: boolean, s: PanelStrings): string {
  return `<div class="field secret-field" data-secret-row="${field.name}">
    <span>${escapeHtml(s[field.label])}</span>
    <div class="secret-controls">
      <input type="password" data-secret-input="${field.name}" autocomplete="off" placeholder="${configured ? '••••••••' : ''}">
      <button class="secondary" data-save-secret="${field.name}">${escapeHtml(s.saveSecret)}</button>
      <button class="ghost" data-clear-secret="${field.name}" ${configured ? '' : 'disabled'}>${escapeHtml(s.clearSecret)}</button>
    </div>
    <small data-secret-status="${field.name}" class="${configured ? 'ok' : 'muted'}">${escapeHtml(configured ? s.savedSecret : s.noSecret)}</small>
  </div>`;
}

function providerCard(def: ProviderDefinition, secretState: Record<string, boolean>, s: PanelStrings): string {
  const enabled = isProviderEnabled(def.id);
  const fields = def.fields.map((f) => fieldHtml(f, s)).join('');
  const secrets = (def.secrets || []).map((f) => secretHtml(f, Boolean(secretState[f.name]), s)).join('');
  return `<section class="provider-card ${enabled ? 'enabled' : ''}" data-provider-card="${def.id}">
    <div class="provider-head">
      <div class="provider-copy">
        <div class="provider-title-row"><strong>${escapeHtml(def.name)}</strong><span class="tag">${escapeHtml(s[def.category])}</span></div>
        <p>${escapeHtml(s.providerDescriptions[def.id] || '')}</p>
      </div>
      <label class="switch-wrap" title="${escapeHtml(s.enableHint)}">
        <span data-enabled-label="${def.id}">${escapeHtml(enabled ? s.enabled : s.disabled)}</span>
        <input type="checkbox" data-provider-toggle="${def.id}" ${enabled ? 'checked' : ''}>
        <span class="switch"></span>
      </label>
    </div>
    <div class="provider-body" ${enabled ? '' : 'hidden'}>
      <div class="form-grid">${fields}${secrets}</div>
      <div class="provider-test-row"><button class="secondary" data-test-provider="${def.id}">${escapeHtml(s.testProvider)}</button><span class="test-status muted" data-test-status="${def.id}"></span></div>
    </div>
  </section>`;
}

function option(value: string, label: string, selectedValue: string): string {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

export class SettingsPanel implements vscode.Disposable {
  private static current: SettingsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  static async show(extensionUri: vscode.Uri, secrets: Secrets, manager: TranslationManager, onStateChanged?: () => Promise<void>): Promise<void> {
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
    SettingsPanel.current = new SettingsPanel(panel, extensionUri, secrets, manager, onStateChanged);
    await SettingsPanel.current.render();
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly secrets: Secrets,
    private readonly manager: TranslationManager,
    private readonly onStateChanged?: () => Promise<void>
  ) {
    this.panel = panel;
    void this.extensionUri; // reserved for future bundled webview assets
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage((message) => void this.onMessage(message), null, this.disposables);
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
    for (const name of ALLOWED_SECRET_NAMES) state[name] = Boolean(await this.secrets.get(name));
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
      if (message.type === 'toggleProvider') {
        const id = message.provider as ProviderId;
        if (!ALL_PROVIDER_IDS.includes(id) || typeof message.enabled !== 'boolean') return;
        await setProviderEnabled(id, message.enabled);
        this.post({ type: 'saved', setting: `provider:${id}` });
        await this.onStateChanged?.();
        return;
      }
      if (message.type === 'updateSetting') {
        const key = String(message.key || '');
        if (!ALLOWED_SETTING_KEYS.has(key)) return;
        let value: unknown = message.value;
        if (key === 'openAI.extraHeaders' && typeof value === 'string') {
          value = value.trim() ? JSON.parse(value) : {};
          if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Extra headers must be a JSON object.');
        }
        if (['requestTimeoutMs', 'maxSelectionChars', 'document.chunkChars', 'selection.debounceMs', 'openAI.temperature'].includes(key)) {
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue)) throw new Error(`Invalid number for ${key}`);
          if (key === 'openAI.temperature' && (numericValue < 0 || numericValue > 2)) throw new Error('Temperature must be between 0 and 2.');
          value = numericValue;
        }
        if (['selection.autoTranslate', 'result.showOutputChannel'].includes(key)) value = Boolean(value);
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
        const name = message.name as SecretName;
        if (!ALLOWED_SECRET_NAMES.has(name)) return;
        const value = String(message.value || '').trim();
        if (!value) return;
        await this.secrets.set(name, value);
        this.post({ type: 'secretState', name, configured: true });
        await this.onStateChanged?.();
        return;
      }
      if (message.type === 'clearSecret') {
        const name = message.name as SecretName;
        if (!ALLOWED_SECRET_NAMES.has(name)) return;
        await this.secrets.delete(name);
        this.post({ type: 'secretState', name, configured: false });
        await this.onStateChanged?.();
        return;
      }
      if (message.type === 'testProvider') {
        const id = message.provider as ProviderId;
        if (!ALL_PROVIDER_IDS.includes(id)) return;
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
      if (message.type === 'openNativeSettings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_SECTION);
      }
    } catch (error) {
      this.post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }

  private html(secretState: Record<string, boolean>, s: PanelStrings): string {
    const webview = this.panel.webview;
    const n = nonce();
    const currentProvider = getProvider();
    const source = String(configValue('sourceLanguage'));
    const target = String(configValue('targetLanguage'));
    const uiLanguage = String(configValue('ui.language'));
    const languageOptions = COMMON_LANGUAGES.map(([code, name]) => option(code, `${name} · ${code}`, source)).join('');
    const targetOptions = COMMON_LANGUAGES.filter(([code]) => code !== 'auto').map(([code, name]) => option(code, `${name} · ${code}`, target)).join('');
    const providerOptions = [`<option value="auto" ${currentProvider === 'auto' ? 'selected' : ''}>${escapeHtml(s.auto)}</option>`]
      .concat(PROVIDERS.map((p) => `<option value="${p.id}" data-provider-option="${p.id}" ${isProviderEnabled(p.id) ? '' : 'disabled'} ${currentProvider === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)).join('');
    const cards = PROVIDERS.map((p) => providerCard(p, secretState, s)).join('');
    const uiOptions = [
      ['auto', `${s.auto} (${vscode.env.language})`], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['en', 'English'], ['ja', '日本語'], ['ko', '한국어']
    ].map(([value, label]) => option(value, label, uiLanguage)).join('');

    const autoTranslate = Boolean(configValue('selection.autoTranslate'));
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
    const aiEnabled = isProviderEnabled('openai-compatible') || isProviderEnabled('ollama');
    const aiPrompt = String(configValue('ai.prompt'));

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
  .provider-list { display: flex; flex-direction: column; gap: 10px; }
  .provider-card { border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); border-radius: 10px; background: var(--vscode-sideBar-background); overflow: hidden; transition: border-color .12s ease; }
  .provider-card.enabled { border-color: var(--vscode-focusBorder); }
  .provider-head { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 15px 18px; }
  .provider-copy { min-width: 0; }
  .provider-copy p { margin: 5px 0 0; color: var(--vscode-descriptionForeground); }
  .provider-title-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .tag { font-size: 11px; font-weight: 600; color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); border-radius: 10px; padding: 2px 8px; }
  .provider-body { padding: 4px 18px 18px; border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); animation: reveal .12s ease-out; }
  .provider-body[hidden], #ai-prompt-section[hidden] { display: none !important; }
  @keyframes reveal { from { opacity: .4; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px 18px; padding-top: 14px; }
  .provider-test-row { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
  .test-status { min-width: 0; overflow-wrap: anywhere; }
  .test-status.ok { color: var(--vscode-testing-iconPassed, #2ea043); }
  .test-status.fail { color: var(--vscode-testing-iconFailed, var(--vscode-errorForeground)); }
  .prompt-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
  .feedback { color: var(--vscode-descriptionForeground); }
  .link-button { color: var(--vscode-textLink-foreground); background: transparent; padding: 0; border: 0; text-decoration: none; }
  .link-button:hover { color: var(--vscode-textLink-activeForeground); background: transparent; text-decoration: underline; }
  .secret-field { grid-column: 1 / -1; }
  .secret-controls { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
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
  .footer { margin-top: 22px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  #save-status { min-height: 20px; color: var(--vscode-descriptionForeground); }
  #save-status.error { color: var(--vscode-errorForeground); }
  @media (max-width: 720px) { .general-grid, .advanced-grid, .form-grid { grid-template-columns: 1fr; } .provider-head { align-items: flex-start; } .secret-controls { grid-template-columns: 1fr; } .secret-field { grid-column: auto; } }
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
      <label class="field"><span>${escapeHtml(s.proxy)}</span><input type="text" data-setting="proxy" data-value-type="text" value="${escapeHtml(configValue('proxy'))}" placeholder="http://127.0.0.1:7890"><small>${escapeHtml(s.proxyHelp)}</small></label>
      <label class="field"><span>${escapeHtml(s.autoTranslate)}</span><span class="check-row"><input type="checkbox" data-setting="selection.autoTranslate" data-value-type="boolean" ${autoTranslate ? 'checked' : ''}><span class="help">${escapeHtml(s.autoTranslateHelp)}</span></span></label>
      <label class="field"><span>${escapeHtml(s.editorPresentation)}</span><select data-setting="result.editorPresentation" data-value-type="text">${editorPresentationOptions}</select></label>
      <label class="field"><span>${escapeHtml(s.terminalPresentation)}</span><select data-setting="result.terminalPresentation" data-value-type="text">${terminalPresentationOptions}</select></label>
    </div>
  </section>

  <h2>${escapeHtml(s.engines)}</h2>
  <div class="provider-list">${cards}</div>

  <div id="ai-prompt-section" ${aiEnabled ? '' : 'hidden'}>
    <h2>${escapeHtml(s.aiPromptTitle)}</h2>
    <section class="section">
      <div class="advanced-grid" style="grid-template-columns:1fr">
        <label class="field"><span>${escapeHtml(s.aiPromptTitle)}</span><textarea id="ai-prompt" data-setting="ai.prompt" data-value-type="text" rows="11">${escapeHtml(aiPrompt)}</textarea><small>${escapeHtml(s.aiPromptDescription)}<br>${escapeHtml(s.aiPromptPlaceholders)}</small></label>
        <div class="prompt-actions"><button class="ghost" id="reset-ai-prompt">${escapeHtml(s.resetPrompt)}</button></div>
      </div>
    </section>
  </div>

  <h2>${escapeHtml(s.advanced)}</h2>
  <details class="section">
    <summary>${escapeHtml(s.advanced)}</summary>
    <div class="advanced-grid">
      <label class="field"><span>${escapeHtml(s.requestTimeout)}</span><input type="number" min="1000" max="120000" data-setting="requestTimeoutMs" data-value-type="number" value="${escapeHtml(configValue('requestTimeoutMs'))}"></label>
      <label class="field"><span>${escapeHtml(s.maxSelectionChars)}</span><input type="number" min="100" max="100000" data-setting="maxSelectionChars" data-value-type="number" value="${escapeHtml(configValue('maxSelectionChars'))}"></label>
      <label class="field"><span>${escapeHtml(s.documentChunkChars)}</span><input type="number" min="500" max="20000" data-setting="document.chunkChars" data-value-type="number" value="${escapeHtml(configValue('document.chunkChars'))}"></label>
      <label class="field"><span>${escapeHtml(s.documentMode)}</span><select data-setting="document.mode" data-value-type="text"><option value="smart" ${docMode === 'smart' ? 'selected' : ''}>${escapeHtml(s.documentModeSmart)}</option><option value="whole" ${docMode === 'whole' ? 'selected' : ''}>${escapeHtml(s.documentModeWhole)}</option></select></label>
      <label class="field"><span>${escapeHtml(s.debounceMs)}</span><input type="number" min="150" max="5000" data-setting="selection.debounceMs" data-value-type="number" value="${escapeHtml(configValue('selection.debounceMs'))}"></label>
      <label class="field"><span>${escapeHtml(s.showOutput)}</span><span class="check-row"><input type="checkbox" data-setting="result.showOutputChannel" data-value-type="boolean" ${showOutput ? 'checked' : ''}></span></label>
    </div>
  </details>

  <div class="footer"><div><div id="save-status"></div><div class="feedback">${escapeHtml(s.feedback)}：<button class="link-button" id="feedback-email">xinghehy@qq.com</button></div></div><button class="ghost" id="open-native">${escapeHtml(s.nativeSettings)}</button></div>
</div>
<script nonce="${n}">
(() => {
  const vscode = acquireVsCodeApi();
  const strings = ${JSON.stringify({ enabled: s.enabled, disabled: s.disabled, saved: s.saved, saving: s.saving, error: s.error, savedSecret: s.savedSecret, noSecret: s.noSecret, testProvider: s.testProvider, testingProvider: s.testingProvider, providerAvailable: s.providerAvailable, providerUnavailable: s.providerUnavailable })};
  const status = document.getElementById('save-status');
  let statusTimer;
  function showStatus(text, isError = false) {
    clearTimeout(statusTimer);
    status.textContent = text;
    status.classList.toggle('error', isError);
    if (!isError) statusTimer = setTimeout(() => { status.textContent = ''; }, 1400);
  }
  function valueFor(el) {
    const type = el.dataset.valueType || 'text';
    if (type === 'boolean') return !!el.checked;
    if (type === 'number') return Number(el.value);
    return el.value;
  }
  document.querySelectorAll('[data-setting]').forEach((el) => {
    el.addEventListener('change', () => {
      showStatus(strings.saving);
      vscode.postMessage({ type: 'updateSetting', key: el.dataset.setting, value: valueFor(el) });
    });
  });
  document.querySelectorAll('[data-provider-toggle]').forEach((el) => {
    el.addEventListener('change', () => {
      const id = el.dataset.providerToggle;
      const enabled = !!el.checked;
      const card = document.querySelector('[data-provider-card="' + id + '"]');
      const body = card && card.querySelector('.provider-body');
      const label = document.querySelector('[data-enabled-label="' + id + '"]');
      if (card) card.classList.toggle('enabled', enabled);
      if (body) body.hidden = !enabled;
      if (label) label.textContent = enabled ? strings.enabled : strings.disabled;
      const option = document.querySelector('[data-provider-option="' + id + '"]');
      if (option) option.disabled = !enabled;
      const aiSection = document.getElementById('ai-prompt-section');
      if (aiSection && (id === 'openai-compatible' || id === 'ollama')) {
        const openai = document.querySelector('[data-provider-toggle="openai-compatible"]');
        const ollama = document.querySelector('[data-provider-toggle="ollama"]');
        aiSection.hidden = !(openai && openai.checked) && !(ollama && ollama.checked);
      }
      const providerSelect = document.getElementById('provider-select');
      if (!enabled && providerSelect && providerSelect.value === id) {
        providerSelect.value = 'auto';
      }
      showStatus(strings.saving);
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
  document.querySelectorAll('[data-save-secret]').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.saveSecret;
      const input = document.querySelector('[data-secret-input="' + name + '"]');
      if (!input || !input.value.trim()) return;
      showStatus(strings.saving);
      vscode.postMessage({ type: 'saveSecret', name, value: input.value });
      input.value = '';
    });
  });
  document.querySelectorAll('[data-clear-secret]').forEach((button) => {
    button.addEventListener('click', () => {
      showStatus(strings.saving);
      vscode.postMessage({ type: 'clearSecret', name: button.dataset.clearSecret });
    });
  });
  const resetPrompt = document.getElementById('reset-ai-prompt');
  if (resetPrompt) resetPrompt.addEventListener('click', () => {
    const textarea = document.getElementById('ai-prompt');
    if (textarea) textarea.value = ${JSON.stringify(DEFAULT_AI_PROMPT)};
    showStatus(strings.saving);
    vscode.postMessage({ type: 'updateSetting', key: 'ai.prompt', value: ${JSON.stringify(DEFAULT_AI_PROMPT)} });
  });
  document.getElementById('feedback-email').addEventListener('click', () => vscode.postMessage({ type: 'openFeedback' }));
  document.getElementById('open-native').addEventListener('click', () => vscode.postMessage({ type: 'openNativeSettings' }));
  window.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type === 'saved') showStatus(strings.saved);
    if (message.type === 'error') showStatus(strings.error + ': ' + message.message, true);
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
      const statusEl = document.querySelector('[data-secret-status="' + message.name + '"]');
      const clear = document.querySelector('[data-clear-secret="' + message.name + '"]');
      if (statusEl) {
        statusEl.textContent = message.configured ? strings.savedSecret : strings.noSecret;
        statusEl.classList.toggle('ok', !!message.configured);
        statusEl.classList.toggle('muted', !message.configured);
      }
      if (clear) clear.disabled = !message.configured;
      showStatus(strings.saved);
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
