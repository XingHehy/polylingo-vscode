[English](README.en.md) | [简体中文](README.md) | **繁體中文**

# PolyLingo

專為開發者設計的 VS Code 多引擎翻譯擴充功能。

直接在編輯器、終端機和技術文件中翻譯文字，也能使用 AI 翻譯並解釋錯誤記錄。PolyLingo 不綁定單一服務：同時支援免費介面、官方 API、OpenAI 相容服務和本機模型。

## 主要功能

- **編輯器選取翻譯**：選取文字後自動顯示浮窗，點擊「翻譯」才送出請求；譯文可複製或取代原文。
- **自動選取翻譯**：可選擇開啟，在選取範圍停止變更後直接於浮窗翻譯。
- **終端機翻譯**：翻譯命令輸出、錯誤和記錄。
- **文件翻譯**：支援 Markdown、純文字和原始碼註解；智慧模式會保護程式碼區塊。
- **懸停文件翻譯**：函式、類別或模組的說明譯文可直接顯示在浮窗內，或選擇顯示在側邊欄，不必複製或選取浮窗文字。
- **AI 翻譯與解釋**：透過 OpenAI Compatible 或 Ollama 理解技術內容。
- **多引擎與自動備援**：目前引擎失敗後，`auto` 模式會嘗試下一個可用引擎。
- **可選擇結果位置**：依使用情境選擇浮動視窗、側邊欄、右下角通知或編輯器分欄。
- **翻譯工作區**：選取原文會填入側邊欄輸入框，可選擇引擎翻譯並查看本機歷史記錄。
- **安全儲存憑證**：API Key 儲存在 VS Code `SecretStorage`，不會寫入 `settings.json`。
- **多語言介面**：支援簡體中文、繁體中文、English、日本語和한국어。

## 快速開始

### 安裝

從專案發佈頁下載 `.vsix`，然後在 VS Code 中選擇：

```text
Extensions → … → Install from VSIX…
```

也可以使用命令列安裝：

```bash
code --install-extension poly-lingo-0.1.2.vsix
```

### 第一次使用

1. 在命令選擇區執行 `PolyLingo: Open Custom Settings`。
2. 選擇目標語言和翻譯引擎。預設的 `Auto` 會依序嘗試已啟用的引擎。
3. 在編輯器中選取文字，於浮窗點擊「翻譯」，也可使用快速鍵或右鍵選單。

預設快速鍵：

| 平台 | 編輯器或終端機選取範圍 |
|---|---|
| macOS | `Cmd + Alt + T` |
| Windows / Linux | `Ctrl + Alt + T` |

若要選取後不經點擊就開始翻譯，請在設定頁啟用 **選取浮窗自動翻譯**。

若要翻譯函式、類別或模組說明，將滑鼠移至程式碼符號，點擊浮窗中的 **翻譯此文件**。在 PolyLingo 設定中可選擇將譯文顯示於原浮窗下方或 PolyLingo 側邊欄；兩種模式都需點擊才會翻譯。函式簽名與程式碼區塊不會傳送給翻譯引擎。也可以將編輯器游標放在符號上，從命令選擇區執行 **PolyLingo: 翻譯懸停文件說明**。

點擊後浮窗入口會顯示旋轉的翻譯狀態；選取浮窗和側邊欄翻譯按鈕也會在請求期間顯示載入狀態。從命令選擇區或終端機開始的翻譯會顯示進度通知。

VS Code 會合併不同擴充功能的懸停內容。PolyLingo 只能在原文區域之外追加譯文，無法直接修改 Pylance 等擴充功能顯示的原文，也無法在原文每行之間插入譯文。

## 翻譯結果

編輯器譯文預設顯示在選取範圍附近的 Hover 浮動視窗，並提供：

- 複製譯文
- 使用譯文取代原文
- AI 翻譯並解釋（設定 AI 引擎後顯示）
- 在 PolyLingo Output 中查看完整結果

可以在設定頁選擇結果顯示位置：

| 情境 | 可選位置 | 預設值 |
|---|---|---|
| 編輯器選取 | 選取浮動視窗、PolyLingo 側邊欄、右下角通知、編輯器分欄 | 選取浮動視窗 |
| 終端機 | PolyLingo 側邊欄、右下角通知、編輯器分欄 | 側邊欄 |

終端機沒有穩定可用的 Hover API，因此不提供選取浮動視窗。側邊欄會顯示原文、譯文、Provider 和偵測到的語言，並提供複製、AI 解釋及 Output 操作。

當譯文包含 Markdown 時，編輯器 Hover 和側邊欄會轉譯標題、清單、表格、引言與程式碼區塊；編輯器分欄模式會開啟 Markdown 預覽。為了確保安全，原始 HTML、遠端圖片和命令連結都不會執行。

### PolyLingo 側邊欄

側邊欄支援：

