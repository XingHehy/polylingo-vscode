**English** | [简体中文](README.md) | [繁體中文](README.zh-TW.md)

# PolyLingo

A multi-engine translation extension for VS Code, built for developers.

Translate text directly in editors, terminals, and technical documentation, or use AI to translate and explain error logs. PolyLingo is not tied to a single service: it supports free endpoints, official APIs, OpenAI-compatible services, and local models.

## Features

- **Translate editor selections**: Show translations near the selection, then copy the result or replace the original text.
- **Automatic selection translation**: Start translating after the selection stops changing, with a configurable delay.
- **Terminal translation**: Translate command output, errors, and logs.
- **Document translation**: Supports Markdown, plain text, and source-code comments; Smart mode protects code blocks.
- **AI translation and explanation**: Understand technical content through an OpenAI-compatible service or Ollama.
- **Multiple engines with automatic fallback**: In `auto` mode, PolyLingo tries the next available engine when one fails.
- **Flexible result placement**: Choose a hover, sidebar, notification, or editor column for each workflow.
- **Translation workspace**: Enter text directly in the sidebar and browse local translation history.
- **Secure credentials**: API keys are stored in VS Code `SecretStorage`, never in `settings.json`.
- **Localized interface**: Supports Simplified Chinese, Traditional Chinese, English, Japanese, and Korean.

## Quick Start

### Installation

Download the `.vsix` file from the project releases, then choose the following command in VS Code:

```text
Extensions → … → Install from VSIX…
```

You can also install it from the command line:

```bash
code --install-extension poly-lingo-0.1.2.vsix
```

### First Use

1. Run `PolyLingo: Open Custom Settings` from the Command Palette.
2. Choose a target language and translation engine. The default `Auto` option tries enabled engines in order.
3. Select text in an editor, then use the keyboard shortcut or context menu to translate it.

Default shortcuts:

| Platform | Editor or terminal selection |
|---|---|
| macOS | `Cmd + Alt + T` |
| Windows / Linux | `Ctrl + Alt + T` |

To translate selections automatically, enable **Auto-translate selection** on the settings page.

## Translation Results

Editor translations appear in a hover near the selection by default, with actions to:

- Copy the translation
- Replace the original text
- Translate and explain with AI, when an AI engine is configured
- View the complete result in PolyLingo Output

You can choose where results appear:

| Context | Available locations | Default |
|---|---|---|
| Editor selection | Selection hover, PolyLingo sidebar, notification, editor column | Selection hover |
| Terminal | PolyLingo sidebar, notification, editor column | Sidebar |

VS Code does not provide a stable hover API for terminal selections, so selection hovers are unavailable in terminals. The sidebar displays the source text, translation, provider, and detected language, together with copy, AI explanation, and Output actions.

When a translation contains Markdown, editor hovers and the sidebar render headings, lists, tables, blockquotes, and code blocks; editor-column mode opens a Markdown preview. For safety, raw HTML, remote images, and command links are never executed.

### PolyLingo Sidebar

The sidebar lets you:

- Enter text, choose source and target languages, and translate directly
- Submit quickly with `Ctrl/Cmd + Enter`
- View the source, translation, provider, and detected language
- Copy the result, open Output, or continue with an AI explanation
- Keep the 30 most recent translations locally
- Restore or delete an entry, or clear the entire history

For compatibility with VS Code 1.98.2 and earlier, PolyLingo is registered in the left Activity Bar by default. Use **Move View** from the view menu, or drag it into the Secondary Side Bar. VS Code remembers the selected location.

## Supported Translation Engines

| Engine | Credentials | Type and notes |
|---|---:|---|
| Google Free | None | Unofficial endpoint; may be rate-limited or stop working |
| Bing Web | None | Unofficial web endpoint; may break when the website changes |
| MyMemory | None | Public translation API |
| LibreTranslate | Optional | Open-source service; self-hosting recommended |
| DeepL | Required | Official DeepL API |
| Azure Translator | Required | Official Azure API; requires a key and region |
| Google Cloud Translation | Required | Official Google Cloud API |
| Baidu Translate | Required | Requires AppId and Secret |
| Tencent Cloud TMT | Required | Requires SecretId and SecretKey |
| OpenAI Compatible | Usually required | AI service compatible with `/chat/completions` |
| Ollama | None | Models running locally |

Google Free, Bing Web, and MyMemory are enabled by default. Other engines must be enabled manually on the PolyLingo settings page.

> Google Free and Bing Web are not official public APIs. They are suitable for lightweight use, but availability is not guaranteed. For reliable service, configure an official API, a self-hosted LibreTranslate instance, or local Ollama.

