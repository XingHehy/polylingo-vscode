import * as vscode from 'vscode';
import { t } from '../core/i18n';
import { Secrets, SecretName } from '../core/secrets';

interface CredentialGroup {
  label: string;
  fields: Array<{ name: SecretName; prompt: string }>;
}

const GROUPS: CredentialGroup[] = [
  { label: 'LibreTranslate', fields: [{ name: 'libreTranslateApiKey', prompt: 'LibreTranslate API Key (self-hosted may not require one)' }] },
  { label: 'DeepL', fields: [{ name: 'deepLApiKey', prompt: 'DeepL API Key' }] },
  { label: 'Azure Translator', fields: [{ name: 'azureApiKey', prompt: 'Azure Translator API Key' }] },
  { label: 'Google Cloud Translation', fields: [{ name: 'googleCloudApiKey', prompt: 'Google Cloud Translation API Key' }] },
  { label: 'Baidu Translate', fields: [{ name: 'baiduAppId', prompt: 'Baidu AppId' }, { name: 'baiduSecret', prompt: 'Baidu Secret Key' }] },
  { label: 'Tencent Cloud TMT', fields: [{ name: 'tencentSecretId', prompt: 'Tencent SecretId' }, { name: 'tencentSecretKey', prompt: 'Tencent SecretKey' }] },
  { label: 'OpenAI-compatible', fields: [{ name: 'openAIApiKey', prompt: 'API Key (optional for local endpoints)' }] }
];

export async function manageCredentials(secrets: Secrets): Promise<void> {
  const items: Array<vscode.QuickPickItem & { group?: CredentialGroup; action?: 'set' | 'clear' }> = [];
  for (const group of GROUPS) {
    items.push({
      label: `$(key) ${t('credentials.set', { provider: group.label })}`,
      description: t('credentials.secretStorage'),
      group,
      action: 'set'
    });
    items.push({ label: `$(trash) ${t('credentials.clear', { provider: group.label })}`, group, action: 'clear' });
  }
  const picked = await vscode.window.showQuickPick(items, { placeHolder: t('credentials.managePlaceholder') });
  if (!picked?.group || !picked.action) return;

  if (picked.action === 'clear') {
    for (const field of picked.group.fields) await secrets.delete(field.name);
    vscode.window.showInformationMessage(t('credentials.cleared', { provider: picked.group.label }));
    return;
  }

  for (const field of picked.group.fields) {
    const value = await vscode.window.showInputBox({
      prompt: field.prompt,
      password: true,
      ignoreFocusOut: true,
      placeHolder: t('credentials.inputPlaceholder')
    });
    if (value === undefined) return;
    if (value.trim()) await secrets.set(field.name, value.trim());
  }
  vscode.window.showInformationMessage(t('credentials.saved', { provider: picked.group.label }));
}
