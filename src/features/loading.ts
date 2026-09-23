import * as vscode from 'vscode';

/** Shows request progress in the status bar and, when needed, a notification. */
export class LoadingIndicator implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 91);
  private readonly active = new Map<number, string>();
  private sequence = 0;

  async run<T>(message: string, task: () => Promise<T>, notification = false): Promise<T> {
    const id = ++this.sequence;
    this.active.set(id, message);
    this.render();
    try {
      return notification
        ? await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: message }, task)
        : await task();
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
