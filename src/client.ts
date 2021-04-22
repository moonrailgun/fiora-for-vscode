import * as IO from 'socket.io-client';
import * as vscode from 'vscode';
import { SealText, SealUserTimeout } from './const';
import { platform } from 'os';
import { output } from './logger';
import { once } from 'lodash';

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

export type FioraMessageType = 'text' | 'image' | 'code' | 'invite';

export interface FioraMessageItem {
  _id: string;
  createTime: string;
  from: Pick<FioraUserInfo, '_id' | 'tag' | 'username' | 'avatar'>;
  to: string;
  type: FioraMessageType;
  content: string;
}

export class FioraClient {
  serviceUrl = 'https://fiora.suisuijiang.com';
  private _socket = IO(this.serviceUrl, {
    autoConnect: false,
    transports: ['websocket'],
    extraHeaders: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Origin: this.serviceUrl,
    },
  } as any);
  private isSeal = false;
  private _userInfo: FioraUserInfo | null = null;
  messageList: Record<string, FioraMessageItem[]> = {};
  messageSub = new vscode.EventEmitter<FioraMessageItem>();
  stateSub = new vscode.EventEmitter<string>();

  constructor(private context: vscode.ExtensionContext) {
    this._socket.on('connect', () => {
      console.log('连接成功');
      this.stateSub.fire('connect');
    });
    this._socket.on('connecting', () => {
      console.log('正在连接');
      this.stateSub.fire('connecting');
    });
    this._socket.on('reconnect', () => {
      console.log('重连成功');
      this.stateSub.fire('reconnect');
    });
    this._socket.on('reconnecting', (data: any) => {
      console.log('重连中...', this._socket.io.uri, data);
      this.stateSub.fire('reconnecting');
    });
    this._socket.on('disconnect', () => {
      console.log('已断开连接');
      this.stateSub.fire('disconnect');
    });
    this._socket.on('connect_failed', () => {
      console.log('连接失败');
      this.stateSub.fire('connect_failed');
    });
    this._socket.on('error', (data: any) => {
      console.log('网络出现异常', data);
      this.stateSub.fire('error');
    });
  }

  get isConnected(): boolean {
    return this._socket.connected;
  }

  get isLogin(): boolean {
    return this._socket.connected && typeof this.userInfo === 'object';
  }

  get userInfo(): FioraUserInfo | null {
    return this._userInfo;
  }

  get os() {
    return platform();
  }

  get browser() {
    return 'VSCode';
  }

  get environment() {
    return `Fiora for VSCode - v${this.context.extension.packageJSON.version}`;
  }

  /**
   *
   * @returns [err, result]
   */
  private emit<T = any>(
    eventName: string,
    data: {},
    { toast = true } = {}
  ): Promise<[any, T | null]> {
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
          // Error
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

  async login(
    username: string,
    password: string
  ): Promise<FioraUserInfo | null> {
    const [err, user] = await this.emit<FioraUserInfo>('login', {
      username,
      password,
      os: this.os,
      browser: this.browser,
      environment: this.environment,
    });

    if (err) {
      return null;
    }

    this._userInfo = user;
    this.initListener();
    await this.fetchLinkmansLastMessagesV2(
      user?.groups.map((g) => g._id) ?? []
    );

    return user;
  }

  async loginByToken(token: string): Promise<FioraUserInfo | null> {
    const [err, user] = await this.emit<FioraUserInfo>(
      'loginByToken',
      {
        token,
        os: this.os,
        browser: this.browser,
        environment: this.environment,
      },
      { toast: false }
    );

    if (err) {
      output('loginByToken error:' + String(err));
      return null;
    }

    this._userInfo = user;
    this.initListener();
    await this.fetchLinkmansLastMessagesV2(
      user?.groups.map((g) => g._id) ?? []
    );

    return user;
  }

  /**
   * Just for test
   */
  sendTestMsg() {
    const message = {
      from: { username: 'test' } as any,
      to: '5adacdcfa109ce59da3e83d3', // for Fiora default group id
      content: 'This is a Test message',
    } as any;

    this.appendMessage(message.to, message);

    this.messageSub.fire(message);
  }

  initListener = once(() => {
    if (this._socket.connected !== true) {
      output('Init Listener failed, socket disconnected');
      return;
    }

    this._socket.on('message', (message: FioraMessageItem) => {
      // Received chat message
      this.appendMessage(message.to, message);
      this.messageSub.fire(message);

      output(JSON.stringify(message));
    });
  });

  appendMessage(to: string, message: FioraMessageItem) {
    if (!Array.isArray(this.messageList[to])) {
      this.messageList[to] = [];
    }
    this.messageList[to].push(message);
  }

  async fetchLinkmansLastMessagesV2(linkmanIds: string[]) {
    if (Array.isArray(linkmanIds) && linkmanIds.length > 0) {
      const [, data] = await this.emit<
        Record<
          string,
          {
            messages: FioraMessageItem[];
            unread: number;
          }
        >
      >('getLinkmansLastMessagesV2', {
        linkmans: linkmanIds,
      });

      Object.entries(data ?? {}).forEach(([linkmanId, lastMessages]) => {
        if (!Array.isArray(this.messageList[linkmanId])) {
          this.messageList[linkmanId] = [];
        }
        this.messageList[linkmanId].unshift(...lastMessages.messages);
      });
    }
  }

  /**
   * Send pure text message
   */
  async sendTextMessage(
    to: string,
    content: string,
    type: FioraMessageType = 'text'
  ) {
    const [error, message] = await this.emit<FioraMessageItem>('sendMessage', {
      to,
      type,
      content,
    });

    if (error === null && message !== null) {
      this.appendMessage(message.to, message);
      this.messageSub.fire(message);
    }
  }

  close() {
    this._socket.close();
  }
}