## Settings

Run `PolyLingo: Open Custom Settings` to:

- Enable or disable translation engines
- Set the source language, target language, and default engine
- Test each engine
- Store API keys, regions, model names, and related parameters
- Configure the proxy, request timeout, and automatic-selection delay
- Edit the AI translation prompt

Common native VS Code settings:

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

### Auto Mode

When `polyLingo.provider` is set to `auto`, PolyLingo tries enabled and fully configured engines in the order specified by `polyLingo.providerOrder`. When you explicitly select one engine, PolyLingo does not switch providers after a failed request.

### Proxy

Proxy settings are resolved in this order:

1. `polyLingo.proxy`
2. VS Code `http.proxy`
3. The `HTTPS_PROXY` or `HTTP_PROXY` environment variable

### API Keys

Save credentials through the PolyLingo settings page or `PolyLingo: Manage API Credentials`. Sensitive values are stored in VS Code `SecretStorage`; do not place API keys in project files or `settings.json`.

## Document Translation

PolyLingo provides two modes:

- `smart` (default): Preserves fenced code blocks in Markdown and translates only recognized full-line comments in source files, reducing the risk of damaging code.
- `whole`: Translates the entire file as plain text. This is useful for plain-text files but is not recommended for source code.

You can show the translation in a new preview or replace the current document. Save the document or use version control before replacing it in place.

## AI Translation and Explanation

After you enable and configure OpenAI Compatible or Ollama, AI translation and explanation actions appear in editor and terminal menus.

OpenAI Compatible example:

```jsonc
{
  "polyLingo.openAI.enabled": true,
  "polyLingo.openAI.baseUrl": "https://api.openai.com/v1",
  "polyLingo.openAI.model": "gpt-4.1-mini"
}
```

Local Ollama example:

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

The built-in prompts aim to preserve code, commands, paths, URLs, identifiers, API names, stack traces, and Markdown. You can edit or restore them on the PolyLingo settings page.

## Commands

Enter `PolyLingo` in the Command Palette to see all available commands.

| Command | Purpose |
|---|---|
| Translate Selection | Translate the editor selection |
| Translate and Replace Selection | Translate and replace the selection |
| Translate Terminal Selection | Translate the terminal selection |
| Translate Clipboard | Translate clipboard content |
| Translate Document to Preview | Translate the document in a preview |
| Translate Document In Place | Translate and replace the current document |
| AI Translate and Explain | Translate and explain with AI |
| Select Translation Provider | Switch the translation engine |
| Select Target Language | Switch the target language |
| Open Custom Settings | Open the PolyLingo custom settings page |

## FAQ

### Google Free returns HTTP 429 during testing

Google's unofficial free endpoint has rate-limited the current network or IP address. This does not indicate an invalid target-language setting. Try again later, switch networks, or use `Auto` mode to try another engine automatically. For reliable Google translation, use Google Cloud Translation with an API key.

### Why are the AI actions missing?

AI actions appear only after OpenAI Compatible or Ollama is enabled and configured correctly. Use **Test** on the settings page to check the connection.

### Why does terminal translation access the clipboard?

VS Code does not expose a general-purpose API for reading terminal selections. PolyLingo briefly copies the terminal selection and restores the original clipboard contents after reading it.

## Privacy and Security

- PolyLingo does not include or share API keys.
- User credentials are stored in VS Code `SecretStorage`.
- The 30 most recent translations are stored in local VS Code extension state and can be cleared from the sidebar at any time.
- Text being translated is sent to the currently selected translation service.
- `openAI.extraHeaders` is a regular setting and should not contain secrets.

## Local Development

```bash
npm install
npm run typecheck
npm run compile
```

Open the project in VS Code and press `F5` to launch an Extension Development Host.

To package a VSIX:

```bash
npm run package
```

## Contributing

Issues and pull requests are welcome, including contributions that:

- Fix translation-engine compatibility
- Add a new provider
- Improve translation results and interactions
- Add tests, documentation, or localization

Before submitting code, run at least:

```bash
npm run typecheck
npm run compile
```

When adding settings or interface text, update both `package.nls*.json` and the runtime language resources.

## Known Limitations

- Unofficial web endpoints may fail because of rate limits, risk controls, or service changes.
- Smart document translation uses conservative line-based comment detection rather than a complete AST parser.
- Reading terminal selections depends on VS Code's built-in copy command.
- AI providers currently use a Chat Completions-compatible endpoint.

## Feedback

Open an issue or email `xinghehy@qq.com`.

## License

MIT. See the `LICENSE` file in this repository.
