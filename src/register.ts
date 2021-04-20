import * as vscode from 'vscode';
import type { FioraClient } from './client';
import { FioraChatDataProvider } from './provider/FioraChatDataProvider';
import { getToken, saveToken } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fetchIcon, urlExt } from './utils';

export function register(
  context: vscode.ExtensionContext,
  client: FioraClient
) {
  const provider = new FioraChatDataProvider(context);
  const fioraChatView = vscode.window.createTreeView('fiora-chat-view', {
    treeDataProvider: provider,
  });
  context.subscriptions.push(fioraChatView);
  const fioraChatExplorerView = vscode.window.createTreeView(
    'fiora-chat-view-explorer',
    { treeDataProvider: provider }
  );
  context.subscriptions.push(fioraChatExplorerView);

  function refresh() {
    if (!client.isLogin) {
      vscode.commands.executeCommand('fiora-for-vscode.login');
      return;
    }

    const groups = client.userInfo!.groups;
    let pending = groups.length;
    const icons: Record<string, string> = {};

    const storagePath = context.globalStorageUri?.fsPath ?? null;
    if (typeof storagePath === 'string' && !fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath);
    }

    if (typeof storagePath === 'string') {
      // has storage path and try to fetch icons
      function checkFinished() {
        --pending;
        if (pending === 0) {
          provider.setIcons(icons);
          provider.setListData(groups);
        }
      }

      groups.forEach((group) => {
        if (typeof group.avatar === 'string') {
          const groupId = group._id.toString();
          const filename = path.join(
            storagePath,
            'group_' + groupId + urlExt(group.avatar)
          );
          icons[groupId] = filename;
          fetchIcon(group.avatar, filename, checkFinished);
        } else {
          checkFinished();
        }
      });
    } else {
      // Dont fetch icon
      provider.setListData(groups);
    }
  }

  // Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('fiora-for-vscode.refresh', refresh)
  );

  // Login
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
