import * as vscode from "vscode"

export function activate(context: vscode.ExtensionContext): void {
  try {
    const disposes: vscode.Disposable[] = []
    disposes.forEach((dispose) => {
      context.subscriptions.push(dispose)
    })
  } catch (error) {
    vscode.window.showErrorMessage(error)
  }

  console.log("perltidy is activated")
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {
  console.log("perltidy is deactivated")
}
