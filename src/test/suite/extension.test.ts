import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
//import * as ultimateExtension from '../../extension';

suite('Ultimate Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	let extensionContext: vscode.ExtensionContext;

	suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        const extension = vscode.extensions.getExtension('FahrJo.ultimate-automizer');
		extensionContext = await extension?.activate();
    });

	test('outputChannelsSubscribedTest', () => {
		// TODO
		let logSubscriberOk = false;
		let outSubscriberOk = false;

		extensionContext.subscriptions.forEach( (subscription) => {
			if (isOutputChannel(subscription)) {
				logSubscriberOk = (subscription.name.match(/^Ultimate Log$/) ? true : logSubscriberOk);
				outSubscriberOk = (subscription.name.match(/^Ultimate Results$/) ? true : outSubscriberOk);
			}
		});
		
		//extensionContext.workspaceState.keys();
		assert.strictEqual(logSubscriberOk, true);
		assert.strictEqual(outSubscriberOk, true);
	});
});

function isOutputChannel(obj: any | vscode.OutputChannel): obj is vscode.OutputChannel {
	return 'name' in obj;
}