- 輸入文字並選擇來源語言、目標語言後直接翻譯
- 使用 `Ctrl/Cmd + Enter` 快速送出
- 查看原文、譯文、Provider 和偵測到的語言
- 複製譯文、開啟 Output 或繼續使用 AI 解釋
- 儲存最近 30 筆本機翻譯歷史
- 還原、刪除單筆歷史或清除全部歷史

為了相容 VS Code 1.98.2 及更早版本，PolyLingo 預設註冊在左側 Activity Bar。可以透過檢視選單中的「移動檢視」或直接拖曳，將它移到右側 Secondary Side Bar；VS Code 會記住選擇的位置。

## 支援的翻譯引擎

| 引擎 | 憑證 | 類型與說明 |
|---|---:|---|
| Google Free | 無 | 非官方介面，可能受到流量限制或失效 |
| Bing Web | 無 | 非官方網頁介面，可能因網頁變更而失效 |
| MyMemory | 無 | 公開翻譯 API |
| LibreTranslate | 選填 | 開放原始碼服務，建議自行託管 |
| DeepL | 必要 | DeepL 官方 API |
| Azure Translator | 必要 | Azure 官方 API，需要 Key 和 Region |
| Google Cloud Translation | 必要 | Google Cloud 官方 API |
| 百度翻譯 | 必要 | 需要 AppId 和 Secret |
| 騰訊雲 TMT | 必要 | 需要 SecretId 和 SecretKey |
| OpenAI Compatible | 通常必要 | 相容 `/chat/completions` 的 AI 服務 |
| Ollama | 無 | 在本機執行的模型 |

預設內建並啟用 Google Free、Bing Web 和 MyMemory。這三個內建項目可停用，但不能刪除。所有類型都能重複新增，例如多個 LibreTranslate 服務、OpenAI Compatible 端點，或額外的 Google Free、Bing Web、MyMemory。每個實例可個別命名，顯示為「名稱 · 提供商」，設定與憑證彼此獨立。

> Google Free 與 Bing Web 並非官方公開 API，適合輕量使用，但無法保證穩定性。需要穩定服務時，請設定官方 API、自行託管的 LibreTranslate 或本機 Ollama。

## 設定

執行 `PolyLingo: Open Custom Settings` 可以：

- 啟用或停用翻譯引擎
- 拖曳引擎列表左側的三橫線調整優先順序
- 新增、命名、刪除自訂引擎實例；三個內建實例只能停用
- 設定來源語言、目標語言和預設引擎
- 測試每個引擎是否可用
- 儲存 API Key、Region、模型名稱等參數
- 設定 Proxy、請求逾時和選取浮窗延遲
- 在各個 OpenAI Compatible 或 Ollama 引擎實例中分別編輯 AI 翻譯 Prompt

常用的原生 VS Code 設定範例：

```jsonc
{
  "polyLingo.provider": "auto",
  "polyLingo.sourceLanguage": "auto",
  "polyLingo.targetLanguage": "zh-CN",
  "polyLingo.selection.autoTranslate": false,
  "polyLingo.selection.debounceMs": 650,
  "polyLingo.result.editorPresentation": "hover",
  "polyLingo.result.terminalPresentation": "sidebar",
  "polyLingo.document.mode": "smart",
  "polyLingo.requestTimeoutMs": 15000,
  "polyLingo.proxy.enabled": false,
  "polyLingo.proxy": ""
}
```

### Auto 模式

當 `polyLingo.provider` 設為 `auto` 時，PolyLingo 會由上而下依序嘗試引擎列表中已啟用且設定完整的實例。拖曳每列左側的三橫線即可調整優先順序，排列會自動儲存。若單獨選定某個實例，請求失敗後不會切換到其他實例。請透過自訂設定頁管理實例；不讀取舊版按提供商分開儲存的設定或憑證。

### Proxy

全域「進階」中可以設定預設 Proxy 開關與位址。每個翻譯引擎的「進階」也可以選擇「繼承預設設定」「為此引擎啟用」或「為此引擎停用」；引擎層級的選擇永遠優先於全域設定。

啟用 Proxy 且位址留空時，會依照以下順序尋找位址：

1. `polyLingo.proxy`
2. VS Code 的 `http.proxy`
3. `HTTPS_PROXY` / `HTTP_PROXY` 環境變數
4. 作業系統 Proxy（macOS、Windows 或 Linux GNOME）

### 請求逾時

全域 **請求逾時** 預設為 15000 毫秒。每個翻譯引擎的 **進階設定** 可單獨設定 **此引擎請求逾時**（1000–600000 毫秒）；留空時沿用全域值。翻譯較長文件時，可為耗時較長的引擎設定更高的值。

### API Key

請透過 PolyLingo 設定頁或 `PolyLingo: Manage API Credentials` 儲存憑證。敏感資料使用 VS Code `SecretStorage` 儲存，請勿將 API Key 寫入專案檔案或 `settings.json`。

## 文件翻譯

