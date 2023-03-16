import * as assert from 'assert';
import * as fs from 'fs';

import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import {UltimateResultParser} from '../../ultimate';

suite('UltimateResultParser Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('parsingOfSuccessfulTest', () => {
		let logResult = fs.readFileSync(`${__dirname}/../fixtures/ultimateLogSucceed.log`).toString();
		
		let parser = new UltimateResultParser(logResult);

		assert.strictEqual(parser.provedSuccessfully, true);
		assert.strictEqual(parser.message, 'Program was proved to be correct');
		assert.strictEqual(parser.messageLine, 0);
		assert.strictEqual(parser.reason, null);
		assert.strictEqual(parser.reasonLine, null);
		assert.match(parser.resultString, /^---\sResults\s---.*/);
		assert.match(parser.resultString, /.*Received\sshutdown\srequest\.\.\.\n$/);
	});

	test('parsingOfSyntaxError', () => {
		let logResult = fs.readFileSync(`${__dirname}/../fixtures/ultimateLogSyntaxError.log`).toString();
		
		let parser = new UltimateResultParser(logResult);

		assert.strictEqual(parser.provedSuccessfully, false);
		assert.strictEqual(parser.message, 'Unsupported Syntax');
		assert.strictEqual(parser.messageLine, 48);
		assert.strictEqual(parser.reason, null);
		assert.strictEqual(parser.reasonLine, null);
		assert.match(parser.resultString, /^---\sResults\s---.*/);
		assert.match(parser.resultString, /.*Received\sshutdown\srequest\.\.\.\n$/);
	});

	test('parsingOfVerificationError', () => {
		let logResult = fs.readFileSync(`${__dirname}/../fixtures/ultimateLogVerificationError.log`).toString();
		
		let parser = new UltimateResultParser(logResult);

		assert.strictEqual(parser.provedSuccessfully, false);
		assert.strictEqual(parser.message, 'Unable to prove that assertion always holds');
		assert.strictEqual(parser.messageLine, 62);
		assert.strictEqual(parser.reason, 'overapproximation of large string literal at line 110');
		assert.strictEqual(parser.reasonLine, 109);
		assert.match(parser.resultString, /^---\sResults\s---.*/);
		assert.match(parser.resultString, /.*Received\sshutdown\srequest\.\.\.\n$/);
	});
});
