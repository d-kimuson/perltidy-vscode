import * as vscode from "vscode"
import * as child_process from "child_process"
import * as path from "path"
import { diffChars } from "diff"

export type PerlTidyEditProviderOptions = {
  enable: boolean
  perltidyPath?: string
  configPath?: string
}

export type FormatResult =
  | {
      content: string
    }
  | {
      error: string
    }

export type FormatCache = {
  filePath: string
  version: number
  result: FormatResult
}

export class PerlTidyEditProvider
  implements
    vscode.DocumentRangeFormattingEditProvider,
    vscode.DocumentFormattingEditProvider
{
  public static formatCache?: FormatCache = undefined

  public static options: PerlTidyEditProviderOptions
  constructor(private options: PerlTidyEditProviderOptions) {
    PerlTidyEditProvider.initialize(options)
  }

  private static initialize(options: PerlTidyEditProviderOptions) {
    PerlTidyEditProvider.options = options
  }

  public async provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    range: vscode.Range,
    options: vscode.FormattingOptions
  ): Promise<vscode.TextEdit[]> {
    return await getTextEditsAfterFormat(document, options, range)
  }

  public async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions
  ): Promise<vscode.TextEdit[]> {
    return getTextEditsAfterFormat(document, options)
  }
}

async function getTextEditsAfterFormat(
  document: vscode.TextDocument,
  options: vscode.FormattingOptions,
  range?: vscode.Range
): Promise<vscode.TextEdit[]> {
  const allRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(
      document.lineCount - 1,
      document.lineAt(document.lineCount - 1).text.length
    )
  )

  const formatResult = await getFormatText(document)

  // フォーマットに失敗
  if ("error" in formatResult) {
    vscode.window.showErrorMessage("Failed format, Error: ", formatResult.error)

    return []
  }

  // 全文フォーマット
  if (!range) {
    return [new vscode.TextEdit(allRange, formatResult.content)]
  }

  // 部分フォーマット
  const diffs = diffChars(document.getText(), formatResult.content)

  let wordCount = 0
  const edits: vscode.TextEdit[] = []
  diffs.forEach((diff) => {
    const position = document.positionAt(wordCount)

    if (range.contains(position)) {
      if (diff.removed) {
        const endPosition = document.positionAt(wordCount + diff.value.length)
        edits.push(
          new vscode.TextEdit(new vscode.Range(position, endPosition), "")
        )
      }

      if (diff.added) {
        edits.push(
          new vscode.TextEdit(new vscode.Range(position, position), diff.value)
        )
      }
    }

    if (!diff.added) {
      wordCount += diff.count ?? 0
    }
  })

  return edits
}

async function getFormatText(
  document: vscode.TextDocument
): Promise<FormatResult> {
  const cache = PerlTidyEditProvider.formatCache
  if (cache) {
    if (
      cache?.filePath === document.uri.fsPath &&
      cache?.version === document.version
    ) {
      return cache.result
    } else {
      PerlTidyEditProvider.formatCache = undefined
    }
  }

  const executable = PerlTidyEditProvider.options.perltidyPath ?? "perltidy"
  const configPath = PerlTidyEditProvider.options.configPath
  const targetText = document.getText()

  const perltidy = child_process.spawn(
    executable,
    ["-st", "-se", configPath ? `-pro=${configPath}` : undefined].filter(
      (maybeString): maybeString is string => typeof maybeString !== "undefined"
    ),
    { cwd: path.dirname(document.uri.fsPath) }
  )
  perltidy.stdin.write(targetText)
  perltidy.stdin.end()

  const resultBuffers: Buffer[] = []
  perltidy.stdout.on("data", (data: Buffer) => {
    resultBuffers.push(data)
  })

  const errorBuffers: Buffer[] = []
  perltidy.stderr.on("data", (data: Buffer) => {
    errorBuffers.push(data)
  })

  const result = await new Promise<FormatResult>((resolve) => {
    perltidy.stdout.on("end", () => {
      if (errorBuffers.length !== 0) {
        resolve({
          error: errorBuffers.join(""),
        })
        return
      }

      if (resultBuffers.length !== 0) {
        resolve({
          content: resultBuffers.join(""),
        })
      }
    })
  })

  PerlTidyEditProvider.formatCache = {
    filePath: document.uri.fsPath,
    version: document.version,
    result,
  }

  return result
}
