import * as vscode from 'vscode';
import { FioraGroupItem } from '../client';

export interface FioraChatViewTreeItem {
  parent?: FioraChatViewTreeItem;
  id?: string;
  name: string;
  unreadCount?: number;
  type: 'Container' | 'Item';
  icon?: string;
}

export class FioraChatDataProvider
  implements vscode.TreeDataProvider<FioraChatViewTreeItem> {
  /**
   * Fiora 列表数据提供器
   */
  private _onDidChangeTreeData = new vscode.EventEmitter<FioraChatViewTreeItem | void>();
  onDidChangeTreeData: vscode.Event<
    FioraChatViewTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;
  private groups: FioraGroupItem[] = [];
  private icons: Record<string, string> = {};
  private isEmpty = false;

  constructor(private _context: vscode.ExtensionContext) {}

  getChildren(
    element?: FioraChatViewTreeItem
  ): vscode.ProviderResult<FioraChatViewTreeItem[]> {
    if (this.isEmpty) {
      return null;
    }

    if (!element) {
      // Root
      return [
        { name: 'Group', unreadCount: 0, type: 'Container' },
        // { name: 'DM', unreadCount: 0, type: 'Container' },
      ];
    } else {
      if (element.name === 'Group') {
        // 列出群组
        return this.groups.map((group) => ({
          id: group._id,
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
    element: FioraChatViewTreeItem
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

    treeItem.contextValue = element.type;

    return treeItem;
  }

  getParent(
    element: FioraChatViewTreeItem
  ): vscode.ProviderResult<FioraChatViewTreeItem> {
    return element ? element.parent : undefined;
  }

  setListData(groups: FioraGroupItem[]) {
    this.groups = groups;
    this.refresh();
  }

  setIcons(icons: Record<string, string>) {
    this.icons = icons;
  }

  setIsEmpty(isEmpty = false) {
    this.isEmpty = isEmpty;
    this.refresh();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}
