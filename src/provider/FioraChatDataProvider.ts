import * as vscode from 'vscode';

interface FioraChatDataItem {
  parent?: FioraChatDataItem;
  name: string;
  unreadCount?: number;
  type: 'Container' | 'Item';
}

export class FioraChatDataProvider
  implements vscode.TreeDataProvider<FioraChatDataItem> {
  /**
   * Fiora 列表数据提供器
   */
  _context: vscode.ExtensionContext;
  _onDidChangeTreeData: vscode.EventEmitter<FioraChatDataItem>;
  onDidChangeTreeData: vscode.Event<
    FioraChatDataItem | undefined | null | void
  >;
  _icons: Record<string, string>;

  constructor(_context: vscode.ExtensionContext) {
    this._context = _context;

    this._onDidChangeTreeData = new vscode.EventEmitter<FioraChatDataItem>();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    this._icons = {};
  }

  getChildren(
    element?: FioraChatDataItem
  ): vscode.ProviderResult<FioraChatDataItem[]> {
    if (!element) {
      // Root
      return [
        { name: 'Group', unreadCount: 0, type: 'Container' },
        { name: 'DM', unreadCount: 0, type: 'Container' },
      ];
    } else {
      if (element.name === 'Group') {
        // 列出群组
        return [];
      } else if (element.name === 'DM') {
        // 列出私信
        return [
          {
            name: 'TODO',
            unreadCount: 0,
            type: 'Item',
          },
        ];
      }
    }

    return null;
  }

  getTreeItem(
    element: FioraChatDataItem
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const treeItem = new vscode.TreeItem(element.name);
    treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;

    if (element.type === 'Container') {
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }

    if (element.unreadCount && element.unreadCount > 0) {
      treeItem.label += ' (' + element.unreadCount + ')';
    }

    return treeItem;
  }

  getParent(
    element: FioraChatDataItem
  ): vscode.ProviderResult<FioraChatDataItem> {
    return element ? element.parent : undefined;
  }
}
