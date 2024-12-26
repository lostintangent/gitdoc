# GitDoc 📄

GitDoc is a Visual Studio Code extension that allows you to automatically commit/push/pull changes on save. This gives you the simplicity of a Google/Word Doc (creating "snapshots" by saving, not by running `git commit`), but with the richness of git history, and the ability to easily [share](https://github.com) your work. You can enable these auto-commits during specific periods (e.g. when you're working on a feature branch and want to track the evolution of a change), permanently on [specific branches](#auto-commiting-specific-branches) (e.g. you have a `docs` repo that you want to version like a document), or only for [specific files](#auto-commiting-specific-files) (e.g. auto-commmit `*.md` files, but nothing else). This allows you to easily switch between "versioning modalities", in order to support the diverse set of use cases that can benefit from being stored in a git repo (e.g. team projects, your personal blog, school work, etc.)

By default, commits are only created for [error-free code](#error-detection), which allows you to author and save changes, knowing you aren't accidentally persisting invalid states. Additionally, just because you're auto-commmiting your changes, doesn't mean you lose control over your version history. When needed, you can easily [restore](#restoring-versions), [undo](#undoing-changes), and/or [squash](#squashing-versions) versions, without needing to memorize the [magic of git](https://sethrobertson.github.io/GitFixUm/fixup.html) 🦸‍♀️

<img width="700px" src="https://user-images.githubusercontent.com/116461/79521572-5a3bfe00-800e-11ea-83a0-8e125122fa8f.gif" />

## Getting Started

1. Install this extension
2. Run the `GitDoc: Enable` command, and notice that your status bar now includes a "mirror" icon button. This indicates that `GitDoc` is enabled 🚀
3. Open a file, make a change, and then save it
4. Open the `Timeline` view on the `Explorer` tab (or run `git log`), and within 30s, notice that a new commit was created on your behalf
5. Select the top item in the `Timeline` view to see the diff of the change you just made
6. Continue to make changes, knowing that they'll be automatically tracked for you (as long as they don't contain [errors](#error-detection)) 👍

From here, you can [restore](#restoring-versions), [undo](#undoing-changes), and/or [squash](#collapsing-versions) versions from the `Timeline`, in order to "clean" up/manage your history. When you're done, simply click the `GitDoc` button in your status bar, or run the `GitDoc: Disable` command, in order to disable auto-commits.

And if you'd like to have GitDoc generate semantic commit messages on your behalf, you can enable the [Copilot integration](#ai-generated-commit-messages), which uses AI to automatically summarize your changes 🤖

## Auto-commiting

By default, when you enable `GitDoc`, it will create commits every 30s, _whenever there are actually changes_. So if you don't make any changes, than it won't make any commits. However, if you're continuously writing code, then it's only going to capture those edits in 30s intervals. This way, you don't generate a massive number of commits, depending on how frequently you save files. If you find that 30s is too short or too long, you can customize this by setting the `GitDoc: Auto Commit Delay` setting to the appropriate value.

### Error Detection

By default, auto-commits are only made when a file is changed, and it doesn't have any pending errors (e.g. issues in the `Problems` panel with an `error` severity). This prevents you from creating commits that represent invalid changes, and allows you to install whatever linting/testing/build extensions you want, knowing that they'll "gate" your auto-commits. If you want to suppress commits in the presence of warnings, or ignore problems entirely, and simply always auto-commit, then you can set the `GitDoc: Commit Validation Level` setting to `warning` or `none` respectively.

<img width="600px" src="https://user-images.githubusercontent.com/116461/80316927-8c3f2400-87b5-11ea-9e6f-62b28ec3b4ce.gif" />

### Auto-commiting specific files

If you'd like to only enable auto-commiting for specific files, you can set the `GitDoc: File Pattern` setting to a file glob. For example, you could set this to `**/*.md` in order to auto-commit markdown files, but nothing else. By default, this is set to `**/*`, which auto-commits changes to any file.

When this setting is set, the `GitDoc` [status bar](#status-bar) which only appear when you have a file that is matches it. This way, you can easily tell when you're editing a file that will be auto-committed/pushed.

### Auto-saving

When you enable `GitDoc`, it creates a new commit anytime you save a file. This allows you to control when commits are created, simply be determining when you save. You can save a single file, or multiple files, and all of the changes within a single "save operation" will be committed together. If you'd like to automatically track your changes, without needing to explicitly save, then simply set the `Files: Auto Save` setting, specifying the exact behavior you'd like (e.g. save every 30s).

## Auto-pushing

In addition to automatically creating commits, GitDoc will automatically push your changes to the configured remote. By default, changes will be pushed as soon as you commit them, but this can be configured via the `GitDoc: Autopush` setting. This can be set to `afterDelay` in order to push on some sort of frequency (controlled via the `GitDoc: Auto Push Delay` setting). Additionally, if you don't want to auto-push changes, you can disable this behavior by setting the `GitDoc: Autopush` setting to `off`.

By default, GitDoc will perform a "force push", since certain operations such as [`squashing`](#squashing-versions) can actually re-write history. However, if you'd like to change this behavior, you can set the `GitDoc: Push Mode` to either `Force Push with Lease` or `Push`.

## Auto-pulling

By default, when you enable `GitDoc`, it will automatically pull changes from the repo when you 1) open the workspace, and 2) [push changes](#auto-pushing). This ensures that your local copy is in sync with the remote, and attempts to mitigate merge conflics from happening. If you'd like to modify this behavior, you can customize the `GitDoc: Auto Pull` and `GitDoc: Pull on Open` settings.

## AI-Generated Commit Messages

By default, GitDoc generates commit messages based on the day and time that they're committed. However, it can also use AI to generate commit messages based on contents of the changes you make. If you'd like to enable this capability, simply install the Copilot extension, and then enable the `GitDoc > AI: Enabled` setting. Once complete, you'll notice that your auto-commits now have semantic/friendly messages.

By default, GitDoc uses `gpt-4o` for generating commit messages, but you can only try out other models (e.g. `o1`, `claude-3.5-sonnet`) by changing the `GitDoc > AI: Model` setting. Additionally, if you'd like to prepend an emoji to the AI-generated commit messages, then enable the `GitDoc > AI: Use Emojis` setting. And if you'd like to provide GitDoc with more specific stylistic preferences, then you can set the `GitDoc > AI: Custom Instructions` setting to include any additional guidance (e.g. "Use only lowercase letters").

## Squashing versions

Auto-committing is useful for tracking unique versions, however, depending on how frequently you save, you could end up creating a significant number of file versions. If a series of versions represent a single logical change, you can "squash" them together by right-clicking the oldest version in the `Timeline` tree and selecting the `Squash Version(s) Above` command. You can give the new version a name, and when submitted, the selected version, and all versions above it, will be "squashed" into a single version.

<img width="700px" src="https://user-images.githubusercontent.com/116461/79668805-3c84ab00-816c-11ea-9ec9-845650b999b8.gif" />

> Demystification: Behind the scenes, this command performs a `git reset --soft`, starting at the commit _before_ the selected one. It then runs `git commit -m <message>`, where `message` is the string you specified. This preserves your working directory/index, while "rewritting" the commit history.

## Undoing versions

If you made a change, that you want to undo, you can simply open up the `Timeline` view, right-click the version you want to undo, and select `Undo Version`. This will create a new version that undos the changes that were made in the selected version. This way, any undo action is actually a "forward edit", that you can then undo again if needed.

> Demystification: Behind the scenes, this command simply performs a `git revert` on the selcted commit. Because this is a "safe" action, you can generally perform it without any problems (including on shared branches), since it doesn't re-write history.

## Restoring versions

If you've made a bunch of changes to a file, and want to restore an older version, simply open up the `Timeline` tree, right-click the desired version, and select `Restore Version`.

> Demystification: Behind the scenes, this command peforms a `git checkout -- <file>` (on the file that's associated with the selected timeline item), followed by `git commit` (in order to commit the restoration). This way, the restore is a "forward moving" operation.

## Status Bar

Whenever `GitDoc` is enabled, it will contribute a status bar item to your status bar. This simply indicates that it's enabled, and makes it easier for you to know which "versioning mode" you're in (auto-commit vs. manual commit). Additionally, if you enable [auto-pushing](#auto-pushing), then the status bar will indicate when it's syncing your commits with your repo. If you click the `GitDoc` status bar item, this will disable `GitDoc`. This allows you to easily enable GitDoc for a period of time, and then quickly turn it off.

## Contributed Commands

When you install the `GitDoc` extension, the following commands are contributed to the command palette, and are visible when your open workspace is also a git repository:

- `GitDoc: Enable` - Enables auto-commits. This command is only visible when GitDoc isn't already enabled.

- `GitDoc: Disable` - Disables auto-commits. This command is only visible when GitDoc is enabled.

- `GitDoc: Commit` - Manually commits changes. This command allows you to trigger a commit without waiting for the auto-commit interval.

## Contributed Settings

The following settings enable you to customize the default behavior of `GitDoc`:

- `GitDoc: Auto Commit Delay` - Controls the delay in ms after which any changes are automatically committed. Only applies when `GitDoc: Enabled` is set to `true`. Defaults to `30000` (30s).

- `GitDoc: Autopull` - Specifies whether to automatically pull changes from the current remote. Can be set to one of the following values: `afterDelay`, `onCommit`, `onPush`, or `off`. Defaults to `onPush`.

- `GitDoc: Autopull Delay` - Controls the delay in ms after which any changes are automatically pulled. Only applies when `GitDoc: Auto Pull` is set to `afterDelay`. Defaults to `30000`.

- `GitDoc: Autopush` - Specifies whether to automatically push changes to the current remote. Can be set to one of the following values: `afterDelay`, `onCommit`,or `off`. Defaults to `onCommit`.

- `GitDoc: Autopush Delay` - Controls the delay in ms after which any commits are automatically pushed. Only applies when `GitDoc: Auto Push` is set to `afterDelay`. Defaults to `30000`.

- `GitDoc: Commit Message Format` - Specifies the [moment.js](https://momentjs.com/) format string to use when generating auto-commit messages. Defaults to `LLL`.

- `GitDoc: Commit Validation Level` - Specifies whether to validate that a file is free of problems, before attempting to commit changes to it. Defaults to `error`.

- `GitDoc: Commit on Close` - Specifies whether to automatically commit changes when you close VS Code. Defaults to `true`.

- `GitDoc: Enabled` - Specifies whether to automatically create a commit each time you save a file.

- `GitDoc: File Pattern` - Specifies a glob that indicates the exact files that should be automatically committed. This is useful if you'd like to only [auto-commiting specific files](#auto-commiting-specific-files), as opposed to an entire branch.

- `GitDoc: Pull on Open` - Specifies whether to automatically pull remote changes when you open a repo. Defaults to `true`.

- `GitDoc: Push Mode` - Specifies how changes should be pushed after they're committed. This setting only applies when auto-pushing is enabled. Can be set to one of the following values: `forcePushWithLease`, `forcePush`, or `push`. Defaults to `forcePush`.

- `GitDoc: Exclude Branches` - Specifies a list of branches that should be excluded from auto-commits. This allows you to prevent auto-commits on specific branches, ensuring that your work on these branches remains manual. This is particularly useful for branches where you want to have more control over the commits, such as production or release branches. Defaults to `[]`.

- `GitDoc: No Verify` - Specifies whether to ignore any configured git hooks. Defaults to `false`.

### AI Settings

- `GitDoc > AI: Enabled` - Specifies whether to use AI to generate commit messages. This setting only applies when you have the Copilot extension installed and setup.

- `GitDoc > AI: Model` - Specifies the AI model to use when generating commit messages. This setting only applies when `GitDoc > AI: Enabled` is set to `true`. Defaults to `gpt-4o`.

- `GitDoc > AI: Custom Instructions` - Specifies custom instructions to use when generating commit messages (e.g. use conventional commit syntax, use emojis). This setting only applies when `GitDoc > AI: Enabled` is set to `true`."

- `GitDoc > AI: Use Emojis` - Specifies whether to prepend AI-generated commit messages with an emoji. This setting only applies when `GitDoc > AI: Enabled` is set to `true`. Defaults to `false`.