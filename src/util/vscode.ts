import * as vscode from "vscode"

export function getCurrentFilePath(): string | undefined {
  return vscode.window.activeTextEditor?.document.uri.fsPath
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
  const conf = vscode.workspace.getConfiguration("ts-type-expand").get<T>(key)

  if (!conf) {
    throw new Error(`Make sure ${key} option has default value`)
  }

  return conf
}
