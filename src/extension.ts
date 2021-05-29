import * as vscode from "vscode"

import type { PerlTidyEditProviderOptions } from "~/PerlTidyEditProvider"
import { PerlTidyEditDisposable } from "~/PerlTidyEditDisposable"
import { getConfig } from "~/util/vscode"

export function activate(context: vscode.ExtensionContext): void {
  try {
    const options: PerlTidyEditProviderOptions = {
      enable: getConfig<boolean>("enable"),
      perltidyPath: getConfig<string | null>("perltidyPath") ?? undefined,
      configPath: getConfig<string | null>("configPath") ?? undefined,
    }

    const disposes: vscode.Disposable[] = [new PerlTidyEditDisposable(options)]
    disposes.forEach((dispose) => {
      context.subscriptions.push(dispose)
    })

    console.log("perltidy is activated")
  } catch (error) {
    vscode.window.showErrorMessage("Fail to activate perltidy")
    console.error(error)
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {
  console.log("perltidy is deactivated")
}
