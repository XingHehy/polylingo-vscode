# Changelog

All notable changes to PolyLingo will be documented in this file.

## 0.1.0

- Added editor selection translation with an in-place Hover popup for both loading state and translated results.
- Added translate-and-replace, smart document translation, document preview, terminal selection translation, and clipboard translation.
- Added localized menus, commands, runtime UI, and settings for English, Simplified Chinese, Traditional Chinese, Japanese, and Korean.
- Added a dynamic PolyLingo settings panel where provider-specific configuration is shown only after that provider is enabled.
- Added per-provider availability testing with inline success/failure status and error details.
- Added Google Free, Bing Web, MyMemory, LibreTranslate, DeepL, Azure Translator, Google Cloud Translation, Baidu Translate, Tencent Cloud TMT, OpenAI Compatible, and Ollama providers.
- Added automatic provider fallback, proxy support, language selection, request timeout, document chunking, and optional automatic selection translation.
- Added secure API credential storage through VS Code SecretStorage.
- Added developer-focused AI translation/explanation with an editable built-in prompt shared by OpenAI Compatible and Ollama.
- AI translation/explanation menu items are hidden until an enabled AI provider is configured.
- Added feedback contact `xinghehy@qq.com`.
- Added configurable result locations: editor Hover, PolyLingo sidebar, bottom-right notification, and editor split.
- Added a dedicated movable PolyLingo sidebar translation workspace; terminal results now default to the sidebar.
- Added direct text input, source/target language selection, and persistent local translation history with restore/delete/clear actions.
