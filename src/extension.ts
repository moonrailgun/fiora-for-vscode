// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FioraClient } from './client';
import { output } from './logger';
import { register } from './register';
import { getToken } from './storage';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  output('Congratulations, your extension "fiora-for-vscode" is now active!');

  register(context);

  const client = new FioraClient();
  setTimeout(async () => {
    const token = getToken();

    if (typeof token === 'string') {
      const [username, password] = token.split(':');

      output(`正在尝试登录账号 ${username}`);

      const user = await client.login(username, password);

      output(JSON.stringify(user));
    }
  }, 1000);
}

// this method is called when your extension is deactivated
export function deactivate() {}
