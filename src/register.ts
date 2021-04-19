import * as vscode from 'vscode';
import { getToken, saveToken } from './storage';

export function register(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('fiora-for-vscode.login', async () => {
      const oldToken = getToken();

      const token = await vscode.window.showInputBox({
        placeHolder: 'username:password',
        value: oldToken,
        prompt: '请输入 Fiora 的用户名密码, 格式为 username:password',
      });

      if (typeof token === 'string') {
        if (token.split(':').length !== 2) {
          vscode.window.showErrorMessage('请输入合法的用户名密码字符串');
          vscode.commands.executeCommand('fiora-for-vscode.login');
          return;
        }

        saveToken(token).then(() => {
          vscode.window.showInformationMessage('设置用户名密码成功');
        });
      }
    })
  );
}
