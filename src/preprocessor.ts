import * as vscode from "vscode";


export class Preprocessor {
    protected entryFile: vscode.Uri;
    protected mainCode: string = '';
    protected code: InstrumentedCode;

    constructor(entryFile: vscode.Uri) {
        this.entryFile = entryFile;
        this.code = new InstrumentedCode(entryFile);
    }

    public setEntryFile(entryFile: vscode.Uri) {
        this.entryFile = entryFile;
        vscode.workspace.fs.readFile(entryFile).then((content) => {this.mainCode = content.toString();});
    }

    public inlineIncludes() {

    }

    public inlineDefines() {
        const regexp = /^.*#define[ \t]*\(DEP[A-Za-z0-9_]*\)[ \t]*\([0-9]*\)$/g;
        const str = "table football, foosball";
        const matches = this.mainCode.matchAll(regexp);

        for (const match of matches) {
            console.log(match);
        }
    }

    instrumentWithGhostVariables(code: string) {

    }
}

export class InstrumentedCode {
    protected entryFile: vscode.Uri;
    protected mainCode: string = '';
    protected lineMap: number[] = [];

    constructor(entryFile: vscode.Uri) {
        this.entryFile = entryFile;
    }
}