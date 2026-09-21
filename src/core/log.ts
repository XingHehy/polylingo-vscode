import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel('PolyLingo');
  return channel;
}

export function logLine(message: string): void {
  getOutputChannel().appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
}

export function showOutput(): void {
  getOutputChannel().show(true);
}
