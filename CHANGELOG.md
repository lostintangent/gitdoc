## v0.2.3 (12/26/2024)

- Introduced a new `GitDoc > AI: Use Emojis` setting, to alloq prepending AI-generated commit messages with an emoji.

## v0.2.2 (12/26/2024)

- Introduced a new `GitDoc > AI: Custom Instructions` setting, to allow configuring the style/format of the AI-generated commit mesa

## v0.2.1 (12/26/2024)

- Introduced a new `GitDoc: Commit` command, to manually trigger a commit, as opposed to waiting until the next auto-commit
- Introduced a new `GotDoc: No Verify` setting, which allows suppressing git hooks for GitDoc-generated commits
- GitDoc now checks whether a git repo has remotes before trying to push/pull

## v0.2.0 (12/26/2024)

- Introduced the ability to generate semantic commit messages with AI
- The `GitDoc: Auto Commit Delay` and `GitDoc: File Pattern` settings now take affect immediately whenever you change them

## v0.1.0 (08/10/2022)

- Fixed a bug with VS Code v1.70
- Added the `GitDoc: Push Mode` setting, that allows controlling how commits are automatically pushed to the remote repository
- Commit messages now format datetimes using a configured timezone
- Removed the `GitDoc` suffix from the status bar button, in order to reduce UI clutter

## v0.0.8 (03/20/2021)

- Fixed an issue where the GitDoc setting was being written to every workspace you opened

## v0.0.7 (03/07/2021)

- Introduced the ability to auto-pull changes from the remote.
- Changes are now auto-committed when you close VS Code.
- Removed the `GitDoc: Enable (Branch)` and `GitDoc: Disable (Branch)` commands

## v0.0.6 (04/25/2020)

- Auto-commits are now only made when changes files don't have any associated errors. This behavior can be changed with the new `GitDoc: Commit Validation Level` setting.

## v0.0.5 (04/23/2020)

- Introduced the `Undo Version` command to the `Timeline` tree, which allows you to revert a previous change
- Added the new `GitDoc: Auto Commit Delay` setting, which allows you to control how much time to delay creating commits after saving
- Renamed the `Collapse Version(s) Above` command to `Squash Version(s) Above`
- Renamed the `onSave` option of the `GitDoc: Auto Push` setting to `onCommit`

## v0.0.4 (04/19/2020)

- Introduced the `Squash Version(s) Above` command to the `Timeline` tree, which allows you to merge/name a bunch of auto-commits into a single version
- Introduced the `Restore Version` command to the `Timeline` tree, which allows you to restore a previous version of a file

## v0.0.3 (04/18/2020)

- Added the `GitDoc: File Pattern` setting, which allows you to enable auto-commits on only specific files
- Fixed an issue where the commit message and date didn't match

## v0.0.2 (04/17/2020)

- The status bar item now indicates when it is actively syncing or not

## v0.0.1 (04/17/2020)

Initial release! 🎉
