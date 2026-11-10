# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

College students, mostly in India, rated about 800–2000 on Codeforces, practicing for campus
placements and contests. They arrive after a contest (upsolving) or during an evening or
late-night practice session, often a little frustrated at being stuck. Mostly on laptops
(1024px and wider); sometimes they check progress on a phone. Their jobs: see their weak
topics, get unstuck with hints before the full answer, and know exactly what to solve next.

## Product Purpose

AlgoLearn is a personal competitive-programming coach built on Codeforces data. It finds
similar problems by tag and rating, tracks the user's strength per topic and per topic pair,
explains the concept gap when they are stuck, and recommends the next topic and problems.
Success: the student knows their weakest topics, learns which concept they were missing,
and always has a concrete next problem at the right difficulty.

## Positioning

Codeforces shows one rating; AlgoLearn shows strength per topic and per topic pair (for
example `bitmasks+dp`), computed from the user's own submissions, and turns being stuck into
a concept gap plus easier similar problems instead of just an answer. For practice and
upsolving only; never for live rated contests or assessments.

## Operating Context

- The Codeforces handle is linked and verified; submissions sync on a schedule or with "Sync now".
- Stuck input: pasted text, a Codeforces or other URL, a PDF, or a screenshot.
- Problem statements use Codeforces LaTeX (`$$$...$$$`), rendered in the UI.
- Hints come first, one at a time; the full solution is a deliberate extra step.

## Capabilities and Constraints

- About 11,700 problems (open-r1/codeforces dataset plus the Codeforces API), ratings
  800–3500 in steps of 100, 36 topic tags (`*special` is not a topic), 630 topic pairs.
- AI answers (Gemini, Groq as backup) may be inaccurate, and may be unavailable or rate-limited.
- Never blank: when AI fails, show the likely topics, weak areas, similar problems and the
  editorial, with a clear notice.
- Stuck requests are limited to 10 per hour per user.
- Stack: React (Vite) frontend, Spring Boot + PostgreSQL backend (see CLAUDE.md).

## Brand Commitments

- The product name is **AlgoLearn** everywhere in the UI (it was submitted to the college).
  Never "CP Coach".
- Voice: a direct, honest, encouraging coach. Technical, not childish, not gamified.
- Dark mode matters (late-night practice). Designed first for laptop/desktop (1024px+).
- No Codeforces logo or branding: AlgoLearn is an independent tool that uses Codeforces data.
- Avoid generic AI-looking styles such as purple gradients.

## Evidence on Hand

- Real problem data: `data/cf_problems.parquet` and the Atlas `problems` collection.
- No testimonials, user counts, logos or benchmarks exist. Do not invent them.

## Product Principles

1. Hints before answers: the user should learn the missing concept, not just copy code.
2. Never blank: every screen shows something useful, even when AI or Codeforces fail.
3. Honest about uncertainty: AI output is labelled as AI and may be wrong.
4. Practice only: copy never encourages use during live rated contests or assessments.
5. Specific next steps: every view ends with a concrete problem or action.

## Accessibility & Inclusion

Color is never the only signal (topic strength also uses numbers and labels). Respect
`prefers-reduced-motion`. Keyboard access and visible focus everywhere.
