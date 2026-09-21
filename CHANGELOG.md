# Changelog

All notable changes to PolyLingo will be documented in this file.

## 0.1.4
- Kept HTTP failures in the log without automatically opening the Output panel during provider fallback.

## 0.1.3

- Removed Google Free and Bing Web from Add engine because they already exist as built-in instances.
- Made sidebar AI translation and explanation reuse the result's original text instead of requiring a new terminal selection.
- Added explicit Save actions to engine editors, masked saved API keys, OpenAI-compatible model discovery, and collapsed advanced fields for Temperature and extra headers.
- Added a dedicated model-loading error message for OpenAI-compatible model discovery.
- Added global and per-engine proxy controls under Advanced settings; engine-level inherit, enable, or disable choices override the global default.
- Made enabled proxy policies fail with a clear configuration error when neither an engine nor default proxy URL is available, instead of silently using a direct connection.
- Added operating system proxy discovery for macOS, Windows, and Linux GNOME when an enabled engine or global proxy policy has no explicit URL.
- Added privacy-safe HTTP request logs to the PolyLingo Output panel, including the endpoint, effective proxy, status, duration, and failures.
- Replaced Node's `http`/`https` request path with PolyLingo's own TCP/TLS HTTP transport, preserving hostnames, Host headers, SNI, certificate validation, and explicit HTTP/HTTPS proxy behavior without using the extension host's global agents.
- Stopped editor and Output-panel text selections from automatically replacing the sidebar input.
- Added confirmation before deleting custom engines and improved settings footer layout.

## 0.1.2

- Reworked translation engines as named instances. The same provider can be added multiple times, with independent settings and securely stored credentials.
- Kept Google Free, Bing Web, and MyMemory as built-in instances that can be disabled but not deleted; additional instances of all three can still be added.
- Replaced the always-expanded engine settings with a compact list and bottom-sheet dialogs for adding or editing an engine.
- Added drag handles to reorder engines. In Auto mode, enabled engines are tried from top to bottom; the list order is saved automatically.
- Moved the AI translation prompt into each OpenAI Compatible and Ollama instance so prompts are no longer shared globally.
- Added engine selection to the sidebar and displayed custom instance names as `name · provider` throughout the UI.
- Added a settings button to the sidebar title and version, feedback email, and GitHub links to the settings panel.
- Improved selection Hover states: manual translation can be started from the selection popup, and translation failures are shown there instead of leaving a stale loading message.
- Configuration note: legacy per-provider settings and credentials are not migrated to engine instances; configure each instance again in the settings panel.

## 0.1.1

- Added a dedicated PolyLingo icon for the Extensions view.
- Added an **Open Custom Settings** action to the extension manage menu for direct access to the PolyLingo custom settings panel.
- Added safe Markdown rendering for Hover and sidebar results, plus automatic Markdown Preview for editor-column results.

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
