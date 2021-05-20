import * as vscode from 'vscode';
import { FioraClient, FioraMessageItem } from './client';
import { get } from 'lodash';
import { URL } from 'url';
import { unescape } from 'lodash';
import { generateShortTime } from './utils';

const outputChannels: Record<string, vscode.OutputChannel> = {};

/**
 * Get Message Time
 */
function getMessageTime(dateStr: string): string {
  const date = new Date(dateStr);

  return generateShortTime(date);
}

function formatMessage(client: FioraClient, msg: FioraMessageItem) {
  const sendTime = getMessageTime(msg.createTime);
  const senderName = msg.from.username;

  if (msg.type === 'text') {
    return `[${sendTime}] ${senderName}: ${unescape(msg.content)}`;
  } else if (msg.type === 'code') {
    const styledCode = msg.content
      .replace(/\n/g, '<br />')
      .replace(/^@language=([a-z]*?)@(.*?)$/m, '\n------$1\n$2\n------')
      .replace(/<br \/>/g, '\n');

    return `[${sendTime}] ${senderName}: ${styledCode}`;
  } else if (msg.type === 'image' && msg.content.startsWith('//')) {
    const url = client.serviceUrl ? new URL(client.serviceUrl) : null;
    const protocol = url?.protocol ?? 'https:';
    return `[${sendTime}] ${senderName}: ${protocol}${msg.content}`;
  }

  // Fallback
  return `[${sendTime}] ${senderName}: ${msg.content}`;
}

export function openConverseOutput(
  context: vscode.ExtensionContext,
  client: FioraClient,
  converseId: string,
  converseName: string
) {
  let outputChannel: vscode.OutputChannel = outputChannels[converseId];
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(
      `Fiora.converse.${converseName}[${converseId}]`
    );
    outputChannel.clear();
    outputChannels[converseId] = outputChannel;

    context.subscriptions.push(outputChannel);

    let channelId: string | undefined;
    if ((outputChannel as any)._channel !== undefined) {
      Promise.resolve((outputChannel as any)._channel).then((channelInfo) => {
        const id = get(channelInfo, ['_id', '_value']);
        if (typeof id === 'string') {
          channelId = id;
        }
      });
    }

    // Listen to message
    client.messageSub.event((msg) => {
      if (msg.to === converseId) {
        outputChannel.appendLine(formatMessage(client, msg));

        if (typeof channelId === 'string') {
          const findedTextEditor = vscode.window.visibleTextEditors.find(
            (editor) => editor.document.fileName === channelId
          );
          if (findedTextEditor !== undefined) {
            outputChannel.show(true);
          }
        }
      }
    });

    // Init old message
    client.messageList[converseId].forEach((msg) => {
      outputChannel.appendLine(formatMessage(client, msg));
    });
  }

  // client.sendTestMsg(); // For test

  outputChannel.show(true);
}