PolyLingo 提供兩種模式：

- `smart`（預設）：Markdown 會保留 fenced code block；原始碼只翻譯辨識到的整行註解，降低破壞程式碼的風險。
- `whole`：將整個檔案視為純文字翻譯，適合純文字檔案，不建議用於原始碼。

可以選擇在新預覽頁顯示譯文，也可以直接取代目前文件。直接取代前，建議先儲存或使用版本控制。

## AI 翻譯與解釋

啟用並設定 OpenAI Compatible 或 Ollama 後，編輯器和終端機選單會顯示 AI 翻譯與解釋入口。

OpenAI Compatible 範例：

```jsonc
{
  "polyLingo.openAI.enabled": true,
  "polyLingo.openAI.baseUrl": "https://api.openai.com/v1",
  "polyLingo.openAI.model": "gpt-4.1-mini"
}
```

本機 Ollama 範例：

```bash
ollama pull qwen2.5:7b
```

```jsonc
{
  "polyLingo.ollama.enabled": true,
  "polyLingo.ollama.baseUrl": "http://127.0.0.1:11434/v1",
  "polyLingo.ollama.model": "qwen2.5:7b"
}
```

內建 Prompt 會盡量保留程式碼、命令、路徑、URL、識別碼、API 名稱、堆疊和 Markdown。每個 OpenAI Compatible 或 Ollama 實例都有自己的 Prompt；可在該實例的「編輯」面板中修改或還原預設值。

## 常用命令

在命令選擇區輸入 `PolyLingo` 即可查看所有命令。

| 命令 | 用途 |
|---|---|
| Translate Selection | 翻譯編輯器選取範圍 |
| Translate and Replace Selection | 翻譯並取代選取範圍 |
| Translate Terminal Selection | 翻譯終端機選取範圍 |
| Translate Clipboard | 翻譯剪貼簿內容 |
| Translate Document to Preview | 在預覽頁翻譯文件 |
| Translate Document In Place | 翻譯並取代目前文件 |
| AI Translate and Explain | 使用 AI 翻譯並解釋 |
| Select Translation Provider | 切換翻譯引擎 |
| Select Target Language | 切換目標語言 |
| Open Custom Settings | 開啟 PolyLingo 自訂設定頁 |

## 常見問題

### Google Free 測試傳回 HTTP 429

這表示 Google 的非官方免費介面限制了目前的網路或 IP，並不代表目標語言設定錯誤。可以稍後重試、切換網路，或使用 `Auto` 模式自動嘗試其他引擎。需要穩定的 Google 翻譯服務時，請使用 Google Cloud Translation 並設定 API Key。

### 為什麼沒有顯示 AI 選單？

只有在啟用並正確設定 OpenAI Compatible 或 Ollama 後，才會顯示 AI 相關選單。可以在設定頁按一下「測試」來檢查連線。

### 終端機翻譯為什麼會存取剪貼簿？

VS Code 沒有公開通用的終端機選取範圍讀取 API。PolyLingo 會短暫複製終端機選取範圍，並在讀取後還原原本的剪貼簿內容。

## 隱私權與安全性

- PolyLingo 不會內建或共用 API Key。
- 使用者憑證儲存在 VS Code `SecretStorage`。
- 最近 30 筆翻譯歷史儲存在本機 VS Code 擴充功能狀態中，可隨時從側邊欄清除。
- 待翻譯文字會傳送給目前選擇的翻譯服務。
- `openAI.extraHeaders` 是一般設定項目，不應用來存放密鑰。

## 本機開發

```bash
npm install
npm run typecheck
npm run compile
```

使用 VS Code 開啟專案並按 `F5`，即可啟動 Extension Development Host。

封裝 VSIX：

```bash
npm run package
```

預設會產生帶有本機時間戳的測試版本，例如 `poly-lingo-0.1.3-test-20260920105412.vsix`。若要在本機產生與 `package.json` 相同的正式版本：

```bash
npm run package:release
```

## 參與貢獻

歡迎提交 Issue 和 Pull Request，包括：

- 修正翻譯引擎相容性問題
- 新增 Provider
- 改善翻譯結果和互動體驗
- 補充測試、文件與本地化

提交程式碼前，請至少執行：

```bash
npm run typecheck
npm run compile
```

新增設定項目或介面文字時，請同步更新 `package.nls*.json` 以及執行階段語言資源。

## 已知限制

- 非官方網頁介面可能因流量限制、風險控管或服務變更而失效。
- 智慧文件翻譯使用保守的逐行註解辨識，而非完整的 AST 解析。
- 終端機選取範圍讀取依賴 VS Code 內建的複製命令。
- AI Provider 目前使用 Chat Completions 相容介面。

## 意見回饋

可以透過 Issue 回報問題，或寄送電子郵件至 `xinghehy@qq.com`。

## License

MIT，詳見儲存庫中的 `LICENSE` 檔案。
