import * as vscode from 'vscode';
import * as url from 'url';
import { SingleUltimateResult, UltimateBase, UltimateResults } from './ultimate';
import { HttpResponse, httpsRequest } from './httpsRequest';

export class UltimateByHttp extends UltimateBase {
    private baseUrl = '';
    private useDockerContainer = false;

    constructor(context: vscode.ExtensionContext, useDocker: boolean = false, baseUrl?: string) {
        super(context);
        if (baseUrl) {
            this.baseUrl = baseUrl;
        }
        this.useDockerContainer = useDocker;
    }

    public setup() {
        if (this.useDockerContainer) {
            if (this.containerIsStarted) {
                vscode.window.showInformationMessage('Docker container already running.');
            } else {
                vscode.window.showInformationMessage('Start Docker container...');

                // TODO: start Docker container

                if (this.containerIsStarted) {
                    vscode.window.showInformationMessage('Ultimate Docker container started!');
                } else {
                    vscode.window.showErrorMessage(
                        'Error occurred during start of Ultimate Docker container!'
                    );
                }
            }
        }
    }

    public runOn(input: unknown): void {
        let cCode: string;
        let document: vscode.TextDocument;
        if (this.isDocument(input) && input.languageId === 'c') {
            document = input;
            cCode = document.getText();
        } else if (typeof input === 'string') {
            cCode = input;
        } else {
            return;
        }

        if (!this.isLocked()) {
            this.lockUltimate();
            this.fetchResults(cCode.trim())
                .then((response) => this.parseData(response))
                .then(() => this.printResultsToOutput())
                .then(() => this.printResultsToLog())
                .then(() => this.embedDiagnosticInfoInto(document))
                .then(() => this.freeUltimate())
                .catch((error: any) => {
                    console.log(error);
                    this.freeUltimate();
                });
        }
    }

    public fetchResults(cCode: string) {
        this.outputChannel.clear();
        this.showProgressInStatusBar('Fetching Ultimate results...');

        let values = 'action=execute';
        values += '&code=' + encodeURIComponent(cCode);
        values +=
            '&cAutomizer_deunifreiburginformatikultimatepluginsgeneratorcacsl2boogietranslatorcheckforthemainprocedureifallallocatedmemorywasfreed=false';
        values +=
            '&cAutomizer_deunifreiburginformatikultimatepluginsgeneratorcacsl2boogietranslatorcheckabsenceofsignedintegeroverflows=false';
        values += '&taskID=AUTOMIZER_C&tcID=cAutomizer';

        let options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/tomcat/WebsiteEclipseBridge/if?' + values,
            method: 'POST',
            headers: {
                /* eslint-disable @typescript-eslint/naming-convention */
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'Connection': 'keep-alive',
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        };

        return httpsRequest(options);
    }

    private parseData(httpResponse: HttpResponse) {
        this.results = JSON.parse(httpResponse.body);
    }

    private showProgressInStatusBar(title: string) {
        vscode.window.withProgress(
            {
                title: title,
                location: vscode.ProgressLocation.Window,
                cancellable: true,
            },
            (progress, token) => {
                return new Promise((resolve) => {
                    this.progressCancellationToken = new vscode.CancellationTokenSource();
                    this.progressCancellationToken.token.onCancellationRequested(() => {
                        this.progressCancellationToken?.dispose();
                        this.progressCancellationToken = null;
                        resolve(null);
                        return;
                    });

                    setTimeout(() => {
                        resolve(null);
                    }, 300000);
                });
            }
        );
    }

    public getResultsOfLastRun(): UltimateResults {
        return this.results;
    }

    public dispose() {
        // TODO: stop container
    }

    protected printResultsToOutput() {
        this.results.results.forEach((result) => {
            this.outputChannel.appendLine(`${result.logLvl}: ${result.shortDesc}`);
            this.outputChannel.appendLine(`${result.longDesc}`);
            this.outputChannel.appendLine('');
        });
    }

    protected printResultsToLog() {
        this.results.results.forEach((result) => {
            let message = `${result.shortDesc}: ${result.longDesc}`;
            let severity = this.convertSeverity(result.logLvl);
            this.log(message, severity);
        });
    }

    protected prepareDiagnosticInfo(document: vscode.TextDocument): vscode.Diagnostic[] {
        let diagnostics: vscode.Diagnostic[] = [];

        this.results.results.forEach((result) => {
            if (this.resultIsWorthEmbedding(result)) {
                let relatedInformation: vscode.DiagnosticRelatedInformation[] = [];
                let reasonInformation = result.longDesc.match(/Reason: (\D*)(\d*)(.*)\n/);

                if (reasonInformation) {
                    let relatedLine = Number(reasonInformation[2]);
                    let relatedInfoRange = document.lineAt(relatedLine - 1).range;
                    let relatedInfoLocation = new vscode.Location(document.uri, relatedInfoRange);
                    relatedInformation.push(
                        new vscode.DiagnosticRelatedInformation(
                            relatedInfoLocation,
                            result.longDesc
                        )
                    );
                }

                diagnostics.push({
                    code: '',
                    message: result.shortDesc,
                    range: this.getResultRange(result),
                    severity: this.convertSeverity(result.logLvl),
                    source: 'Ultimate Automizer',
                    relatedInformation: relatedInformation,
                });
            }
        });
        return diagnostics;
    }

    private getResultRange(result: SingleUltimateResult): vscode.Range {
        let startLNr = result.startLNr > 0 ? result.startLNr - 1 : 0;
        let startCol = result.startCol >= 0 ? result.startCol : 0;
        let endLNr = result.endLNr > 0 ? result.endLNr - 1 : 0;
        let endCol = result.endCol >= 0 ? result.endCol : 0;
        return new vscode.Range(startLNr, startCol, endLNr, endCol);
    }

    private resultIsWorthEmbedding(result: SingleUltimateResult): boolean {
        return !(result.type === 'invariant' || result.type === 'syntaxError');
    }
}
