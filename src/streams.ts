import * as vscode from 'vscode';

const outputChannels: Record<string, vscode.OutputChannel> = {};

export function openConverseOutput(
  context: vscode.ExtensionContext,
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
  }

  outputChannel.show(true);
}
