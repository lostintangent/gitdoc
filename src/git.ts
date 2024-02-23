import * as vscode from "vscode";
import * as path from "path"; // P0470: Import path module

interface CommitOptions {
  all?: boolean | "tracked";
}

interface Branch {
  readonly name: string;
}

interface RepositoryState {
  HEAD: Branch | undefined | null;
  refs: Branch[];
  workingTreeChanges: Change[];
  indexChanges: Change[];
  mergeChanges: Change[];
  onDidChange: vscode.Event<void>;
}

export interface Change {
  readonly uri: vscode.Uri;
  readonly submodule?: string; // P0bdb: Add a submodule property to the Change interface
}

export enum ForcePushMode {
  Force,
  ForceWithLease,
}

export interface Repository {
  state: RepositoryState;

  createBranch(name: string, checkout: boolean, ref?: string): Promise<void>;
  deleteBranch(name: string, force?: boolean): Promise<void>;

  checkout(treeish: string): Promise<void>;

  pull(unshallow?: boolean): Promise<void>;

  push(
    remoteName?: string,
    branchName?: string,
    setUpstream?: boolean,
    forcePush?: ForcePushMode
  ): Promise<void>;

  commit(message: string, opts?: CommitOptions): Promise<void>;
}

export interface GitAPI {
  repositories: Repository[];

  getRepository(uri: vscode.Uri): Repository | null;
  onDidOpenRepository: vscode.Event<Repository>;
  onDidCloseRepository: vscode.Event<Repository>;
}

export async function getGitApi(): Promise<GitAPI | undefined> {
  const extension = vscode.extensions.getExtension("vscode.git");
  if (!extension) {
    return;
  }

  if (!extension.isActive) {
    await extension.activate();
  }

  return extension.exports.getAPI(1);
}

// P321d: Add a getSubmodule function that returns the submodule name for a given file path, or null if none
export function getSubmodule(filePath: string, repository: Repository): string | null {
  const submodules = repository.state.refs.filter((ref) => ref.name.startsWith("submodule"));
  for (const submodule of submodules) {
    const submodulePath = path.join(repository.rootUri.fsPath, submodule.name.replace("submodule/", ""));
    if (filePath.startsWith(submodulePath)) {
      return submodule.name;
    }
  }
  return null;
}

// P92d2: Modify the getRepository function to use the getSubmodule function and return the submodule repository if applicable
export function getRepository(uri: vscode.Uri, git: GitAPI): Repository | null {
  const repository = git.getRepository(uri);
  if (!repository) {
    return null;
  }

  const submodule = getSubmodule(uri.fsPath, repository);
  if (submodule) {
    const submoduleRepository = git.repositories.find((repo) => repo.rootUri.fsPath.endsWith(submodule));
    if (submoduleRepository) {
      return submoduleRepository;
    }
  }

  return repository;
}
