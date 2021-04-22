import * as vscode from 'vscode';

const TOKEN_KEY = 'fiora-for-vscode.token';

export function saveToken(
  context: vscode.ExtensionContext,
  token: string
): Thenable<void> {
  const encoded = Buffer.from(token, 'utf8').toString('base64');

  return context.secrets.store(TOKEN_KEY, encoded);
}

export function getToken(
  context: vscode.ExtensionContext
): Thenable<string | undefined> {
  return context.secrets.get(TOKEN_KEY).then((token) => {
    if (typeof token === 'string') {
      token = Buffer.from(token, 'base64').toString('utf8');
    }

    return token;
  });
}
