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
            'https://monteverdi.informatik.uni-freiburg.de'
        );
        ultimate.runOn('');

        await new Promise((f) => setTimeout(f, 5000));

        let results = JSON.stringify(ultimate.getResultsOfLastRun().results[0]);
        const expectedResult =
            '{"startLNr":-1,"startCol":-1,"endLNr":-1,"endCol":-1,"logLvl":"info","shortDesc":"All specifications hold","type":"invariant","longDesc":"We were not able to verify any specifiation because the program does not contain any specification."}';
        assert.strictEqual(results, expectedResult);
    }).timeout(10000);

    test('requestOfSyntaxError', async () => {
        let ultimate = new UltimateByHttp(
            extensionContext,
            false,
            'https://monteverdi.informatik.uni-freiburg.de'
        );
        ultimate.runOn('a');

        await new Promise((f) => setTimeout(f, 5000));

        let results = JSON.stringify(ultimate.getResultsOfLastRun().results[0]);
        const expectedResult =
            '{"startLNr":-1,"startCol":0,"endLNr":0,"endCol":0,"logLvl":"error","shortDesc":"Incorrect Syntax","type":"syntaxError","longDesc":"Syntax check with command \\"gcc -std=c11 -pedantic -w -fsyntax-only\\" returned the following output. \\n:1:1: error: expected \\u0018=\\u0019, \\u0018,\\u0019, \\u0018;\\u0019, \\u0018asm\\u0019 or \\u0018__attribute__\\u0019 at end of input\\n    1 | a\\n      | ^"}';
        assert.strictEqual(results, expectedResult);
    }).timeout(10000);
});
