// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FioraClient } from './client';
import { output } from './logger';
import { register } from './register';
import { getToken } from './storage';

let client: FioraClient;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  output('Congratulations, your extension "fiora-for-vscode" is now active!');

  client = new FioraClient(context);
  setTimeout(async () => {
    const token = await getToken(context);

    if (typeof token === 'string') {
      // Auto Login after 1 second
      output(`正在自动登录`);

      const user = await client.loginByToken(token);

      if (user !== null) {
        output('自动登录成功');
        // TODO: fiora not provide a API for token renew
        // saveToken(user.token);
        vscode.commands.executeCommand('fiora-for-vscode.refresh');
      } else {
        output('自动登录失败');
      }
    }
  }, 1000);

  register(context, client);
}

// this method is called when your extension is deactivated
export function deactivate() {
  if (client !== null && client instanceof FioraClient) {
    client.close();
  }
}
