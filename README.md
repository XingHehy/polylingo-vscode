[English](README.en.md) | **简体中文** | [繁體中文](README.zh-TW.md)

# PolyLingo

面向开发者的 VS Code 多引擎翻译扩展。

在编辑器、终端和技术文档中直接翻译文字，也可以使用 AI 翻译并解释错误日志。PolyLingo 不绑定单一服务：既支持免费接口，也支持官方 API、OpenAI 兼容服务和本地模型。

## 主要功能

- **编辑器划词翻译**：选中文字后自动显示浮窗，点击“翻译”才开始请求；译文可复制或替换原文。
- **自动划词翻译**：可选开启，选区停止变化后直接在浮窗翻译。
- **终端翻译**：翻译命令输出、报错和日志。
- **文档翻译**：支持 Markdown、纯文本和源代码注释；智能模式会保护代码块。
- **悬停文档翻译**：函数、类或模块的说明译文可直接显示在浮窗内，也可选择显示在侧边栏，无需复制或框选浮窗文字。
- **AI 翻译与解释**：通过 OpenAI Compatible 或 Ollama 理解技术内容。
- **多引擎与自动降级**：当前引擎失败后，`auto` 模式会尝试下一个可用引擎。
- **结果位置可选**：按使用场景选择浮窗、侧边栏、右下角通知或编辑器分栏。
- **翻译工作区**：选区原文自动填入侧边栏输入框，可选择引擎翻译并查看本地历史记录。
- **安全保存凭据**：API Key 存入 VS Code `SecretStorage`，不会写入 `settings.json`。
- **多语言界面**：支持简体中文、繁体中文、English、日本語和한국어。

## 快速开始

### 安装

从项目发布页下载 `.vsix` 后，在 VS Code 中选择：

```text
Extensions → … → Install from VSIX…
```

也可以使用命令行安装：

```bash
code --install-extension poly-lingo-0.1.2.vsix
```

### 第一次使用

1. 在命令面板运行 `PolyLingo: Open Custom Settings`。
2. 选择目标语言和翻译引擎。默认 `Auto` 会依次尝试已启用的引擎。
3. 在编辑器中选中文字，在弹出的浮窗点击“翻译”，也可以使用快捷键或右键菜单。

默认快捷键：

| 平台            | 编辑器或终端选区   |
| --------------- | ------------------ |
| macOS           | `Cmd + Alt + T`  |
| Windows / Linux | `Ctrl + Alt + T` |

如果希望选词后无需点击就开始翻译，请在设置页启用 **划词浮窗自动翻译**。

要翻译函数、类或模块的悬停说明，将鼠标移到代码符号上，点击浮窗中的 **翻译此文档**。在 PolyLingo 设置中可选择让译文显示在原浮窗下方或 PolyLingo 侧边栏；两种模式都需要点击后才发起翻译。函数签名和代码块不会发送给翻译引擎。也可以把编辑器光标放在符号上，从命令面板运行 **PolyLingo: 翻译悬停文档说明**。

点击后浮窗入口会显示旋转的翻译状态；划词浮窗和侧边栏翻译按钮也会在请求期间显示加载状态。通过命令面板或终端发起的翻译会显示进度通知。

VS Code 会合并不同扩展的悬停内容。PolyLingo 只能在原文区域之外追加译文，无法直接修改 Pylance 等扩展显示的原文，也无法在原文每行之间插入译文。

## 翻译结果

编辑器译文默认显示在选区附近的 Hover 浮窗中，并提供：

- 复制译文
- 用译文替换原文
- AI 翻译并解释（配置 AI 引擎后显示）
- 在 PolyLingo Output 中查看完整结果

结果位置可以在设置页中选择：

| 场景 | 可选位置 | 默认值 |
|---|---|---|
| 编辑器划词 | 选区浮窗、PolyLingo 侧边栏、右下角通知、编辑器分栏 | 选区浮窗 |
| 终端 | PolyLingo 侧边栏、右下角通知、编辑器分栏 | 侧边栏 |

终端没有可用的稳定 Hover API，因此不提供选区浮窗。侧边栏会显示原文、译文、Provider 和语言检测结果，并提供复制、AI 解释及 Output 操作。

当译文包含 Markdown 时，编辑器 Hover 和侧边栏会渲染标题、列表、表格、引用与代码块；编辑器分栏模式会打开 Markdown 预览。为保证安全，原始 HTML、远程图片和命令链接不会执行。

