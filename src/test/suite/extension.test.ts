import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Ultimate Extension Test Suite', () => {
    let extensionContext: vscode.ExtensionContext;

    suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        const extension = vscode.extensions.getExtension('FahrJo.ultimate-automizer');
        extensionContext = await extension?.activate();
    });

    test('outputChannelsSubscribedTest', () => {
        let logSubscriberOk = false;
        let outSubscriberOk = false;

        extensionContext.subscriptions.forEach((subscription) => {
            if (isOutputChannel(subscription)) {
                logSubscriberOk = subscription.name.match(/^Ultimate Log$/)
                    ? true
                    : logSubscriberOk;
                outSubscriberOk = subscription.name.match(/^Ultimate Results$/)
                    ? true
                    : outSubscriberOk;
            }
        });

        assert.strictEqual(logSubscriberOk, true);
        assert.strictEqual(outSubscriberOk, true);
    });
});

function isOutputChannel(obj: any | vscode.OutputChannel): obj is vscode.OutputChannel {
    return 'name' in obj;
}
