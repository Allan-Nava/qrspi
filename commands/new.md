---
description: Bootstrap a QRSPI task — create thoughts/<task-id>/ from the phase templates and run the Questions phase
argument-hint: <TASK-ID> [ticket text, URL, or nothing]
allowed-tools: Bash(mkdir *), Bash(cp *), Bash(ls *), Bash(rm *), Read, Write, Edit
---

# Bootstrap a QRSPI task

Arguments: `$ARGUMENTS`

The first token is the task ID (e.g. `ENG-1234`). Everything after it, if present, is
the ticket text or a ticket URL.

## Steps

1. **Derive the directory name.** `thoughts/<TASK-ID>-<slug>/`, where `<slug>` is a
   2-4 word kebab-case summary of the ticket. If no ticket text was given, use the
   task ID alone and ask the user for the ticket before continuing to step 4.

2. **Create it and copy the templates:**

   ```bash
   mkdir -p thoughts/<dir>
   cp "${CLAUDE_PLUGIN_ROOT}/skills/qrspi/references/"*.md thoughts/<dir>/
   ```

3. **Fill the ticket into `00-questions.md`:** replace the `## Ticket` placeholders
   with the real ID, link, title, and body. Replace `<TASK-ID> <title>` in the H1 of
   every copied file.

4. **Run the Questions phase now.** Follow the `> PROMPT` block at the top of
   `thoughts/<dir>/00-questions.md`, then fill in the `## Questions` section of that
   same file. Constraints, restated because they are the whole point of this phase:
   - Do NOT propose solutions. Do NOT explore the codebase. Do NOT read any source file.
   - Max 10 questions, ordered by descending risk. More than 10 means the ticket
     needs splitting — say so instead of writing 15 questions.
   - Every question carries a **default assumption**, so the phase never blocks.

5. **Stop.** Report the created path and the questions that need human answers. Then
   tell the user, verbatim:

   > Answer the questions in `thoughts/<dir>/00-questions.md` (or accept the default
   > assumptions), then **start a fresh session** and run `/qrspi:next <dir>`.
   > Research must not inherit this session's context — or the ticket text.

Do not continue into Research in this session. Rule 1 is not negotiable: a fresh
session at every phase boundary.
