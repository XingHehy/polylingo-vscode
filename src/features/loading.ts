import * as vscode from 'vscode';

/**
 * A lightweight non-notification loading indicator.
 * It uses an animated status-bar codicon so translation requests remain visible
 * without bringing back lower-right notification popups.
 */
export class LoadingIndicator implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 91);
  private readonly active = new Map<number, string>();
  private sequence = 0;

  async run<T>(message: string, task: () => Promise<T>): Promise<T> {
    const id = ++this.sequence;
    this.active.set(id, message);
    this.render();
    try {
      return await task();
    } finally {
      this.active.delete(id);
      this.render();
    }
  }

  private render(): void {
    const entries = [...this.active.entries()];
    const current = entries.length ? entries[entries.length - 1] : undefined;
    if (!current) {
      this.item.hide();
      return;
    }
    const message = current[1];
    this.item.text = `$(sync~spin) ${message}`;
    this.item.tooltip = message;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
