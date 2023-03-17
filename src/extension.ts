// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Ultimate, VerificationTool } from './ultimate';

let ultimate: VerificationTool;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext): Promise<vscode.ExtensionContext> {
	// Set context as a global as some tests depend on it
    (global as any).testExtensionContext = context;
	ultimate = new Ultimate(context);
	
	if (vscode.window.activeTextEditor) {
		ultimate.runOn(vscode.window.activeTextEditor.document);
	}

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
		ultimate.runOn(document);
	}));

	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ultimate-automizer.startDockerContainer', ultimate.setup());

	context.subscriptions.push(disposable);

	return context;
}


// This method is called when your extension is deactivated
export function deactivate() {
	ultimate.dispose();
}
