import * as vscode from 'vscode';
import { Ultimate } from './ultimate';
import { UltimateFactory } from './ultimateFactory';

let ultimate: Ultimate;
let verifyOnSave: boolean;

// This method is called when the extension is activated
// The extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext): Promise<vscode.ExtensionContext> {
    initializeUltimate(context);

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (verifyOnSave) {
                ultimate.runOn(document);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('ultimate')) {
                ultimate.dispose();
                initializeUltimate(context);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ultimate-automizer.verifyFile', ultimateRunHandler)
    );

    return context;
}

function ultimateRunHandler(): void {
    if (vscode.window.activeTextEditor) {
        ultimate.runOn(vscode.window.activeTextEditor.document);
    }
}

// This method is called when your extension is deactivated
export function deactivate(): void {
    ultimate.dispose();
}

function initializeUltimate(context: vscode.ExtensionContext): void {
    let mode = vscode.workspace.getConfiguration().get('ultimate.mode');
    switch (mode) {
        case 'REST API':
            let ultimateUrl: string = vscode.workspace.getConfiguration().get('ultimate.url')!;
            ultimate = UltimateFactory.createUltimateUsingPublicApi(context, ultimateUrl);
            break;
        case 'stdout':
            let ultimatePath = vscode.Uri.file(
                vscode.workspace.getConfiguration().get('ultimate.executablePath')!
            );
            let settings = vscode.Uri.file(
                vscode.workspace.getConfiguration().get('ultimate.settingsPath')!
            );
            let toolchain = vscode.Uri.file(
                vscode.workspace.getConfiguration().get('ultimate.toolchainPath')!
            );
            ultimate = UltimateFactory.createUltimateUsingLog(
                context,
                ultimatePath,
                settings,
                toolchain
            );
            break;
        default:
            console.log('Invalid setting for "ultimate.mode"!');
    }

    verifyOnSave = vscode.workspace.getConfiguration().get('ultimate.verifyOnSave') || false;
}
