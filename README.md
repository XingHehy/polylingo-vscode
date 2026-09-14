[English](README.en.md) | **简体中文** | [繁體中文](README.zh-TW.md)

# PolyLingo

面向开发者的 VS Code 多引擎翻译扩展。

在编辑器、终端和技术文档中直接翻译文字，也可以使用 AI 翻译并解释错误日志。PolyLingo 不绑定单一服务：既支持免费接口，也支持官方 API、OpenAI 兼容服务和本地模型。

## 主要功能

- **编辑器划词翻译**：在选区附近显示译文，可复制或替换原文。
- **自动划词翻译**：选区停止变化后自动开始翻译，可配置延迟。
- **终端翻译**：翻译命令输出、报错和日志。
- **文档翻译**：支持 Markdown、纯文本和源代码注释；智能模式会保护代码块。
- **AI 翻译与解释**：通过 OpenAI Compatible 或 Ollama 理解技术内容。
- **多引擎与自动降级**：当前引擎失败后，`auto` 模式会尝试下一个可用引擎。
- **结果位置可选**：按使用场景选择浮窗、侧边栏、右下角通知或编辑器分栏。
- **翻译工作区**：在侧边栏直接输入文字翻译，并查看本地历史记录。
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
3. 在编辑器中选中文字，按快捷键或使用右键菜单翻译。

默认快捷键：

| 平台            | 编辑器或终端选区   |
| --------------- | ------------------ |
| macOS           | `Cmd + Alt + T`  |
| Windows / Linux | `Ctrl + Alt + T` |

如果希望选词后自动翻译，请在设置页启用 **划词后自动翻译**。

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

默认启用 Google Free、Bing Web 和 MyMemory。其他引擎需要在 PolyLingo 设置页中手动启用。

> Google Free 与 Bing Web 并非官方公开 API，适合轻量使用，但不能保证稳定性。需要稳定服务时，请配置官方 API、自托管 LibreTranslate 或本地 Ollama。

## 设置

运行 `PolyLingo: Open Custom Settings` 可以：

- 启用或关闭翻译引擎
- 设置源语言、目标语言和默认引擎
- 测试每个引擎是否可用
- 保存 API Key、Region、模型名称等参数
- 配置代理、请求超时和自动划词延迟
- 编辑 AI 翻译 Prompt

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
  "polyLingo.proxy": ""
}
```

### Auto 模式

`polyLingo.provider` 设置为 `auto` 时，PolyLingo 会按照 `polyLingo.providerOrder` 依次尝试已启用且配置完整的引擎。单独选定某个引擎时，请求失败后不会切换到其他引擎。

### 代理

代理按以下顺序读取：

1. `polyLingo.proxy`
2. VS Code 的 `http.proxy`
3. `HTTPS_PROXY` / `HTTP_PROXY` 环境变量

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

内置 Prompt 会尽量保留代码、命令、路径、URL、标识符、API 名称、堆栈和 Markdown。可以在 PolyLingo 设置页中修改或恢复默认值。

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
