import * as vscode from 'vscode';

/**
 * @default false
 */
export function slientWhenSendMsg(): boolean {
  return (
    vscode.workspace
      .getConfiguration('fiora-for-vscode')
      .get('slientWhenSendMsg') ?? false
  );
}
