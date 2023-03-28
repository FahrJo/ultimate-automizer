import * as cp from 'child_process';
import * as vscode from 'vscode';
import { SingleUltimateResult, UltimateBase, UltimateResults } from './ultimate';

export class UltimateByLog extends UltimateBase {
    private settingsFilePath =
        'results/ultimate_configuration/settings/ultimate-automizer_settings.epl';
    private toolchainFilePath =
        'results/ultimate_configuration/toolchains/ultimate-automizer_toolchain.xml';
    protected results = new UltimateResultParser('');

    constructor(context: vscode.ExtensionContext) {
        super(context);
    }

    public setup() {}

    public setToolchain(path: string) {
        // TODO: check for valid file
        this.toolchainFilePath = path;
    }

    public setSettings(path: string) {
        // TODO: check for valid file
        this.settingsFilePath = path;
    }

    // TODO: Run on String!
    public runOn(input: unknown): void {
        let document: vscode.TextDocument;
        if (this.isDocument(input) && input.languageId === 'c') {
            document = input;
        } else {
            return;
        }

        if (!this.isLocked()) {
            this.lockUltimate();
            let cwd = '/Users/johannes/Documents/03_Master/Masterthesis/Docker'; // TODO!
            let commandString = './ultimate_docker.sh';
            // prettier-ignore
            let commandArgs = [
                '-s', this.settingsFilePath,
                '-t', this.toolchainFilePath,
                '-i', document.uri.fsPath,
            ];
            let ultimateOutput = '';

            this.outputChannel.clear();

            const ultimateProcess = cp.spawn(commandString, commandArgs, {
                cwd: cwd,
            });
            console.log('child process "Ultimate" started');

            ultimateProcess.stdout.on('data', (stdout) => {
                this.printStdoutToLog(stdout.toString());
                ultimateOutput += stdout;
            });

            ultimateProcess.stderr.on('data', (stderr) => {
                this.printStdoutToLog(stderr.toString());
            });

            ultimateProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                this.freeUltimate();
                this.results = new UltimateResultParser(ultimateOutput);
                this.outputChannel.appendLine(this.results.resultString);
                this.embedDiagnosticInfoInto(document);
            });
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

    private printStdoutToLog(stdout: string) {
        let lines = stdout.split('\n');
        let outputLine: string;
        let severity: vscode.DiagnosticSeverity;

        for (const line of lines) {
            if (line.match(/^(?!\s*$).+/)) {
                // line not empty
                let errorLine = line.match(/[0-9]{3} ERROR (.*)/);
                let warningLine = line.match(/[0-9]{3} WARN (.*)/) || line.match(/WARNING: (.*)/);
                let infoLine = line.match(/[0-9]{3} INFO (.*)/);

                if (errorLine) {
                    outputLine = errorLine[1];
                    severity = vscode.DiagnosticSeverity.Error;
                } else if (warningLine) {
                    outputLine = warningLine[1];
                    severity = vscode.DiagnosticSeverity.Warning;
                } else if (infoLine) {
                    outputLine = infoLine[1];
                    severity = vscode.DiagnosticSeverity.Information;
                } else {
                    outputLine = line;
                    severity = vscode.DiagnosticSeverity.Hint;
                }

                this.log(outputLine, severity);
            }
        }
    }

    protected prepareDiagnosticInfo(document: vscode.TextDocument): vscode.Diagnostic[] {
        let diagnostics: vscode.Diagnostic[] = [];
        let relatedInformation: vscode.DiagnosticRelatedInformation[] = [];
        if (!this.results.provedSuccessfully) {
            let message = this.results.message;
            let range = document.lineAt(this.results.messageLine).range;

            if (this.results.reason && this.results.reasonLine) {
                let relatedInfoRange = document.lineAt(this.results.reasonLine).range;
                let relatedInfoLocation = new vscode.Location(document.uri, relatedInfoRange);
                let relatedInfoMessage = this.results.reason;
                relatedInformation.push(
                    new vscode.DiagnosticRelatedInformation(relatedInfoLocation, relatedInfoMessage)
                );
            }
            diagnostics = [
                {
                    code: '',
                    message: message,
                    range: range,
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'Ultimate Automizer',
                    relatedInformation: relatedInformation,
                },
            ];
        }
        return diagnostics;
    }
}

// Regular Expressions:
const REGEX_UNPROVABLE = /UnprovableResult \[Line: (\d*)\]: (.*)\n (.*)\n Reason: (\D*)(\d*)(.*)\n/;
const REGEX_UNSUPPORTED_SYNTAX = /UnsupportedSyntaxResult \[Line: (.*)\]: (.*)\n/;

export class UltimateResultParser implements UltimateResults {
    public resultString: string = '';
    public provedSuccessfully: boolean = false;
    public message: string = '';
    public messageLine: number = 0;
    public reason: string | null = null;
    public reasonLine: number | null = null;

    // Interface parameters from UltimateResults
    public results: SingleUltimateResult[] = [];
    public status = 'success';

    constructor(log: string) {
        this.parse(log);
    }

    public parse(log: string) {
        this.resultString = log.substring(log.indexOf('--- Results ---'));

        // Check if program was proved to be correct
        this.provedSuccessfully = this.resultString.includes('AllSpecificationsHoldResult');
        let unprovableResult = this.resultString.match(REGEX_UNPROVABLE);
        let unsupportedSyntaxResult = this.resultString.match(REGEX_UNSUPPORTED_SYNTAX);
        let errorResult = unsupportedSyntaxResult || unprovableResult;

        if (this.provedSuccessfully) {
            this.message = 'Program was proved to be correct';
        } else if (errorResult) {
            this.messageLine = Number(errorResult[1]) - 1;
            this.message = errorResult[2];
            if (errorResult.length > 5) {
                this.reasonLine = Number(errorResult[5]) - 1;
                this.reason = errorResult[4] + errorResult[5];
            }
        }

        let result: SingleUltimateResult = {
            startLNr: this.messageLine,
            startCol: 0,
            endLNr: this.messageLine,
            endCol: 0,
            logLvl: errorResult ? 'warning' : 'info',
            shortDesc: this.message,
            type: this.provedSuccessfully ? 'positive' : 'unprovable',
            longDesc: this.reason || '',
        };
        this.results = [result];
    }
}
