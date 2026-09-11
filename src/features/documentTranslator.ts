import * as vscode from 'vscode';
import { getSetting, getSourceLanguage, getTargetLanguage } from '../core/config';
import { TranslationManager } from '../core/manager';

const CODE_LANGUAGE_IDS = new Set([
  'javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'php', 'ruby', 'shellscript', 'powershell', 'kotlin', 'swift', 'scala', 'dart', 'lua', 'perl',
  'sql', 'r', 'groovy', 'objective-c', 'objective-cpp', 'vue', 'svelte'
]);

function protectInlineTokens(text: string): { text: string; restore: (translated: string) => string } {
  const values: string[] = [];
  const protectedText = text.replace(/(`[^`\n]+`|https?:\/\/[^\s)>\]}]+|\b[A-Za-z]:\\[^\s]+|\/[A-Za-z0-9_./-]+\b)/g, (value) => {
    const id = `ZXQTOKEN${String(values.length).padStart(4, '0')}QXZ`;
    values.push(value);
    return id;
  });
  return {
    text: protectedText,
    restore: (translated) => values.reduce((acc, value, index) => {
      const id = `ZXQTOKEN${String(index).padStart(4, '0')}QXZ`;
      return acc.split(id).join(value);
    }, translated)
  };
}

async function translateBlock(manager: TranslationManager, text: string, context: 'document' | 'comment'): Promise<string> {
  if (!text.trim()) return text;
  const protectedBlock = protectInlineTokens(text);
  const result = await manager.translate({
    text: protectedBlock.text,
    sourceLanguage: getSourceLanguage(),
    targetLanguage: getTargetLanguage(),
    context
  });
  return protectedBlock.restore(result.text);
}

async function translateMarkdown(manager: TranslationManager, text: string): Promise<string> {
  const lines = text.split(/(\r?\n)/);
  let inFence = false;
  let pending = '';
  let output = '';
  const chunkChars = getSetting('document.chunkChars', 3500);

  const flush = async () => {
    if (!pending) return;
    output += await translateBlock(manager, pending, 'document');
    pending = '';
  };

  for (let i = 0; i < lines.length; i += 2) {
    const line = lines[i] || '';
    const newline = lines[i + 1] || '';
    if (/^\s*(```|~~~)/.test(line)) {
      await flush();
      inFence = !inFence;
      output += line + newline;
      continue;
    }
    if (inFence || /^\s*<\/?(script|style|pre|code)\b/i.test(line)) {
      await flush();
      output += line + newline;
      continue;
    }
    if (pending.length + line.length + newline.length > chunkChars) await flush();
    pending += line + newline;
  }
  await flush();
  return output;
}

async function translateCodeComments(manager: TranslationManager, text: string): Promise<string> {
  const lines = text.split('\n');
  const result: string[] = [];
  let inBlockComment = false;

  for (const line of lines) {
    const fullLine = line.match(/^(\s*)(\/\/\/|\/\/|#|--|;)\s?(.*)$/);
    const blockStart = line.match(/^(\s*)\/\*+\s?(.*)$/);
    const blockMiddle = line.match(/^(\s*)\*\s?(.*)$/);

    if (fullLine && fullLine[3].trim()) {
      const translated = await translateBlock(manager, fullLine[3], 'comment');
      result.push(`${fullLine[1]}${fullLine[2]} ${translated}`);
      continue;
    }
    if (blockStart) {
      inBlockComment = !line.includes('*/');
      const body = blockStart[2].replace(/\s*\*\/\s*$/, '');
      if (body.trim()) {
        const translated = await translateBlock(manager, body, 'comment');
        result.push(`${blockStart[1]}/* ${translated}${line.includes('*/') ? ' */' : ''}`);
      } else {
        result.push(line);
      }
      continue;
    }
    if (inBlockComment && blockMiddle) {
      const closes = /\*\/\s*$/.test(blockMiddle[2]);
      const body = blockMiddle[2].replace(/\s*\*\/\s*$/, '');
      const translated = body.trim() ? await translateBlock(manager, body, 'comment') : body;
      result.push(`${blockMiddle[1]}* ${translated}${closes ? ' */' : ''}`);
      if (closes) inBlockComment = false;
      continue;
    }
    result.push(line);
  }
  return result.join('\n');
}

export async function translateDocumentText(manager: TranslationManager, document: vscode.TextDocument): Promise<string> {
  const text = document.getText();
  const mode = getSetting<'smart' | 'whole'>('document.mode', 'smart');
  if (mode === 'whole') {
    return (await manager.translate({
      text,
      sourceLanguage: getSourceLanguage(),
      targetLanguage: getTargetLanguage(),
      context: 'document'
    })).text;
  }
  if (CODE_LANGUAGE_IDS.has(document.languageId)) return translateCodeComments(manager, text);
  return translateMarkdown(manager, text);
}