### PolyLingo 侧边栏

侧边栏支持：

- 输入文字并选择源语言、目标语言后直接翻译
- 使用 `Ctrl/Cmd + Enter` 快速提交
- 查看原文、译文、Provider 和检测到的语言
- 复制译文、打开 Output 或继续 AI 解释
- 保存最近 30 条本地翻译历史
- 恢复、删除单条历史或清空全部历史

为兼容 VS Code 1.98.2 及更早版本，PolyLingo 默认注册在左侧 Activity Bar。可以通过视图菜单中的“移动视图”或直接拖拽，将它放到右侧 Secondary Side Bar，位置会由 VS Code 保存。

## 支持的翻译引擎

| 引擎                     |     凭据 | 类型与说明                           |
| ------------------------ | -------: | ------------------------------------ |
| Google Free              |       无 | 非官方接口，可能被限流或失效         |
| Bing Web                 |       无 | 非官方网页接口，可能随网页变化失效   |
| MyMemory                 |       无 | 公共翻译 API                         |
| LibreTranslate           |     可选 | 开源服务，推荐自托管                 |
| DeepL                    |     需要 | DeepL 官方 API                       |
| Azure Translator         |     需要 | Azure 官方 API，需要 Key 和 Region   |
| Google Cloud Translation |     需要 | Google Cloud 官方 API                |
| 百度翻译                 |     需要 | AppId 和 Secret                      |
| 腾讯云 TMT               |     需要 | SecretId 和 SecretKey                |
| OpenAI Compatible        | 通常需要 | 兼容`/chat/completions` 的 AI 服务 |
| Ollama                   |       无 | 本机运行的模型                       |

默认内置并启用 Google Free、Bing Web 和 MyMemory。这三个内置项可以禁用，但不能删除。所有类型都可以重复添加，例如多个 LibreTranslate 服务、多个 OpenAI Compatible 接口，或额外的 Google Free、Bing Web、MyMemory。每个实例可单独命名，并显示为“名称 · 提供商”；参数和密钥互相独立。

> Google Free 与 Bing Web 并非官方公开 API，适合轻量使用，但不能保证稳定性。需要稳定服务时，请配置官方 API、自托管 LibreTranslate 或本地 Ollama。

## 设置

运行 `PolyLingo: Open Custom Settings` 可以：

- 启用或关闭翻译引擎
- 拖动引擎列表左侧的三横线调整优先级
- 添加、命名、删除自定义引擎实例；内置的三个仅可禁用
- 设置源语言、目标语言和默认引擎
- 测试每个引擎是否可用
- 保存 API Key、Region、模型名称等参数
- 配置代理、请求超时和划词浮窗延迟
- 在每个 OpenAI Compatible 或 Ollama 引擎实例中分别编辑 AI 翻译 Prompt

常用的原生 VS Code 配置示例：

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

`polyLingo.provider` 设置为 `auto` 时，PolyLingo 会从上到下依次尝试引擎列表中已启用且配置完整的实例。拖动每行左侧的三横线可调整优先级，顺序会自动保存。单独选定某个实例时，请求失败后不会切换到其他实例。实例请通过自定义设置页管理；不读取旧版按提供商划分的独立配置或密钥。

### 代理

全局“高级”中可以设置默认代理开关和默认代理地址。每个翻译引擎的“高级”还可以选择“继承默认设置”“为此引擎启用”或“为此引擎禁用”，单独配置始终优先于全局设置。

启用代理且代理地址留空时，按以下顺序查找地址：

1. `polyLingo.proxy`
2. VS Code 的 `http.proxy`
3. `HTTPS_PROXY` / `HTTP_PROXY` 环境变量
4. 操作系统代理（macOS、Windows 或 Linux GNOME）

### 请求超时

全局 **请求超时** 默认为 15000 毫秒。每个翻译引擎的 **高级设置** 可单独设置 **此引擎请求超时**（1000–600000 毫秒）；留空时沿用全局值。长文本可为耗时较长的引擎设置更高的值。

### API Key

请通过 PolyLingo 设置页或 `PolyLingo: Manage API Credentials` 保存凭据。敏感数据使用 VS Code `SecretStorage` 保存，请勿将 API Key 写入项目文件或 `settings.json`。

