import * as vscode from 'vscode';
import * as fs from 'fs';
export interface Ultimate {
    /**
     * Execute Ultimate Automizer on the current active file
     * @param code C code to verify
     */
    runOn(code: string): void;

    /**
     * Executes the verification tool on the given document
     * @param document Document to verify.
     */
    runOn(document: vscode.TextDocument): void;

    /**
     * Returns the results of the last execution of verification
     */
    getResultsOfLastRun(): SingleUltimateResult[];

    /**
     * Stop and terminate the verification tool
     */
    dispose(): void;
}

export abstract class UltimateBase implements Ultimate {
    protected extensionContext: vscode.ExtensionContext;
    protected logChannel: vscode.LogOutputChannel;
    protected outputChannel: vscode.OutputChannel;
    protected collection: vscode.DiagnosticCollection;

    //protected response: UltimateResponse = undefined!;
    protected results: SingleUltimateResult[] = [];
    protected error: string | undefined;
    protected settingsFilePath = vscode.Uri.file('');
    protected toolchainFilePath = vscode.Uri.file('');

    private ultimateIsRunning = false;
    private progressCancellationToken: vscode.CancellationTokenSource | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.logChannel = vscode.window.createOutputChannel('Ultimate Log', {
            log: true,
        });
        this.outputChannel = vscode.window.createOutputChannel('Ultimate Results');
        this.collection = vscode.languages.createDiagnosticCollection('ultimate');

        this.initOutputChannel();
        this.initLogChannel();
    }

    private initLogChannel(): void {
        this.extensionContext.subscriptions.push(this.logChannel);
        this.logChannel.appendLine('Ultimate activated');
        this.logChannel.show();
    }

    private initOutputChannel(): void {
        this.extensionContext.subscriptions.push(this.outputChannel);
        this.outputChannel.appendLine('Ultimate activated');
    }

    public setToolchainFile(path: vscode.Uri): void {
        if (fs.existsSync(path.fsPath) && RegExp(/(.*\.xml$)/).exec(path.fsPath)) {
            this.toolchainFilePath = path;
        } else {
            console.log(`Toolchain file ${path} does not exist`);
        }
    }

    public setSettingsFile(path: vscode.Uri): void {
        if (fs.existsSync(path.fsPath) && RegExp(/(.*\.epf$)/).exec(path.fsPath)) {
            this.settingsFilePath = path;
        } else {
            console.log(`Settings file ${path} does not exist`);
        }
    }

    // Execute Ultimate Automizer on C code
    public abstract runOn(code: string): void;

    // Execute Ultimate Automizer on the current active file
    public abstract runOn(document: vscode.TextDocument): void;

    public getResultsOfLastRun(): SingleUltimateResult[] {
        return this.results;
    }

    public dispose(): any {
        this.outputChannel.dispose();
    }

    protected log(message: string, severity?: vscode.DiagnosticSeverity): void {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                this.logChannel.error(message);
                break;
            case vscode.DiagnosticSeverity.Warning:
                this.logChannel.warn(message);
                break;
            case vscode.DiagnosticSeverity.Hint:
                this.logChannel.debug(message);
                break;
            default:
                this.logChannel.info(message);
        }
    }

    protected embedDiagnosticInfoInto(document: vscode.TextDocument): void {
        if (document) {
            let diagnostics = this.prepareDiagnosticInfo(document);
            this.collection.set(document.uri, diagnostics);
        }
    }

    protected abstract prepareDiagnosticInfo(document: vscode.TextDocument): vscode.Diagnostic[];

    protected convertSeverity(logLvl: string): vscode.DiagnosticSeverity {
        switch (logLvl) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'debug':
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }

    protected showProgressInStatusBar(title: string): void {
        vscode.window.withProgress(
            {
                title: title,
                location: vscode.ProgressLocation.Window,
                cancellable: true,
            },
            (progress, token) => {
                return new Promise((resolve) => {
                    this.progressCancellationToken = new vscode.CancellationTokenSource();
                    token.onCancellationRequested(() => {
                        this.progressCancellationToken?.dispose();
                        this.progressCancellationToken = null;
                        this.stopUltimate();
                        resolve(null);
                    });

                    this.progressCancellationToken.token.onCancellationRequested(() => {
                        this.progressCancellationToken?.dispose();
                        this.progressCancellationToken = null;
                        resolve(null);
                    });

                    setTimeout(() => {
                        resolve(null);
                    }, 300000);
                });
            }
        );
    }

    protected stopShowingProgressInStatusBar(): void {
        this.progressCancellationToken?.cancel();
    }

    protected abstract stopUltimate(): void;

    protected lockUltimate(): boolean {
        if (!this.ultimateIsRunning) {
            this.ultimateIsRunning = true;
            return true;
        } else {
            return false;
        }
    }

    protected freeUltimate(): void {
        this.ultimateIsRunning = false;
    }

    protected isLocked(): boolean {
        return this.ultimateIsRunning;
    }

    public isDocument(obj: any): obj is vscode.TextDocument {
        return true;
    }
}

export interface SingleUltimateResult {
    startLNr: number;
    startCol: number;
    endLNr: number;
    endCol: number;
    logLvl: string;
    shortDesc: string;
    type: string;
    longDesc: string;
}
