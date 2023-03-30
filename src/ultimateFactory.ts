import * as vscode from 'vscode';
import { Ultimate } from './ultimate';
import { UltimateByHttp } from './ultimateByHttp';
import { UltimateByLog } from './ultimateByLog';

export class UltimateFactory {
    static createUltimateUsingLog(
        context: vscode.ExtensionContext,
        executable: vscode.Uri,
        settings: vscode.Uri,
        toolchain: vscode.Uri
    ): Ultimate {
        return new UltimateByLog(context, executable, settings, toolchain);
    }

    static createUltimateUsingPublicApi(
        context: vscode.ExtensionContext,
        baseUrl?: string
    ): Ultimate {
        let defaultUrl = 'https://monteverdi.informatik.uni-freiburg.de';
        return new UltimateByHttp(context, false, baseUrl || defaultUrl);
    }

    static createUltimateUsingOwnDockerContainer(context: vscode.ExtensionContext): Ultimate {
        return new UltimateByHttp(context, true);
    }
}
