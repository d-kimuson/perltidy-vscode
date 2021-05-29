import * as vscode from "vscode"

import {
  PerlTidyEditProviderOptions,
  PerlTidyEditProvider,
} from "~/PerlTidyEditProvider"
import { getCurrentFileLanguage, getActiveWorkspace } from "~/util/vscode"

type LanguageSelector = vscode.DocumentFilter & {
  scheme: "file"
}
type RangeLanguageSelector = vscode.DocumentFilter & {
  scheme: "untitled"
}

export class PerlTidyEditDisposable implements vscode.Disposable {
  private formatterHandler: undefined | vscode.Disposable
  private rangeFormatterHandler: undefined | vscode.Disposable

  constructor(private options: PerlTidyEditProviderOptions) {
    this.registerDocumentFormatEditorProvider()
  }

  public dispose(): void {
    this.formatterHandler?.dispose()
    this.rangeFormatterHandler?.dispose()
  }

  public async registerDocumentFormatEditorProvider(): Promise<void> {
    this.dispose()
    const editProvider = new PerlTidyEditProvider(this.options)

    const selectors = await this.getSelectors()
    const rangeSelectors = await this.getRangeSelectors()

    this.rangeFormatterHandler =
      vscode.languages.registerDocumentRangeFormattingEditProvider(
        selectors,
        editProvider
      )
    this.formatterHandler =
      vscode.languages.registerDocumentFormattingEditProvider(
        rangeSelectors,
        editProvider
      )
  }

  private async getRangeSelectors(): Promise<RangeLanguageSelector[]> {
    const fileLanguage = getCurrentFileLanguage()
    if (fileLanguage !== "perl") {
      return []
    }

    const workspace = getActiveWorkspace()
    if (!workspace) {
      return []
    }

    return [
      {
        language: fileLanguage,
        pattern: `${workspace.uri.fsPath}/**/*.pl`,
        scheme: "untitled",
      },
      {
        language: fileLanguage,
        pattern: `${workspace.uri.fsPath}/**/*.pm`,
        scheme: "untitled",
      },
    ]
  }

  private async getSelectors(): Promise<LanguageSelector[]> {
    const fileLanguage = getCurrentFileLanguage()
    if (fileLanguage !== "perl") {
      return []
    }

    const workspace = getActiveWorkspace()
    if (!workspace) {
      return []
    }

    return [
      {
        language: fileLanguage,
        pattern: `${workspace.uri.fsPath}/**/*.pl`,
        scheme: "file",
      },
      {
        language: fileLanguage,
        pattern: `${workspace.uri.fsPath}/**/*.pm`,
        scheme: "file",
      },
    ]
  }
}
