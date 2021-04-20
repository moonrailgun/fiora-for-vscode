import * as vscode from 'vscode';
import { FioraGroupItem } from '../client';

interface FioraChatDataItem {
  parent?: FioraChatDataItem;
  name: string;
  unreadCount?: number;
  type: 'Container' | 'Item';
  icon?: string;
}

export class FioraChatDataProvider
  implements vscode.TreeDataProvider<FioraChatDataItem> {
  /**
   * Fiora 列表数据提供器
   */
  private _onDidChangeTreeData = new vscode.EventEmitter<FioraChatDataItem | void>();
  onDidChangeTreeData: vscode.Event<
    FioraChatDataItem | undefined | null | void
  > = this._onDidChangeTreeData.event;
  private groups: FioraGroupItem[] = [];
  private icons: Record<string, string> = {};

  constructor(private _context: vscode.ExtensionContext) {}

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
        return this.groups.map((group) => ({
          name: group.name,
          unreadCount: 0,
          type: 'Item',
          icon: this.icons[group._id],
        }));
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

    if (typeof element.icon === 'string') {
      treeItem.iconPath = element.icon;
    }

    return treeItem;
  }

  getParent(
    element: FioraChatDataItem
  ): vscode.ProviderResult<FioraChatDataItem> {
    return element ? element.parent : undefined;
  }

  setListData(groups: FioraGroupItem[]) {
    this.groups = groups;
    this.refresh();
  }

  setIcons(icons: Record<string, string>) {
    this.icons = icons;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}
