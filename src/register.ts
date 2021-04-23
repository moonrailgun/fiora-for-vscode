import * as vscode from 'vscode';
import type { FioraClient } from './client';
import {
  FioraChatViewTreeItem,
  FioraChatDataProvider,
} from './provider/FioraChatDataProvider';
import { getToken, saveToken } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import { fetchIcon, urlExt } from './utils';
import { openConverseOutput } from './streams';
import { output } from './logger';

export function register(
  context: vscode.ExtensionContext,
  client: FioraClient
) {
  const provider = new FioraChatDataProvider(context);
  client.stateSub.event((state: string) => {
    output(`网络状态变更: ${state}`);

    if (!client.isConnected) {
      provider.setIsEmpty(true);
    } else {
      provider.setIsEmpty(false);
    }
  });

  const fioraChatView = vscode.window.createTreeView('fiora-chat-view', {
    treeDataProvider: provider,
  });
  let currentSelectedConverseItem: FioraChatViewTreeItem | null = null;

  function openConverse(converseInfo: FioraChatViewTreeItem) {
    if (typeof converseInfo.id === 'string') {
      currentSelectedConverseItem = converseInfo;
      openConverseOutput(context, client, converseInfo.id, converseInfo.name);
    }
  }

  function selectionChanged(
    e: vscode.TreeViewSelectionChangeEvent<FioraChatViewTreeItem>
  ) {
    const firstSelection = e.selection[0];
    if (typeof firstSelection === 'object') {
      if (
        firstSelection.type === 'Item' &&
        typeof firstSelection.id === 'string'
      ) {
        openConverse(firstSelection);
      }
    }
  }

  context.subscriptions.push(fioraChatView);
  context.subscriptions.push(
    fioraChatView.onDidChangeSelection(selectionChanged)
  );

  const fioraChatExplorerView = vscode.window.createTreeView(
    'fiora-chat-view-explorer',
    { treeDataProvider: provider }
  );
  context.subscriptions.push(fioraChatExplorerView);
  context.subscriptions.push(
    fioraChatExplorerView.onDidChangeSelection(selectionChanged)
  );

  function refresh() {
    if (!client.isLogin) {
      vscode.commands.executeCommand('fiora-for-vscode.login');
      output('尚未登录');
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
      const token = await vscode.window.showInputBox({
        placeHolder: 'username:password',
        prompt: '请输入 Fiora 的用户名密码, 格式为 username:password',
      });

      if (typeof token === 'string') {
        if (token.split(':').length !== 2) {
          vscode.window.showErrorMessage('请输入合法的用户名密码字符串');
          vscode.commands.executeCommand('fiora-for-vscode.login');
          return;
        }

        const [username, password] = token.split(':');
        const user = await client.login(username, password);

        if (user !== null) {
          saveToken(context, user.token);
          vscode.commands.executeCommand('fiora-for-vscode.refresh');
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fiora-for-vscode.sendMessage',
      async (selectedItem?: FioraChatViewTreeItem) => {
        const target = selectedItem ?? currentSelectedConverseItem ?? null;

        if (target === null) {
          vscode.window.showErrorMessage('请先选择一个发送方');
          return;
        }

        if (typeof target.id !== 'string') {
          vscode.window.showErrorMessage('会话数据异常');
          return;
        }

        const message = await vscode.window.showInputBox({
          placeHolder: '随便聊点啥吧',
          prompt: `发送消息到 ${target.name}`,
        });
        if (typeof message === 'string') {
          await client.sendTextMessage(target.id, message);
          vscode.window.showInformationMessage('发送成功');
          openConverse(target);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fiora-for-vscode.sendSelectionMessage',
      () => {
        const target = currentSelectedConverseItem ?? null;

        if (target === null) {
          vscode.window.showErrorMessage('请先选择一个发送方');
          return;
        }

        if (typeof target.id !== 'string') {
          vscode.window.showErrorMessage('会话数据异常');
          return;
        }

        if (!vscode.window.activeTextEditor) {
          vscode.window.showErrorMessage('需要激活文本编辑窗口才能使用该功能');
          return;
        }
        const code = vscode.window.activeTextEditor.document.getText(
          vscode.window.activeTextEditor.selection
        );
        if (code === '') {
          vscode.window.showErrorMessage('需要选中文本');
          return;
        }

        const language = vscode.window.activeTextEditor.document.languageId;
        const message = `@language=${language}@${code}`;

        if (typeof code === 'string') {
          client.sendTextMessage(target.id, message, 'code');
          vscode.window.showInformationMessage('发送成功');
          openConverse(target);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('fiora-for-vscode.openWebsite', () => {
      vscode.env.openExternal(vscode.Uri.parse(client.serviceUrl));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('fiora-for-vscode.connect', async () => {
      // Connect means relogin
      const token = await getToken(context);
      if (typeof token === 'string') {
        const user = await client.loginByToken(token);

        if (user !== null) {
          vscode.commands.executeCommand('fiora-for-vscode.refresh');
          return;
        }
      }

      vscode.commands.executeCommand('fiora-for-vscode.login');
    })
  );
}
