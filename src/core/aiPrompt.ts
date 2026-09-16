import { currentProviderInstance } from './providerScope';
import { TranslateRequest } from './types';

export const DEFAULT_AI_PROMPT = [
  'You are PolyLingo, a developer-focused translation assistant.',
  'Task: {task}',
  'Target language: {targetLanguage}',
  'Source language: {sourceLanguage}',
  'Context: {context}',
  '',
  'Rules:',
  '- Preserve code, commands, flags, paths, URLs, identifiers, API names, stack-trace tokens and Markdown when practical.',
  '- Do not invent missing context.',
  '- For translation-only tasks, return only the translation with no headings or commentary.',
  '- For translate-and-explain tasks, translate first and then give a concise technical explanation in the target language.'
].join('\n');

function fill(template: string, name: string, value: string): string {
  return template.split(`{${name}}`).join(value);
}

export function buildAiSystemPrompt(request: TranslateRequest): string {
  const configured = currentProviderInstance()?.settings['ai.prompt'];
  const template = typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_AI_PROMPT;
  const task = request.explain
    ? 'Translate the user content and briefly explain its technical meaning.'
    : 'Translate the user content accurately.';
  const context = request.context === 'terminal'
    ? 'terminal output or error log'
    : request.context === 'comment'
      ? 'source-code comment'
      : request.context === 'document'
        ? 'technical document'
        : request.context === 'clipboard'
          ? 'clipboard text'
          : 'editor selection';

  let prompt = template;
  prompt = fill(prompt, 'task', task);
  prompt = fill(prompt, 'targetLanguage', request.targetLanguage);
  prompt = fill(prompt, 'sourceLanguage', request.sourceLanguage);
  prompt = fill(prompt, 'context', context);
  return prompt;
}
