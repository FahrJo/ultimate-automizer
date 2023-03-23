import * as https from 'https';
import * as vscode from 'vscode';
import { SingleUltimateResult, UltimateBase, UltimateResults } from './ultimate';

export class UltimateByHttp extends UltimateBase {
    private progressCancellationToken: vscode.CancellationTokenSource | null = null;
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

    /**
     * Execute Ultimate Automizer on the current active file
     */
    public runOn(document: vscode.TextDocument) {
        if (document && document.languageId === 'c') {
            // Run on code from editor
            this.verify(document.getText());
            //this.embedDiagnosticInfoInto(document);
        }
    }

    public verify(cCode: string) {
        this.ultimateIsRunning = true;
        this.outputChannel.clear();
        let trimmedCode = cCode.trim();
        if (trimmedCode && !this.ultimateIsRunning) {
            vscode.window.withProgress(
                {
                    title: 'Fetching Ultimate results...',
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

            let values = 'action=execute';
            values += '&code=' + encodeURIComponent(trimmedCode);
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

            let req = https.request(options, (res) => {
                console.log('statusCode:', res.statusCode);
                console.log('headers:', res.headers);

                res.on('data', (data) => {
                    this.ultimateIsRunning = false;
                    this.results = JSON.parse(data);
                    this.printResultsToOutput();
                    this.printResultsToLog();
                    this.progressCancellationToken?.cancel();
                });
            });

            req.on('error', (error) => {
                this.ultimateIsRunning = false;
                console.error(error);
                this.progressCancellationToken?.cancel();
            });

            req.write('');
            req.end();
        } else {
            console.log('Ultimate already running ...');
        }
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
