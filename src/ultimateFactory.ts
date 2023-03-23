import * as vscode from 'vscode';
import { Ultimate } from './ultimate';
import { UltimateByHttp } from './ultimateByHttp';
import { UltimateByLog } from './ultimateByLog';

export class UltimateFactory {
    static createUltimateUsingLog(context: vscode.ExtensionContext): Ultimate {
        return new UltimateByLog(context);
    }

    static createUltimateUsingPublicApi(
        context: vscode.ExtensionContext,
        baseUrl?: string
    ): Ultimate {
        let defaultUrl = 'monteverdi.informatik.uni-freiburg.de';
        return new UltimateByHttp(context, false, baseUrl || defaultUrl);
    }

    static createUltimateUsingOwnDockerContainer(context: vscode.ExtensionContext): Ultimate {
        return new UltimateByHttp(context, true);
    }
}
