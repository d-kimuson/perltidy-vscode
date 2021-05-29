import * as vscode from "vscode"
import * as child_process from "child_process"
import * as path from "path"

export type PerlTidyEditProviderOptions = {
  enable: boolean
  perltidyPath?: string
  configPath?: string
}

export class PerlTidyEditProvider
  implements
    vscode.DocumentRangeFormattingEditProvider,
    vscode.DocumentFormattingEditProvider
{
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
  const executable = PerlTidyEditProvider.options.perltidyPath ?? "perltidy"
  const configPath = PerlTidyEditProvider.options.configPath
  const allRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(
      document.lineCount - 1,
      document.lineAt(document.lineCount - 1).text.length
    )
  )

  const perltidy = child_process.spawn(
    executable,
    ["-st", "-se", configPath ? `-pro=${configPath}` : undefined].filter(
      (maybeString): maybeString is string => typeof maybeString !== "undefined"
    ),
    { cwd: path.dirname(document.uri.fsPath) }
  )
  perltidy.stdin.write(document.getText(range))
  perltidy.stdin.end()

  const resultBuffers: Buffer[] = []
  perltidy.stdout.on("data", (data: Buffer) => {
    resultBuffers.push(data)
  })

  const errorBuffers: Buffer[] = []
  perltidy.stderr.on("data", (data: Buffer) => {
    errorBuffers.push(data)
  })

  return new Promise((resolve, reject) => {
    try {
      perltidy.stdout.on("end", () => {
        if (errorBuffers.length !== 0) {
          vscode.window.showErrorMessage(
            "Failed format, Error: ",
            errorBuffers.join("")
          )
          reject()
          return
        }

        if (resultBuffers.length !== 0) {
          // format 後のテキストを取得 + (rangeのときは)末尾改行コードの削除
          let formatText = resultBuffers.join("")
          formatText = !range?.isEqual(allRange)
            ? formatText.replace(/(.*)\r?\n$/, "$1")
            : formatText

          if (formatText === "" && range) {
            resolve([
              new vscode.TextEdit(
                new vscode.Range(
                  new vscode.Position(range.start.line, range.start.character),
                  new vscode.Position(range.end.line + 1, 0)
                ),
                formatText
              ),
            ])
            return
          }

          resolve([new vscode.TextEdit(range ?? allRange, formatText)])
        }
      })
    } catch (error) {
      vscode.window.showErrorMessage("Failed format, Error: ", error)
      reject()
    }
  })
}