## 文档翻译

PolyLingo 提供两种模式：

- `smart`（默认）：Markdown 会保留 fenced code block；源代码只翻译识别到的整行注释，降低破坏代码的风险。
- `whole`：把整个文件作为普通文本翻译，适合纯文本，不建议用于源代码。

可以选择在新预览页中显示译文，也可以直接替换当前文档。直接替换前建议先保存或使用版本控制。

## AI 翻译与解释

启用并配置 OpenAI Compatible 或 Ollama 后，编辑器和终端菜单会出现 AI 翻译与解释入口。

OpenAI Compatible 示例：

```jsonc
{
  "polyLingo.openAI.enabled": true,
  "polyLingo.openAI.baseUrl": "https://api.openai.com/v1",
  "polyLingo.openAI.model": "gpt-4.1-mini"
}
```

本地 Ollama 示例：

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

内置 Prompt 会尽量保留代码、命令、路径、URL、标识符、API 名称、堆栈和 Markdown。每个 OpenAI Compatible 或 Ollama 实例都有自己的 Prompt；在该实例的“编辑”弹窗中可修改或恢复默认值。

## 常用命令

在命令面板中输入 `PolyLingo` 可以查看全部命令。

| 命令                            | 用途                  |
| ------------------------------- | --------------------- |
| Translate Selection             | 翻译编辑器选区        |
| Translate and Replace Selection | 翻译并替换选区        |
| Translate Terminal Selection    | 翻译终端选区          |
| Translate Clipboard             | 翻译剪贴板            |
| Translate Document to Preview   | 在预览页翻译文档      |
| Translate Document In Place     | 翻译并替换当前文档    |
| AI Translate and Explain        | 使用 AI 翻译并解释    |
| Select Translation Provider     | 切换翻译引擎          |
| Select Target Language          | 切换目标语言          |
| Open Custom Settings            | 打开 PolyLingo 自定义设置页 |

## 常见问题

### Google Free 测试返回 HTTP 429

这表示 Google 的非官方免费接口限制了当前网络/IP，并不代表目标语言配置错误。可以稍后重试、切换网络，或使用 `Auto` 模式自动尝试其他引擎。需要稳定的 Google 翻译服务时，请使用 Google Cloud Translation 并配置 API Key。

### 为什么 AI 菜单没有显示？

只有启用并正确配置 OpenAI Compatible 或 Ollama 后，AI 相关菜单才会显示。可以在设置页点击“测试”检查连接。

### 终端翻译为什么会访问剪贴板？

VS Code 没有公开通用的终端选区读取 API。PolyLingo 会短暂复制终端选区，并在读取后恢复原剪贴板内容。

## 隐私与安全

- PolyLingo 不内置或共享 API Key。
- 用户凭据保存在 VS Code `SecretStorage` 中。
- 最近 30 条翻译历史保存在本机 VS Code 扩展状态中，可在侧边栏随时清空。
- 待翻译文本会发送给当前选择的翻译服务。
- `openAI.extraHeaders` 是普通配置项，不应存放密钥。

## 本地开发

```bash
npm install
npm run typecheck
npm run compile
```

使用 VS Code 打开项目并按 `F5`，即可启动 Extension Development Host。

打包 VSIX：

```bash
npm run package
```

默认生成带本地时间戳的测试版本，例如 `poly-lingo-0.1.3-test-20260920105412.vsix`。如需在本地生成与 `package.json` 一致的正式版本：

```bash
npm run package:release
```

## 参与贡献

欢迎提交 Issue 和 Pull Request，包括：

- 修复翻译引擎兼容性问题
- 增加新的 Provider
- 改善翻译结果和交互体验
- 补充测试、文档与本地化

提交代码前请至少运行：

```bash
npm run typecheck
npm run compile
```

新增配置项或界面文案时，请同步更新 `package.nls*.json` 以及运行时语言资源。

## 已知限制

- 非官方网页接口可能因限流、风控或服务变更而失效。
- 智能文档翻译使用保守的行级注释识别，不是完整 AST 解析。
- 终端选区读取依赖 VS Code 内置复制命令。
- AI Provider 当前使用 Chat Completions 兼容接口。

## 反馈

可以通过 Issue 反馈问题，也可以发送邮件至 `xinghehy@qq.com`。

## License

MIT，详见仓库中的 `LICENSE` 文件。
