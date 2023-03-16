import * as assert from 'assert';
import 'mocha';
import * as fs from 'fs';
import * as path from 'path';


// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as ultimateExtension from '../../extension';


suite('UltimateResultParser Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	let extensionContext: vscode.ExtensionContext;

	suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        await vscode.extensions.getExtension('FahrJo.ultimate-automizer')?.activate();
        extensionContext = (global as any).testExtensionContext;
    });

	test('parsingOfSuccessfulTest', () => {
		// TODO
		//extensionContext.workspaceState.keys();
		assert.strictEqual(true, true);
	});


});
