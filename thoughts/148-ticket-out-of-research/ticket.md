# Ticket — 148

Input for Design and later phases only. Research never reads this file.

**ID:** 148
**Link:** https://github.com/Allan-Nava/qrspi/issues/148
**Title:** The ticket reaches Research through 00-questions.md, against rule 4

Rule 4: the ticket does not enter Research; it returns in Design. `/qrspi:next` says so when it prints the Research prompt — "Input: `00-questions.md` only — **not** the ticket". But `/qrspi:new` writes the ticket verbatim into `00-questions.md` (its `## Ticket` section, from the `TICKET:` block of `skills/qrspi/references/00-questions.md`), and `00-questions.md` is Research's one input. So every Research session reads the ticket.

Seen on the #141 run, 2026-10-11: both Research artifacts quote the ticket's "Wanted" and "Done when" back as facts to confirm or contradict.

**Options for Design**: keep the ticket out of `00-questions.md` (a separate `ticket.md` that Design reads and Research does not), or keep it there and have the Research prompt say to skip that section — weaker, since the text is still in context.

**Done when**
- [ ] A Research session started from `/qrspi:next` has no copy of the ticket in its input.
- [ ] Design still receives the ticket.
