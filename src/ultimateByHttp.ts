import * as vscode from 'vscode';
import * as fs from 'fs';
import { SingleUltimateResult, UltimateBase } from './ultimate';
import { HttpResponse, unifiedHttpsRequest } from './httpsRequest';

export class UltimateByHttp extends UltimateBase {
    private apiUrl: URL;
    private requestId = '';
    public refreshTimeInMilliseconds = 500;

    constructor(
        context: vscode.ExtensionContext,
        settings: vscode.Uri,
        toolchain: vscode.Uri,
        apiUrl: string
    ) {
        super(context);
        this.apiUrl = new URL(apiUrl);
        this.setSettingsFile(settings);
        this.setToolchainFile(toolchain);
    }

    public runOn(input: string | vscode.TextDocument, language: string = 'c'): void {
        let code = '';
        let fileExtension = language;
        let document: vscode.TextDocument;
        if (this.isDocument(input) && (input.languageId === 'c' || input.languageId === 'boogie')) {
            document = input;
            code = document.getText();
            fileExtension = vscode.window.activeTextEditor?.document.uri.fsPath.split('.').pop()!;
        } else if (typeof input === 'string') {
            code = input;
        }

        if (!this.isLocked()) {
            this.lockUltimate();
            this.outputChannel.clear();
            this.showProgressInStatusBar('Fetching Ultimate results...');
            this.fetchResults(code.trim(), fileExtension)
                .then((response) => this.parseResponse(response))
                .then(() => this.pollResults())
                .then(() => this.outputChannel.show())
                .then(() => this.printResultsToOutput())
                .then(() => this.printResultsToLog())
                .then(() => this.embedDiagnosticInfoInto(document))
                .then(() => this.stopShowingProgressInStatusBar())
                .then(() => this.freeUltimate())
                .catch((error: any) => {
                    console.log(error);
                    this.stopShowingProgressInStatusBar();
                    this.freeUltimate();
                });
        }
    }

