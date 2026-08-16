import path from "node:path";
import ts from "typescript";

export interface LspDiagnostic {
  path: string;
  line: number;
  character: number;
  message: string;
  code: string;
}

export interface LspLocation {
  path: string;
  line: number;
  character: number;
}

export interface LspHover {
  display: string;
  documentation?: string;
}

interface ServiceHandle {
  root: string;
  service: ts.LanguageService;
  languageServiceHost: ts.LanguageServiceHost;
}

const cache = new Map<string, ServiceHandle>();

export function getDiagnostics(root: string, filePath?: string): LspDiagnostic[] {
  const handle = getService(root);
  const targets = filePath
    ? [toAbs(root, filePath)]
    : handle.service.getProgram()?.getRootFileNames() ?? [];
  const results: LspDiagnostic[] = [];
  for (const target of targets) {
    if (!target.endsWith(".ts") && !target.endsWith(".tsx")) {
      continue;
    }
    const semantic = handle.service.getSemanticDiagnostics(target);
    const syntactic = handle.service.getSyntacticDiagnostics(target);
    for (const diagnostic of [...syntactic, ...semantic]) {
      if (!diagnostic.file || diagnostic.start === undefined) {
        continue;
      }
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      results.push({
        path: path.relative(root, diagnostic.file.fileName).replaceAll("\\", "/"),
        line: position.line + 1,
        character: position.character + 1,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        code: String(diagnostic.code),
      });
      if (results.length >= 50) {
        return results;
      }
    }
  }
  return results;
}

export function getHover(
  root: string,
  filePath: string,
  line: number,
  character: number,
): LspHover | undefined {
  const handle = getService(root);
  const abs = toAbs(root, filePath);
  const source = handle.service.getProgram()?.getSourceFile(abs);
  if (!source) {
    return undefined;
  }
  const offset = offsetOf(source, line, character);
  const info = handle.service.getQuickInfoAtPosition(abs, offset);
  if (!info) {
    return undefined;
  }
  return {
    display: ts.displayPartsToString(info.displayParts),
    documentation: ts.displayPartsToString(info.documentation) || undefined,
  };
}

export function getDefinition(
  root: string,
  filePath: string,
  line: number,
  character: number,
): LspLocation[] {
  const handle = getService(root);
  const abs = toAbs(root, filePath);
  const source = handle.service.getProgram()?.getSourceFile(abs);
  if (!source) {
    return [];
  }
  const offset = offsetOf(source, line, character);
  const defs = handle.service.getDefinitionAtPosition(abs, offset) ?? [];
  return defs.map((definition) => {
    const file = handle.service.getProgram()?.getSourceFile(definition.fileName);
    const pos = file?.getLineAndCharacterOfPosition(definition.textSpan.start);
    return {
      path: path.relative(root, definition.fileName).replaceAll("\\", "/"),
      line: (pos?.line ?? 0) + 1,
      character: (pos?.character ?? 0) + 1,
    };
  });
}

function getService(root: string): ServiceHandle {
  const existing = cache.get(root);
  if (existing) {
    return existing;
  }

  const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  const config = configPath
    ? ts.readConfigFile(configPath, ts.sys.readFile)
    : { config: { compilerOptions: { strict: true, module: "nodenext", moduleResolution: "nodenext" } } };
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath ?? root));
  const versions = new Map<string, string>();
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => parsed.options,
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: (fileName) => versions.get(fileName) ?? "1",
    getScriptSnapshot: (fileName) => {
      const text = ts.sys.readFile(fileName);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => root,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const handle = { root, service, languageServiceHost: host };
  cache.set(root, handle);
  return handle;
}

function toAbs(root: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function offsetOf(source: ts.SourceFile, line: number, character: number): number {
  return source.getPositionOfLineAndCharacter(Math.max(0, line - 1), Math.max(0, character - 1));
}
