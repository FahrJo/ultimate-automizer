import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { UltimateByHttp } from '../../ultimateByHttp';

suite('UltimateByHttp Test Suite', () => {
    let extensionContext: vscode.ExtensionContext;

    suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        const extension = vscode.extensions.getExtension('FahrJo.ultimate-automizer');
        extensionContext = await extension?.activate();
    });

    test('requestOfValidFile', async () => {
        let ultimate = new UltimateByHttp(
            extensionContext,
            false,
            'monteverdi.informatik.uni-freiburg.de'
        );

        ultimate.runOn('');

        await new Promise((f) => setTimeout(f, 5000));

        let results = JSON.stringify(ultimate.getResultsOfLastRun().results[0]);

        const expectedResult =
            '{"startLNr":-1,"startCol":-1,"endLNr":-1,"endCol":-1,"logLvl":"info","shortDesc":"All specifications hold","type":"invariant","longDesc":"We were not able to verify any specifiation because the program does not contain any specification."}';

        assert.strictEqual(results, expectedResult);
        //assert.strictEqual(results.message, 'Program was proved to be correct');
        //assert.strictEqual(results.messageLine, 0);
        //assert.strictEqual(results.reason, null);
        //assert.strictEqual(results.reasonLine, null);
        //assert.match(results.resultString, /^---\sResults\s---.*/);
        //assert.match(results.resultString, /.*Received\sshutdown\srequest\.\.\.\n$/);
    }).timeout(10000);
});