    public fetchResults(code: string, fileExtension: string): Promise<HttpResponse> {
        let body = {
            action: 'execute',
            code: code,
            toolchain: {
                id: 'cAutomizer',
            },
            /* eslint-disable @typescript-eslint/naming-convention */
            code_file_extension: '.' + fileExtension,
            user_settings: this.getSettingsFromFile(),
            ultimate_toolchain_xml: this.getToolchainFromFile(),
            /* eslint-enable @typescript-eslint/naming-convention */
        };

        let defaultPort = this.apiUrl.protocol === 'http:' ? 80 : 443;

        let options = {
            protocol: this.apiUrl.protocol,
            hostname: this.apiUrl.hostname,
            port: this.apiUrl.port || defaultPort,
            path: this.apiUrl.pathname,
            method: 'POST',
            headers: {
                /* eslint-disable @typescript-eslint/naming-convention */
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'Connection': 'keep-alive',
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        };

        return unifiedHttpsRequest(options, body);
    }

    protected getToolchainFromFile(): string {
        let toolchain = `<rundefinition>
                            <name>CAutomizerTC</name>
                            <toolchain>
                            <plugin id="de.uni_freiburg.informatik.ultimate.plugins.analysis.syntaxchecker"/>
                            <plugin id="de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator"/>
                            <plugin id="de.uni_freiburg.informatik.ultimate.boogie.preprocessor"/>
                            <plugin id="de.uni_freiburg.informatik.ultimate.plugins.generator.rcfgbuilder"/>
                            <plugin id="de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction"/>
                            </toolchain>
                        </rundefinition>`;
        if (
            fs.existsSync(this.toolchainFilePath.fsPath) &&
            fs.lstatSync(this.settingsFilePath.fsPath).isFile()
        ) {
            toolchain = fs.readFileSync(this.toolchainFilePath.fsPath).toString();
        }
        return toolchain;
    }

    protected getSettingsFromFile(): string {
        let settings = '';
        if (
            fs.existsSync(this.settingsFilePath.fsPath) &&
            fs.lstatSync(this.settingsFilePath.fsPath).isFile()
        ) {
            settings = fs.readFileSync(this.settingsFilePath.fsPath).toString();
        }
        return '{"user_settings":[{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Check absence of data races in concurrent programs","key":"Check absence of data races in concurrent programs","id":"cacsl2boogietranslator.check.absence.of.data.races.in.concurrent.programs","visible":true,"default":true,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Check absence of signed integer overflows","key":"Check absence of signed integer overflows","id":"cacsl2boogietranslator.check.absence.of.signed.integer.overflows","visible":true,"default":true,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Check division by zero","key":"Check division by zero","id":"cacsl2boogietranslator.check.division.by.zero","visible":false,"default":"IGNORE","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Check if freed pointer was valid","key":"Check if freed pointer was valid","id":"cacsl2boogietranslator.check.if.freed.pointer.was.valid","visible":false,"default":false,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Pointer to allocated memory at dereference","key":"Pointer to allocated memory at dereference","id":"cacsl2boogietranslator.pointer.to.allocated.memory.at.dereference","visible":false,"default":"IGNORE","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Check array bounds for arrays that are off heap","key":"Check array bounds for arrays that are off heap","id":"cacsl2boogietranslator.check.array.bounds.for.arrays.that.are.off.heap","visible":false,"default":"IGNORE","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Check for the main procedure if all allocated memory was freed","key":"Check for the main procedure if all allocated memory was freed","id":"cacsl2boogietranslator.check.for.the.main.procedure.if.all.allocated.memory.was.freed","visible":false,"default":false,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"If two pointers are subtracted or compared they have the same base address","key":"If two pointers are subtracted or compared they have the same base address","id":"cacsl2boogietranslator.if.two.pointers.are.subtracted.or.compared.they.have.the.same.base.address","visible":false,"default":"IGNORE","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Pointer base address is valid at dereference","key":"Pointer base address is valid at dereference","id":"cacsl2boogietranslator.pointer.base.address.is.valid.at.dereference","visible":false,"default":"IGNORE","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Overapproximate operations on floating types","key":"Overapproximate operations on floating types","id":"cacsl2boogietranslator.overapproximate.operations.on.floating.types","visible":false,"default":true,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.cacsl2boogietranslator","name":"Use constant arrays","key":"Use constant arrays","id":"cacsl2boogietranslator.use.constant.arrays","visible":false,"default":true,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.rcfgbuilder","name":"Size of a code block","key":"Size of a code block","id":"rcfgbuilder.size.of.a.code.block","visible":false,"default":"SequenceOfStatements","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.rcfgbuilder","name":"SMT solver","key":"SMT solver","id":"rcfgbuilder.smt.solver","visible":false,"default":"External_DefaultMode","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"Compute Interpolants along a Counterexample","key":"Compute Interpolants along a Counterexample","id":"traceabstraction.compute.interpolants.along.a.counterexample","visible":false,"default":"FPandBP","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"SMT solver","key":"SMT solver","id":"traceabstraction.smt.solver","visible":false,"default":"External_ModelsAndUnsatCoreMode","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"Compute Hoare Annotation of negated interpolant automaton, abstraction and CFG","key":"Compute Hoare Annotation of negated interpolant automaton, abstraction and CFG","id":"traceabstraction.compute.hoare.annotation.of.negated.interpolant.automaton,.abstraction.and.cfg","visible":false,"default":true,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"Positions where we compute the Hoare Annotation","key":"Positions where we compute the Hoare Annotation","id":"traceabstraction.positions.where.we.compute.the.hoare.annotation","visible":false,"default":"LoopsAndPotentialCycles","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"Trace refinement strategy","key":"Trace refinement strategy","id":"traceabstraction.trace.refinement.strategy","visible":false,"default":"CAMEL","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"Trace refinement exception blacklist","key":"Trace refinement exception blacklist","id":"traceabstraction.trace.refinement.exception.blacklist","visible":false,"default":"DEPENDING","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"Automaton type used in concurrency analysis","key":"Automaton type used in concurrency analysis","id":"traceabstraction.automaton.type.used.in.concurrency.analysis","visible":false,"default":"PETRI_NET","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.generator.traceabstraction","name":"Apply one-shot large block encoding in concurrent analysis","key":"Apply one-shot large block encoding in concurrent analysis","id":"traceabstraction.apply.one-shot.large.block.encoding.in.concurrent.analysis","visible":false,"default":false,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.boogie.procedureinliner","name":"Ignore calls to procedures called more than once","key":"Ignore calls to procedures called more than once","id":"procedureinliner.ignore.calls.to.procedures.called.more.than.once","visible":false,"default":"ONLY_FOR_SEQUENTIAL_PROGRAMS","type":"string"},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.blockencoding","name":"Create parallel compositions if possible","key":"Create parallel compositions if possible","id":"blockencoding.create.parallel.compositions.if.possible","visible":false,"default":false,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.blockencoding","name":"Rewrite not-equals","key":"Rewrite not-equals","id":"blockencoding.rewrite.not-equals","visible":false,"default":false,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.blockencoding","name":"Use SBE","key":"Use SBE","id":"blockencoding.use.sbe","visible":false,"default":true,"type":"bool","value":false},{"plugin_id":"de.uni_freiburg.informatik.ultimate.plugins.blockencoding","name":"Minimize states even if more edges are added than removed.","key":"Minimize states even if more edges are added than removed.","id":"blockencoding.minimize.states.even.if.more.edges.are.added.than.removed","visible":false,"default":false,"type":"bool","value":false}]}';
    }

    private parseResponse(httpResponse: HttpResponse): void {
        let response = JSON.parse(httpResponse.body);
        this.results = response.results ? response.results : [];
        this.requestId = response.requestId;
        this.error = response.error;
    }

    private delay(ms: number): Promise<any> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private pollResults(): Promise<HttpResponse> {
        let defaultPort = this.apiUrl.protocol === 'http:' ? 80 : 443;

        let options = {
            protocol: this.apiUrl.protocol,
            hostname: this.apiUrl.hostname,
            port: this.apiUrl.port || defaultPort,
            path: this.apiUrl.pathname + '/job/get/' + this.requestId,
            method: 'GET',
            headers: {
                /* eslint-disable @typescript-eslint/naming-convention */
                Accept: '*/*',
                Connection: 'keep-alive',
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        };

        return unifiedHttpsRequest(options).then((httpResponse): any => {
            let response = JSON.parse(httpResponse.body);
            switch (response.status.toLowerCase()) {
                case 'done':
                    this.results = response.results;
                    Promise.resolve(response);
                    break;
                case 'error':
                    Promise.reject(response.error);
                    break;
                default:
                    // repeat polling recursively at given timeouts
                    return this.delay(this.refreshTimeInMilliseconds).then(() =>
                        this.pollResults()
                    );
            }
        });
    }

    protected printResultsToOutput(): void {
        if (this.error) {
            this.outputChannel.appendLine(this.error);
        }
        this.results.forEach((result) => {
            this.outputChannel.appendLine(`${result.logLvl}: ${result.shortDesc}`);
            this.outputChannel.appendLine(`${result.longDesc}`);
            this.outputChannel.appendLine('');
        });
    }

    protected printResultsToLog(): void {
        if (this.error) {
            this.log(this.error, vscode.DiagnosticSeverity.Error);
        }
        this.results.forEach((result) => {
            let message = `${result.shortDesc}: ${result.longDesc}`;
            let severity = this.convertSeverity(result.logLvl);
            this.log(message, severity);
        });
    }

    protected prepareDiagnosticInfo(document: vscode.TextDocument): vscode.Diagnostic[] {
        let diagnostics: vscode.Diagnostic[] = [];

        this.results.forEach((result) => {
            if (this.resultIsWorthEmbedding(result)) {
                let relatedInformation: vscode.DiagnosticRelatedInformation[] = [];
                let reasonInformation = RegExp(/Reason: (\D*)(\d*)(.*)\n/).exec(result.longDesc);

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
                    range: this.getResultRange(result, document),
                    severity: this.convertSeverity(result.logLvl),
                    source: 'Ultimate Automizer',
                    relatedInformation: relatedInformation,
                });
            }
        });
        return diagnostics;
    }

    private getResultRange(
        result: SingleUltimateResult,
        document: vscode.TextDocument
    ): vscode.Range {
        let startLNr = result.startLNr > 0 ? result.startLNr - 1 : 0;
        let endLNr = result.endLNr > 0 ? result.endLNr - 1 : 0;
        let assertFinding: RegExpExecArray | null = null;
        let startCol = 0;
        let endCol = 0;

        if (startLNr > 0) {
            assertFinding = RegExp(/assert(.*);/).exec(document.lineAt(startLNr).text);
        }

        if (result.startCol >= 0 && result.endCol >= 0) {
            // Use column information from Ultimate if available
            startCol = result.startCol;
            endCol = result.endCol;
        } else if (assertFinding) {
            // Try to detect the columns from the file as fallback if no proper information came
            // back from Ultimate.
            startCol = assertFinding.index;
            endCol = startCol + assertFinding[0].length;
        }

        return new vscode.Range(startLNr, startCol, endLNr, endCol);
    }

    private resultIsWorthEmbedding(result: SingleUltimateResult): boolean {
        return !(result.type === 'invariant' || result.type === 'syntaxError');
    }
}
