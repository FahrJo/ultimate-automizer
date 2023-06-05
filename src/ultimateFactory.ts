import * as vscode from 'vscode';
import { Ultimate } from './ultimate';
import { UltimateByHttp } from './ultimateByHttp';
import { UltimateByLog } from './ultimateByLog';

const publicKnownAPIs = [
    'https://ultimate.sopranium.de/api',
    'https://monteverdi.informatik.uni-freiburg.de',
];

export class UltimateFactory {
    static createUltimateUsingLog(
        context: vscode.ExtensionContext,
        executable: vscode.Uri,
        settings: vscode.Uri,
        toolchain: vscode.Uri
    ): Ultimate {
        let newUltimateInstance = new UltimateByLog(context, executable, settings, toolchain);
        return newUltimateInstance;
    }

    static createUltimateUsingRestApi(
        context: vscode.ExtensionContext,
        apiUrl: string,
        settings: vscode.Uri,
        toolchain: vscode.Uri
    ): Ultimate {
        let newUltimateInstance = new UltimateByHttp(context, settings, toolchain, apiUrl);
        let refreshTime: number =
            vscode.workspace.getConfiguration().get('ultimate.refreshRate') || 3000;

        if (publicKnownAPIs.includes(apiUrl)) {
            refreshTime = Math.min(3000, refreshTime);
        }

        newUltimateInstance.refreshTimeInMilliseconds = refreshTime;
        return newUltimateInstance;
    }
}
