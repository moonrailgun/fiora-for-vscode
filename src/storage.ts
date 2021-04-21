import * as vscode from 'vscode';

export function saveToken(token: string): Thenable<void> {
  const encoded = Buffer.from(token, 'utf8').toString('base64');

  return vscode.workspace
    .getConfiguration('fiora-for-vscode')
    .update('token', encoded, true);
}

export function getToken(): string | undefined {
  let token = vscode.workspace
    .getConfiguration('fiora-for-vscode')
    .get<string>('token');
  if (typeof token === 'string') {
    token = Buffer.from(token, 'base64').toString('utf8');
  }

  return token;
}
