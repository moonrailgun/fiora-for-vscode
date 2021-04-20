import * as IO from 'socket.io-client';
import * as vscode from 'vscode';
import { SealText, SealUserTimeout } from './const';
import { platform } from 'os';

export interface FioraGroupItem {
  _id: string;
  name: string;
  avatar: string;
  createTime: string;
  creator: string;
}

export interface FioraUserInfo {
  _id: string;
  avatar: string;
  username: string;
  tag: string;
  groups: FioraGroupItem[];
  friends: unknown[];
  token: string;
  isAdmin: boolean;
  notificationTokens: unknown[];
}

export class FioraClient {
  private _socket = IO('https://fiora.suisuijiang.com', {
    autoConnect: false,
    transports: ['websocket'],
    extraHeaders: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Origin: 'https://fiora.suisuijiang.com',
    },
  } as any);
  private isSeal = false;
  private _userInfo: FioraUserInfo | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this._socket.on('connect', () => {
      console.log('连接成功');
    });
    this._socket.on('connecting', () => {
      console.log('正在连接');
    });
    this._socket.on('reconnect', () => {
      console.log('重连成功');
    });
    this._socket.on('reconnecting', (data: any) => {
      console.log('重连中...', this._socket.io.uri, data);
    });
    this._socket.on('disconnect', () => {
      console.log('已断开连接');
    });
    this._socket.on('connect_failed', () => {
      console.log('连接失败');
    });
    this._socket.on('error', (data: any) => {
      console.log('网络出现异常', data);
    });
  }

  get isLogin(): boolean {
    return this._socket.connected && typeof this.userInfo === 'object';
  }

  get userInfo(): FioraUserInfo | null {
    return this._userInfo;
  }

  private emit(
    eventName: string,
    data: {},
    { toast = true } = {}
  ): Promise<[any, any]> {
    if (this._socket.connected === false) {
      this._socket.connect();
    }

    if (this.isSeal) {
      vscode.window.showErrorMessage(SealText);
      return Promise.resolve([SealText, null]);
    }

    return new Promise((resolve) => {
      this._socket.emit(eventName, data, (res: any) => {
        if (typeof res === 'string') {
          if (toast) {
            vscode.window.showErrorMessage(res);
          }
          /**
           * 服务端返回封禁状态后, 本地存储该状态
           * 用户再触发接口请求时, 直接拒绝
           */
          if (res === SealText) {
            this.isSeal = true;
            // 用户封禁和ip封禁时效不同, 这里用的短时间
            setTimeout(() => {
              this.isSeal = false;
            }, SealUserTimeout);
          }
          resolve([res, null]);
        } else {
          resolve([null, res]);
        }
      });
    });
  }

  async login(username: string, password: string) {
    const [err, user] = await this.emit('login', {
      username,
      password,
      os: platform(),
      browser: 'VSCode',
      environment: `Fiora for VSCode - v${this.context.extension.packageJSON.version}`,
    });

    if (err) {
      return null;
    }

    this._userInfo = user;

    return user;
  }

  close() {
    this._socket.close();
  }
}
