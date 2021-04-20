import * as vscode from 'vscode';
import { FioraClient } from './client';

const outputChannels: Record<string, vscode.OutputChannel> = {};

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

    // Listen to message
    client.messageSub.event((msg) => {
      if (msg.to === converseId) {
        outputChannel.appendLine(`[${msg.from.username}]: ${msg.content}`);
      }
    });

    // Init old message
    client.messageList[converseId].forEach((msg) => {
      outputChannel.appendLine(`[${msg.from.username}]: ${msg.content}`);
    });
  }
  client.sendTestMsg(); // For test

  outputChannel.show(true);
}
