# 00 · Questions — 148 The ticket reaches Research through 00-questions.md

**Written against:** `b6deb02`

The default assumption is what makes this phase non-blocking: work can proceed
without waiting for answers, and the assumptions are on the record.

---

## Ticket

**ID:** 148
**Link:** https://github.com/Allan-Nava/qrspi/issues/148
**Title:** The ticket reaches Research through 00-questions.md, against rule 4

Rule 4: the ticket does not enter Research; it returns in Design. `/qrspi:next` says so when it prints the Research prompt — "Input: `00-questions.md` only — **not** the ticket". But `/qrspi:new` writes the ticket verbatim into `00-questions.md` (its `## Ticket` section, from the `TICKET:` block of `skills/qrspi/references/00-questions.md`), and `00-questions.md` is Research's one input. So every Research session reads the ticket.

Seen on the #141 run, 2026-10-11: both Research artifacts quote the ticket's "Wanted" and "Done when" back as facts to confirm or contradict.

**Options for Design**: keep the ticket out of `00-questions.md` (a separate `ticket.md` that Design reads and Research does not), or keep it there and have the Research prompt say to skip that section — weaker, since the text is still in context.

**Done when**
- [ ] A Research session started from `/qrspi:next` has no copy of the ticket in its input.
- [ ] Design still receives the ticket.

---

## Questions

### Q1 · What counts as "the ticket" that must stay out of Research — the whole text, or also its title and ID?

- **Risk if unresolved:** the task title sits in the H1 of every artifact, so a strict reading forbids it everywhere and makes every artifact anonymous; a loose one lets the ticket's goals back in through a long title.
- **Default assumption:** the ID and a short neutral title (the directory slug, the H1) may reach Research; the body, the link, and anything stating what is wanted or when it is done may not.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q2 · Can the Questions phase's own output still leak the ticket — questions that quote it, an "Out of scope" list that paraphrases its goals?

- **Risk if unresolved:** the ticket moves out of its section and comes back in the questions; the done-when is met on paper and Research still confirms the ticket's claims, which is what #141's run showed.
- **Default assumption:** this task removes the verbatim copy and tells the Questions phase not to restate the ticket's goals or claims as facts; a question may name what it asks about. Residual paraphrase is accepted and noted, not policed by a check.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q3 · Must existing task directories, written in the old layout with the ticket inside `00-questions.md`, keep working with `/qrspi:next`?

- **Risk if unresolved:** a user mid-task upgrades the plugin and `/qrspi:next` either refuses their directory or quietly keeps feeding the ticket to Research.
- **Default assumption:** yes — an old directory still advances; `/qrspi:next` says the ticket is inside `00-questions.md` and Research will see it, and no migration is written for the user.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q4 · If the ticket moves to its own file, is that file a phase artifact — with a Status block that `/qrspi:next` gates on and `npm test` checks — or plain input outside the gates?

- **Risk if unresolved:** phase detection counts it as a phase, or `npm test`'s template checks (Status block, human box, placeholders) fail on a file that has no phase.
- **Default assumption:** plain input: no Status block, not gated, not counted as a phase; `npm test` knows it exists and checks only what makes it safe to copy.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q5 · Which later phases read the ticket — Design only, or Structure and Plan too?

- **Risk if unresolved:** the ticket's "Done when" is what Plan's acceptance criteria answer; if only Design reads it and does not carry it forward, the criteria drift from the ticket.
- **Default assumption:** Design reads the ticket and carries its done-when into the Design artifact; Structure and Plan read only their upstream artifacts, as today.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q6 · How is "no copy of the ticket in Research's input" proven — a static check, a real run, or both?

- **Risk if unresolved:** a static check proves the template has no ticket section, not that a session never read the ticket file; a run alone does not stop a later edit from regressing it.
- **Default assumption:** both: `npm test` asserts the shipped templates and the Research prompt carry no ticket section and do not point Research at the ticket; one real Research session, started from `/qrspi:next` on this very task, is checked in its transcript for a distinctive string of the ticket.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q7 · When `/qrspi:new` is given only a ticket URL, who fetches the text, and where does it go?

- **Risk if unresolved:** the URL is written where Research reads it, and a Research session follows it — the ticket enters through the link instead of the text.
- **Default assumption:** the URL is stored with the ticket (wherever the ticket goes), never where Research reads; the Questions and Design phases fetch it when they need the text.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q8 · Must the Codex twins and the copy-mode install change in step?

- **Risk if unresolved:** the fix lands in Claude Code and Codex users keep the old layout; or a copy install ships templates that disagree with the commands.
- **Default assumption:** yes: `skills/qrspi-new`, `skills/qrspi-next` and `skills/qrspi-review` mirror their commands, and `npm test`'s existing step-list comparison covers them.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

### Q9 · Does `/qrspi:review` need to know where the ticket is, when it reviews a Design against it?

- **Risk if unresolved:** the reviewer judges a Design without the ticket it was meant to answer, or reads the ticket while reviewing Research and calls Research incomplete for not answering it.
- **Default assumption:** `/qrspi:review` reads the ticket for Design and later artifacts and never for Questions' answers or Research.
- **Answer:** default accepted (Allan Nava, 2026-11-16).

---

## Out of scope

Things the ticket might suggest but that we are **not** doing in this task:

- Which model and effort the Research subagents run on, and whether the main thread explores by itself (#140, #149, #150).
- Rewriting existing users' task directories into a new layout.
- Changing what Research investigates or how its artifact is shaped, beyond what it reads.
- The pipeline check's blind spot for a row deleted from all three files (#151).

---

## Status

- [x] Questions generated
- [x] Reviewed by a human (2026-11-16, Allan Nava)
- [x] Answers collected (or assumptions explicitly accepted)

> Next phase: **Research**. The ticket is **not** passed to Research — only the
> questions and their answers.
