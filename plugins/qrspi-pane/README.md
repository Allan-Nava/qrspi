# qrspi-pane

A Claude Code mod — a plugin of function hooks — that draws the QRSPI tasks under
`thoughts/` as a pane. For each task: the phases Q R D S P done (green), the current one
(yellow) with the boxes still open under its `## Status`, the Implement steps done out of
those in `99-progress.md`, and the `/qrspi:next` command to run next.

It reads the artifacts the way `/qrspi:next` does — a phase is done when every Status box
is ticked and no `_(to be filled` placeholder is left — and never writes anything.

```
/plugin install qrspi-pane@allan-nava
/qrspi-status                  # the session's project
/qrspi-status ../other-repo    # another project's thoughts/
```

It refreshes after every turn and every 10 seconds. A pane opened by the command seats at
any width.

Developing it: `claude --plugin-dir plugins/qrspi-pane` loads it from the checkout and
reloads it on save; `claude plugin validate plugins/qrspi-pane` checks the module before a
session does. `/plugin-types` writes the engine's types under `.claude-plugin/types/`
(gitignored), which `tsconfig.json` uses.
