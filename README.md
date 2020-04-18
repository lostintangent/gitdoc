# GitDoc 📄

GitDoc is a Visual Studio Code extension that allows you to edit git repos like they're a multi-file, versioned document. This gives you the simplicity of a Google/Word Doc (creating "snapshots" by saving, not by running `git commit`), but with the richness of git history, and the ability to easily [share](https://github.com) your work. You can enable these auto-commits during specific periods (e.g. when you're working on a feature branch and want to track the evolution of a change), permanently on [specific branches](#auto-commiting-specific-branches) (e.g. you have a `docs` repo that you want to version like a document), or only for [specific files](#auto-commiting-specific-files) (e.g. auto-commmit `*.md` files, but nothing else), which allows you to easily switch between "versioning modalities". Additionally, you can opt into [auto-pushing](#auto-pushing) your changes to a remote, in order to treat your repo as a fully synchronized document source.

<img width="700px" src="https://user-images.githubusercontent.com/116461/79521572-5a3bfe00-800e-11ea-83a0-8e125122fa8f.gif" />

## Getting Started

1. Install this extension
2. Run the `GitDoc: Enable` command, and notice that your status bar now includes a `GitDoc` button. This indicates that `GitDoc` is enabled 🚀
3. Open a file, make a change, and then save it
4. Open the `Timeline` view on the `Explorer` tab (or run `git log`) and notice that a new commit was created for the change you just saved
5. Select the top item in the `Timeline` view to see the diff of the change you just made
6. Continue to make changes, knowing that they'll be automatically tracked 👍
7. When you're done, simply click the `GitDoc` button in your status bar, run the `GitDoc: Disable` command, or close/reload VS Code

From here, you can permanently enable auto-commits for an entire repo or [branch](#auto-commiting-specific-branches), customize the [files that are auto-committed](#auto-commiting-specific-files), and even [auto-push your changes](#auto-pushing) in order to keep your repo fully synced.

## Auto-pushing

In addition to automatically created commits, you can also choose to automatically push your changes, by setting the `GitDoc: Auto Push` setting. By default, this setting is set to `off`, but you can set it to `onSave` in order to push every save, or `afterDelay` in order to push on some sort of frequency. If you set it to the later, then you can control the delay duration by setting the `GitDoc: Auto Push Delay` setting.

## Auto-saving

When you enable `GitDoc`, it creates a new commit anytime you save a file. This allows you to control when commits are created, simply be determining when you save. You can save a single file, or multiple files, and all of the changes within a single "save operation" will be committed together.

If you'd like to automatically track your changes, without needing to explicitly save, then simply set the `Files: Auto Save` setting, specifying the exact behavior you'd like (e.g. save every 30s).

## Auto-commiting specific branches

In addition to enabling `GitDoc` during temporary periods, you can also choose to enable it on specific branches, in order to automatically track your work for as long as you're using the branch. Simply switch to the desired branch and run `GitDoc: Enable (Branch)`.

## Auto-commiting specific files

If you'd like to only enable auto-commiting for specific files, you can set the `GitDoc: File Pattern` setting to a file glob. For example, you could set this to `**/*.md` in order to auto-commit markdown files, but nothing else. By default, this is set to `**/*`, which auto-commits changes to any file.

When this setting is set, the `GitDoc` [status bar](#status-bar) which only appear when you have a file that is matches it. This way, you can easily tell when you're editing a file that will be auto-committed/pushed.

## Status Bar

Whenever `GitDoc` is enabled, it will contribute a status bar item to your status bar. This simply indicates that it's enabled, and makes it easier for you to know which "versioning mode" you're in (auto-commit vs. manual commit). Additionally, if you enable [auto-pushing](#auto-pushing), then the status bar will indicate when it's syncing your commits with your repo.

If you click the `GitDoc` status bar item, this will disable `GitDoc`. This allows you to easily enable GitDoc for a period of time, and then quickly turn it off. Note that if you've enabled GitDoc on a branch, then clicking the status bar only temporarily disables it, and it will become re-enabled the next time that you reload/open VS Code. If you want to permanently disable GitDoc for the current branch, run the `GitDoc: Disable (Branch)` command.

## Contributed Commands

When you install the `GitDoc` extension, the following commands are contributed to the command palette, and are visible when your open workspace is also a git repository:

- `GitDoc: Enable` - Temporarily enables auto-commits. This command is only visible when GitDoc isn't already enabled.

- `GitDoc: Enable (Branch)` - Enables auto-commits on the current branch, and therefore, the setting will persist across reloading VS Code. This command is only visible when GitDoc isn't already enabled.

- `GitDoc: Disabled` - Disables auto-commits. If auto-commits were enabled on this branch, then runnning this command only temporarily disables it, and it will be re-enabled when you reload/re-open VS Code. This is useful if you have a branch that you generally want to auto-commit on, but you want to turn it off for a certain period/editing session. This command is only visible when GitDoc is already enabled.

- `GitDoc: Disabled (Branch)` - Disables auto-commits on the current branch. This command is only visible when GitDoc is already enabled for the current branch.

## Contributed Settings

The following settings enable youn

- `GitDoc: Autopush` - Specifies whether to automatically push changes to the current remote. Can be set to one of the following values: `afterDelay`, `onSave` or `off`. Defaults to `off`.

- `GitDoc: Autopush Delay` - Controls the delay in ms after which any commits are automatically pushed. Only applies when `GitDoc: Auto Push` is set to `afterDelay`.

- `GitDoc: Commit Message Format` - Specifies the [moment.js](https://momentjs.com/) format string to use when generating auto-commit messages. Defaults to `LLL`.

- `GitDoc: Enabled` - Specifies whether to automatically create a commit each time you save a file.

- `GitDoc: File Pattern` - Specifies a glob that indicates the exact files that should be automatically committed. This is useful if you'd like to only [auto-commiting specific files](#auto-commiting-specific-files), as opposed to an entire branch.
