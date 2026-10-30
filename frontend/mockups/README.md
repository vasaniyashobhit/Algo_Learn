# AlgoLearn mockups (Session 11)

Static HTML reference for choosing a visual direction. Not imported by the app, excluded from
lint and tests. View with `npx serve frontend/mockups` and open `/`.

## Shape brief (information architecture)

**Job and audience.** College students (mostly India, rated 800–2000) upsolving after a contest or
practising late at night, mostly on laptops. Landing is Persuade; every other screen is Operate.

**Outcome.** Know the weakest topics, get unstuck with hints before the answer, always have a next
problem at the right difficulty. Proof is the product's own mechanism: per-topic and per-pair
strength numbers, concept gap, easier similar problems.

**Screens and states.**

| Screen | Content | States |
|---|---|---|
| Landing | Hero with parallax layers, 3 steps, 4 features, practice-only note, CTA | — |
| Auth | Log in / sign up tabs, optional handle on sign-up | Inline field error |
| Dashboard | Rating + sync + handle state, 4 stat tiles, radar (8 most-practised topics), weakest 5 (incl. pairs), 30-day activity, 3 next topics with reasons, 4 recommended problems | Skeleton, no handle (+ handle not found), not synced, CF down (stale data), sync running, unexpected error with request ID |
| I'm stuck | Tabs text / link / PDF / image, drag-and-drop, char count, hourly quota | — |
| Stuck result | Problem header + tags (gap tags marked), hints one by one (AI label), concept gap with numbers, easier similar problems (+ add to practice), full-solution reveal | Fallback (AI busy → editorial, gap, similar, retry), skeleton, unreadable input, rate limited, link failed, unexpected error |
| Problem detail | Meta, tags, KaTeX statement, actions (practice, I'm stuck), similar problems | — |
| Practice | Filter, list with rating/topics/source/status, "I solved it" verify | Not-solved-yet notice, empty |
| History | Paged stuck queries with input type, answer source, gap, delete | — |

**Interaction.** Hints are sequential; the solution needs a second, deliberate action. Copy is
practice-only on landing, auth and stuck input. Colour is never the only signal (numbers, hatching or
mark shapes). All motion degrades under `prefers-reduced-motion`.

**Constraints.** Product name AlgoLearn, no Codeforces branding, dark mode required, 1024px+ first,
no invented testimonials or user counts. Sample data uses real problems (1811/G2, 1288/C, 474/D, ...).

## Direction round

Rolled with `impeccable concept-seed --scope direction --mode persuade` (seed:852b9b110a3ade01).
The user's brief asked for three built directions to compare, so the comparison page stands in for
the decision page.

Grounded list, by resonance: 1 coaching-institute study module · 2 squared practice notebook ·
3 cricket scorecard and broadcast graphics · 4 railway departure board · 5 chess crosstable ·
6 classroom chalkboard · 7 library card catalogue.

- **B · Scorecard** = assigned candidate 3.
- **A · Module** = Impeccable's pick (candidate 1). Honest risk: the most familiar of the three.
- **C · Graph notebook** = candidate 2.

Challengers (all declined on audience fit and clarity), with what each one lent:

- Normalled jackfield → B carries state by mark shape (■ solved, □ tried, × wrong), not by hue.
- Timetable slide rack → B ranks with weight, case and one reversed yellow plate per screen.
- Multiplane cel dawn → every hero uses real separate depth planes that freeze under reduced motion.
- Nixie counter → stat figures keep fixed digit places (tabular numerals, count-up).
- Industrial quote grammar, punk paste-up → declined; nothing borrowed.

## Next

After the user picks a direction: record its direction contract in the surface brief, send the
telemetry ping (`concept-seed --from seed:852b9b110a3ade01 ... --kind assigned|pick|grounded`), build
React from it, then write DESIGN.md from the built result.
