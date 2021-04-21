import * as vscode from 'vscode';

export function saveToken(token: string): Thenable<void> {
  const encoded = Buffer.from(token).toString('base64');

  return vscode.workspace
    .getConfiguration('fiora-for-vscode')
    .update('token', encoded, true);
}

export function getToken(): string | undefined {
  let oldToken = vscode.workspace
    .getConfiguration('fiora-for-vscode')
    .get<string>('token');
  if (typeof oldToken === 'string') {
    oldToken = Buffer.from(oldToken, 'base64').toString('utf8');
  }

  return oldToken;
}
