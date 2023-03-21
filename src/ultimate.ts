import * as cp from 'child_process';
import * as vscode from 'vscode';

export interface VerificationTool {

    /**
     * Initializes the external tool
     */
    setup(): any;
    /**
     * Executes the verification tool on the given document
     * @param document Document to verify.
     */
    runOn(document: vscode.TextDocument): void;

    /**
     * Stop and terminate the verification tool
     */
    dispose(): void;
}

export class Ultimate implements VerificationTool{
    private extensionContext: vscode.ExtensionContext;
    private logChannel = vscode.window.createOutputChannel('Ultimate Log', { log: true });
    private outputChannel = vscode.window.createOutputChannel('Ultimate Results');
    private collection = vscode.languages.createDiagnosticCollection('ultimate');

    private settingsFilePath = 'results/ultimate_configuration/settings/ultimate-automizer_settings.epl';
    private toolchainFilePath = 'results/ultimate_configuration/toolchains/ultimate-automizer_toolchain.xml';
    private results = new UltimateResultParser('');

    private containerIsStarted = false;
    private ultimateIsRunning = false;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.initOutputChannel();
        this.initLogChannel();
    }

    public setup() {
        if (this.containerIsStarted) {
            vscode.window.showInformationMessage('Docker container already running.');
        } else {
            vscode.window.showInformationMessage('Start Docker container...');

            // TODO: start Docker container

            if (this.containerIsStarted) {
                vscode.window.showInformationMessage('Ultimate Docker container started!');
            } else {
                vscode.window.showErrorMessage('Error occurred during start of Ultimate Docker container!');
            }
        }
    }

    public setToolchain(path: string) {
        // TODO: check for valid file
        this.toolchainFilePath = path;
    }

    public setSettings(path: string) {
        // TODO: check for valid file
        this.settingsFilePath = path;
    }

    // Execute Ultimate Automizer on the current active file
    public runOn(document: vscode.TextDocument) {
        if (document && document.languageId === 'c' && !this.ultimateIsRunning) {
            this.ultimateIsRunning = true;
            let cwd = '/Users/johannes/Documents/03_Master/Masterthesis/Docker';    // TODO!
            let commandString = './ultimate_docker.sh';
            let commandArgs = ['-s', this.settingsFilePath, '-t', this.toolchainFilePath, '-i', document.uri.fsPath];
            let ultimateOutput = '';
            
            this.outputChannel.clear();

            const ultimateProcess = cp.spawn(commandString, commandArgs, { 'cwd': cwd });
            console.log('child process "Ultimate" started');
            
            ultimateProcess.stdout.on('data', (stdout) => {
                this.log(stdout.toString());
                ultimateOutput += stdout;
            });
            ultimateProcess.stderr.on('data', (stderr) => {
                this.log(stderr.toString());
            });
            ultimateProcess.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
                this.results = new UltimateResultParser(ultimateOutput);
                this.outputChannel.appendLine(this.results.resultString);
                let diagnostics = this.prepareDiagnosticInfo(document);
                if (diagnostics) {
                    this.collection.set(document.uri, diagnostics);
                } else {
                    this.collection.clear();
                }
                this.ultimateIsRunning = false;
            });
        } else {
            console.log('Ultimate already running ...');
        }
    }

    public getResultsOfLastRun(): UltimateResultParser {
        return this.results;
    }

    public dispose() {
        // TODO: stop container
    }

    private initLogChannel() {
        this.extensionContext.subscriptions.push(this.logChannel);
        this.logChannel.appendLine('Hello Ultimate!');
        this.logChannel.show();
    }

    private initOutputChannel() {
        this.extensionContext.subscriptions.push(this.outputChannel);
        this.outputChannel.appendLine('Hello Ultimate!');
        this.outputChannel.show();
    }

    private log(data: string, severity?: string) {
        let lines = data.split('\n');
        let outputLine = '';
        for (const line of lines) {
            if (line.match(/^(?!\s*$).+/)) {
                let errorLine = line.match(/[0-9]{3} ERROR (.*)/);
                let warningLine = line.match(/[0-9]{3} WARN (.*)/) || line.match(/WARNING: (.*)/);
                let infoLine = line.match(/[0-9]{3} INFO (.*)/);

                if (errorLine) {
                    outputLine = errorLine[1];
                } else if (warningLine) {
                    outputLine = warningLine[1];
                } else if (infoLine) {
                    outputLine = infoLine[1];
                } else {
                    outputLine = line;
                }

                if (errorLine || severity === 'error') {
                    this.logChannel.error(outputLine);
                } else if (warningLine || severity === 'warning') {
                    this.logChannel.warn(outputLine);
                } else if (severity === 'debug') {
                    this.logChannel.debug(outputLine);
                } else {
                    this.logChannel.info(outputLine);
                }
            }
        }
    }

    private prepareDiagnosticInfo(document: vscode.TextDocument): vscode.Diagnostic[] | null {
        let diagnostics = null;
        let relatedInformation: vscode.DiagnosticRelatedInformation[] = [];
        if (!this.results.provedSuccessfully) {
            let message = this.results.message;
            let range = document.lineAt(this.results.messageLine).range;

            if (this.results.reason && this.results.reasonLine) {
                let relatedInfoRange = document.lineAt(this.results.reasonLine).range;
                let relatedInfoLocation = new vscode.Location(document.uri, relatedInfoRange);
                let relatedInfoMessage = this.results.reason;
                relatedInformation.push(new vscode.DiagnosticRelatedInformation(relatedInfoLocation, relatedInfoMessage));
            }
            diagnostics = [{
                code: '',
                message: message,
                range: range,
                severity: vscode.DiagnosticSeverity.Error,
                source: 'Ultimate Automizer',
                relatedInformation: relatedInformation
            }];
        }
        return diagnostics;
    }
}


export class UltimateResultParser {
    public resultString: string;
    public provedSuccessfully: boolean;
    public message: string = '';
    public messageLine: number = 0;
    public reason: string | null = null;
    public reasonLine: number | null = null;

    constructor(log: string) {
        this.resultString = log.substring(log.indexOf('--- Results ---'));

        // Check if program was proved to be correct
        this.provedSuccessfully = this.resultString.includes('AllSpecificationsHoldResult');
        let unprovableResult = this.resultString.match(/UnprovableResult \[Line: (\d*)\]: (.*)\n (.*)\n Reason: (\D*)(\d*)(.*)\n/);
        let unsupportedSyntaxResult = this.resultString.match(/UnsupportedSyntaxResult \[Line: (.*)\]: (.*)\n/);
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
    }
}