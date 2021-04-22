import * as vscode from 'vscode';
import { FioraClient, FioraMessageItem } from './client';
import { get } from 'lodash';
import { URL } from 'url';

const outputChannels: Record<string, vscode.OutputChannel> = {};

function formatMessage(client: FioraClient, msg: FioraMessageItem) {
  if (msg.type === 'image' && msg.content.startsWith('//')) {
    const url = client.serviceUrl ? new URL(client.serviceUrl) : null;
    const protocol = url?.protocol ?? 'https:';
    return `[${msg.from.username}]: ${protocol}${msg.content}`;
  }
  return `[${msg.from.username}]: ${msg.content}`;
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
