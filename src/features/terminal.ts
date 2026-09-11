import * as vscode from 'vscode';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readTerminalSelection(): Promise<string> {
  const previous = await vscode.env.clipboard.readText();
  const marker = `__SMART_TRANSLATOR_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
  try {
    await vscode.env.clipboard.writeText(marker);
    await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
    await delay(60);
    const selected = await vscode.env.clipboard.readText();
    if (!selected || selected === marker) {
      throw new Error('No terminal text is selected. Select terminal text first, then run the command.');
    }
    return selected;
  } finally {
    await vscode.env.clipboard.writeText(previous);
  }
}
