import * as vscode from 'vscode';

let channel: vscode.OutputChannel | null = null;
export function output(msg: string) {
  if (channel === null) {
    channel = vscode.window.createOutputChannel('Fiora');
  }

  channel.append(`${msg} \n`);
}
