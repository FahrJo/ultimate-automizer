import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { SingleUltimateResult, UltimateBase } from './ultimate';

export class UltimateByLog extends UltimateBase {
    private executable: path.ParsedPath;
    private settingsFilePath = vscode.Uri.file('');
    private toolchainFilePath = vscode.Uri.file('');
    protected response = new UltimateResultParser('');

    constructor(
        context: vscode.ExtensionContext,
        executable: vscode.Uri,
        settings: vscode.Uri,
        toolchain: vscode.Uri
    ) {
        super(context);
        this.executable = path.parse(executable.fsPath);
        this.setSettings(settings);
        this.setToolchain(toolchain);
    }

    public setup(): void {}

    public setToolchain(path: vscode.Uri): void {
        if (fs.existsSync(path.fsPath) && path.fsPath.match(/(.*\.xml$)/)) {
            this.toolchainFilePath = path;
        } else {
            console.log(`Toolchain file ${path} does not exist`);
        }
    }

    public setSettings(path: vscode.Uri): void {
        if (fs.existsSync(path.fsPath) && path.fsPath.match(/(.*\.epf$)/)) {
            this.settingsFilePath = path;
        } else {
            console.log(`Settings file ${path} does not exist`);
        }
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
            this.showProgressInStatusBar('Fetching Ultimate results...');
            let cwd = this.executable.dir;
            let commandString = './' + this.executable.base;
            // prettier-ignore
            let commandArgs = [
                '-s', this.settingsFilePath.fsPath,
                '-tc', this.toolchainFilePath.fsPath,
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
                ultimateOutput += stderr;
            });

            ultimateProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                this.freeUltimate();
                this.response = new UltimateResultParser(ultimateOutput);
                this.results = this.response.results;
                this.outputChannel.appendLine(this.response.resultString);
                this.embedDiagnosticInfoInto(document);
                this.stopShowingProgressInStatusBar();
            });
        } else {
            console.log('Ultimate already running ...');
        }
    }

    private printStdoutToLog(stdout: string): void {
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
        if (!this.response.provedSuccessfully) {
            let message = this.response.message;
            let range = document.lineAt(this.response.messageLine).range;

            if (this.response.reason && this.response.reasonLine) {
                let relatedInfoLocation = new vscode.Location(
                    document.uri,
                    new vscode.Position(0, 0)
                );
                if (this.response.reasonLine >= 0) {
                    let relatedInfoRange = document.lineAt(this.response.reasonLine).range;
                    relatedInfoLocation = new vscode.Location(document.uri, relatedInfoRange);
                }

                let relatedInfoMessage = this.response.reason;
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
const REGEX_UNPROVABLE =
    /UnprovableResult \[Line: (\d*)\]: (.*)\n (.*)\n Reason: (\D*)(\d*)((.|\n)*)\n\n/;
const REGEX_COUNTEREXAMPLE =
    /CounterExampleResult \[Line: (\d*)\]: (.*)\n (.*)\n(\D*):(.*)((.|\n)*)\n\n/;
const REGEX_UNSUPPORTED_SYNTAX = /UnsupportedSyntaxResult \[Line: (.*)\]: (.*)\n/;

export class UltimateResultParser {
    public resultString: string = '';
    public provedSuccessfully: boolean = false;
    public message: string = '';
    public messageLine: number = 0;
    public reason: string | null = null;
    public reasonLine: number | null = null;

    // Interface parameters from UltimateResults
    public results: SingleUltimateResult[] = [];

    constructor(log: string) {
        this.parse(log);
    }

    public parse(log: string): void {
        this.resultString = log.substring(log.indexOf('--- Results ---'));

        // Check if program was proved to be correct
        this.provedSuccessfully = this.resultString.includes('AllSpecificationsHoldResult');
        let counterexampleResult = this.resultString.match(REGEX_COUNTEREXAMPLE);
        let unprovableResult = this.resultString.match(REGEX_UNPROVABLE);
        let unsupportedSyntaxResult = this.resultString.match(REGEX_UNSUPPORTED_SYNTAX);
        let errorResult = unsupportedSyntaxResult || counterexampleResult || unprovableResult;

        if (this.provedSuccessfully) {
            this.message = 'Program was proved to be correct';
        } else if (errorResult) {
            this.messageLine = Number(errorResult[1]) - 1;
            this.message = errorResult[2];
            if (errorResult.length > 5) {
                this.reasonLine = Number(errorResult[5]) - 1;
                this.reason = `${errorResult[4]}${errorResult[5]}: ${errorResult[6]}`;
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
