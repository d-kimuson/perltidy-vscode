import * as vscode from "vscode"

export function getCurrentFilePath(): string | undefined {
  return vscode.window.activeTextEditor?.document.uri.fsPath
}

export function getCurrentFileLanguage(): string | undefined {
  return vscode.window.activeTextEditor?.document.languageId
}

export function getCurrentSelector(): string | undefined {
  return vscode.window.activeTextEditor?.document.languageId
}

export function getActiveWorkspace(): vscode.WorkspaceFolder | undefined {
  const workspaces = vscode.workspace.workspaceFolders || []

  return workspaces.length === 1
    ? workspaces[0]
    : workspaces.find((workspaceFolder) =>
        getCurrentFilePath()?.startsWith(workspaceFolder.uri.fsPath)
      )
}

export function getConfig<T>(key: string): T {
  const conf = vscode.workspace
    .getConfiguration("perltidy-vscode")
    .get<T>(key) as T

  return conf
}
