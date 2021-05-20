import * as vscode from 'vscode';
import { generateShortTime } from './utils';

let channel: vscode.OutputChannel | null = null;
export function output(msg: string) {
  if (channel === null) {
    channel = vscode.window.createOutputChannel('Fiora');
  }

  channel.append(`[${generateShortTime()}] ${msg} \n`);
}
