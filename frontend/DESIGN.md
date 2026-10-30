---
name: AlgoLearn
description: A floodlit scorecard for competitive-programming practice. Dark by default, light on request.
colors:
  ground: "#0a1322"
  band: "#111d33"
  band-2: "#19284a"
  line: "#2a3b5e"
  ink: "#edf1f8"
  ink-soft: "#9fb0cc"
  plate: "#ffc629"
  plate-ink: "#10151f"
  plate-text: "#ffc629"
  chalk: "#f3efe4"
  chalk-ink: "#0a1322"
  chalk-miss: "#b23a17"
  figure: "#ffc629"
  miss: "#ff7a59"
  light-ground: "#e9e5d9"
  light-band: "#f6f3ea"
  light-band-2: "#dcd6c5"
  light-line: "#c2bba6"
  light-ink: "#0b1424"
  light-ink-soft: "#4b5670"
  light-plate-text: "#7a5800"
  light-chalk: "#0b1424"
  light-chalk-ink: "#f3efe4"
  light-chalk-miss: "#ff7a59"
  light-figure: "#0b1424"
  light-miss: "#a33412"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "5.6rem"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.04em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.96rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  cut: "2px"
  none: "0px"
spacing:
  xs: "0.35rem"
  sm: "0.6rem"
  md: "1rem"
  lg: "1.6rem"
  xl: "3rem"
  section: "4.5rem"
components:
  button-plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.cut}"
    padding: "0.6rem 1.1rem"
  button-plate-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.cut}"
    padding: "0.6rem 1.1rem"
  button-on-plate:
    backgroundColor: "transparent"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.cut}"
    padding: "0.6rem 1.1rem"
  button-on-plate-hover:
    backgroundColor: "{colors.plate-ink}"
    textColor: "{colors.plate}"
  input:
    backgroundColor: "{colors.band-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.7rem 0.85rem"
  tag:
    backgroundColor: "{colors.band-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.15rem 0.45rem"
  card-band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1.6rem"
  card-chalk:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.chalk-ink}"
    rounded: "{rounded.none}"
    padding: "1.4rem 1.8rem"
---

# Design System: AlgoLearn

## Overview

**Creative North Star: "The Floodlit Scorecard"**

AlgoLearn looks like the scoreboard at a floodlit ground after dark: a night-navy ground, chalk
boards that hold the numbers, and one yellow plate per screen marking the thing that matters most.
Students read a scorecard without being taught, so topic strength reads like a batting average and
the last 30 days read like five overs bowled ball by ball. The tone is a serious training tool: a
nets session, not match day. Nothing is gamified, nothing celebrates, and every cricket element
carries a plain-language label first ("Weak topics") with the cricket name as a small caption
("Batting card").

Density is high and crisp. Ranking comes from weight, case and size, plus the one reversed plate,
never from extra colour. Motion is a broadcast graphics package: things wipe on from the left,
fast and clean, and buttons snap when pressed.

The source mockup is `frontend/mockups/direction-b/` (reference only, never imported).

**Key Characteristics:**
- Dark by default; light is a full theme, not an afterthought. The system preference decides first
  and a saved choice overrides it.
- One yellow plate per screen (the wordmark does not count against it).
- Condensed uppercase display type over a plain, readable body face.
- Hard 2px corners, tables over cards, state shown by mark shape (■ solved, □ tried, × wrong).
- Every cricket-style graphic has a plain label and an accessible table or text alternative.

## Colors

Night navy and chalk, with one floodlight yellow and one warm miss orange.

### Primary
- **Floodlight Plate** (plate): the single highlighted element per screen (primary button, the
  key notice strap, the wordmark). Text on it is always Plate Ink.
- **Plate Ink** (plate-ink): text and outlines on the plate, in both themes.
- **Plate Text** (plate-text / light-plate-text): yellow used as text on the ground. In light mode
  it drops to a deep amber because the plate yellow fails contrast on paper.

### Secondary
- **Miss Orange** (miss / light-miss): weak topics, wrong attempts, field errors and the top rule
  of error alerts. Always paired with a number, a × mark or words.

### Neutral
- **Night Ground** (ground / light-ground): page background.
- **Band** and **Band 2** (band, band-2 and light variants): raised strips, panels, inputs, tags.
- **Line** (line / light-line): rules, dividers, scrollbar thumb.
- **Ink** and **Ink Soft** (ink, ink-soft and light variants): body text and secondary text.
- **Chalk** and **Chalk Ink** (chalk, chalk-ink and light variants): the scoreboard surfaces. In
  light mode chalk inverts to navy so the board stays the darkest, loudest object on the page.
- **Chalk Miss** (chalk-miss / light-chalk-miss): weak rows on the scoreboard. Miss Orange fails on
  light chalk, so the board uses its own deeper or brighter orange.
- **Figure** (figure / light-figure): huge decorative numbers (the auth page 630). Floodlight
  yellow at night, navy on paper, because deep amber reads muddy at that size.

### Named Rules
**The Measured Contrast Rule.** `src/styles/tokens.test.js` parses tokens.css and measures every
text/background pair in both themes (4.5:1 text, 3:1 large figures and focus rings). A new pair gets
a row there.

**The One Plate Rule.** Exactly one Floodlight Plate element per screen besides the wordmark. If
two things want the plate, one of them is wrong.

**The Plate Ink Rule.** Anything placed on the plate, including buttons and their hover states,
uses Plate Ink or a Plate Ink fill, never the theme's ink. (This fixes the low-contrast hover found
in the Session 11 fallback mockup, where a button on the plate inherited the light theme's ink.)

**The Shape Before Hue Rule.** Colour is never the only signal: strength has a number, attempts
have mark shapes, errors have words.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow, sans-serif), self-hosted via @fontsource
**Body Font:** Barlow (with system-ui, sans-serif), self-hosted via @fontsource

**Character:** a broadcast condensed face for anything you would see on a scoreboard, over a plain
humanist sans for anything you have to read.

### Hierarchy
- **Display** (700, clamp(2.6rem, 5.4vw, 5.6rem), 0.92): the landing strap headline only.
- **Headline** (700, 3rem, 1): page titles, big figures.
- **Title** (700, 1.25rem, 1.1, 0.04em): section headings, uppercase.
- **Body** (400, 0.96rem, 1.5): paragraphs, max 68ch.
- **Label** (600, 0.82–0.9rem, 0.06em, uppercase): field labels, nav, tags, captions.
- Step scale: -1 0.82rem · 0 0.96rem · 1 1.25rem · 2 1.9rem · 3 3rem · 4 5.6rem.

### Named Rules
**The Tabular Figures Rule.** Every number that can change (ratings, strengths, counts) uses
tabular numerals so digits keep their places, including during count-up.

**The Caption Rule.** Cricket names appear only as captions (Label style, Ink Soft) under or beside
a plain-language heading.

## Layout

Desktop-first at 1024px and wider. Content sits in a centred column `min(1280px, 100% - 2.5rem)`.
A sticky 52px "score bug" bar runs across the top of every screen. Sections are separated by
4.5rem; groups inside a section by 0.6–1rem. Grids collapse to one column below 860px so nothing
breaks when the window narrows, but there is no dedicated mobile layout yet.

## Elevation & Depth

Mostly flat tonal layering: ground, band, band-2. Shadows appear only under boards and panels that
sit on the ground like a physical scoreboard: `0 2px 4px rgb(0 0 0 / 0.35), 0 14px 32px rgb(0 0 0 /
0.35)` dark, `0 2px 4px rgb(11 20 36 / 0.1), 0 12px 28px rgb(11 20 36 / 0.12)` light. Depth on the
landing hero comes from real parallax planes (floodlight beams 0.35, board 0.12, strap 0).

## Shapes

Hard edges. Buttons use a 2px cut; panels, inputs and tags are square. Accents are inset rules
(a 3–6px top rule on plates and alerts, a 3px underline on the active nav item), never coloured
left stripes and never hard offset shadows.

## Components

Motion tokens shared by all components: enter wipe 380ms, stagger 45ms, press 90ms, easing
`cubic-bezier(0.7, 0, 0.2, 1)`, press scale 0.96, skeleton sweep 1.1s linear. Under
`prefers-reduced-motion` every wipe, stagger, parallax, count-up and sweep is replaced by the final
state.

### Buttons
- **Shape:** 2px cut, 1.5px border, uppercase Label type at 1rem.
- **Plate:** the one primary action. Hover inverts to Ink with Ground text.
- **Outline:** secondary actions. Hover fills with Ink.
- **Text:** tertiary, Ink Soft turning Ink on hover.
- **On plate:** Plate Ink outline on the plate; hover fills Plate Ink with plate-yellow text.
- **Loading:** a small spinner inside the button, the label stays, the button is disabled and
  `aria-busy`.

### Chips
- **Tag:** Band 2 fill, uppercase label. Gap tags are an inset Miss outline with Miss text.

### Cards / Containers
- **Band panel:** Band fill, no radius, panel shadow. **Chalk board:** Chalk fill, Chalk Ink text,
  a 3px rule under its heading.

### Inputs / Fields
- **Style:** Band 2 fill, square, 2px bottom rule in Line. **Focus:** bottom rule turns Plate.
  **Error:** bottom rule turns Miss, error text below in Miss, linked with `aria-describedby`.

### Navigation
- **Score bug:** sticky Band strip with the plate wordmark on the left, uppercase nav links in
  Ink Soft (Ink and a 3px plate underline when current), and the theme toggle plus account
  actions on the right.

### Theme Toggle
- A text button showing the current theme with a moon (dark) or sun (light) glyph; the label wipes
  across to the new theme. The theme is set
  on `<html data-theme>` by an inline script before React mounts, so there is no flash.

## Do's and Don'ts

### Do:
- **Do** keep exactly one Floodlight Plate per screen.
- **Do** give every cricket graphic a plain heading, a cricket caption and a table or text
  alternative.
- **Do** use tabular numerals for every figure.
- **Do** use Plate Ink for everything on the plate, in both themes.

### Don't:
- **Don't** use purple gradients, glass, or gradient text.
- **Don't** use Codeforces logos or branding.
- **Don't** add celebrations, streak flames, badges or anything that turns practice into a game.
- **Don't** use coloured left stripes on alerts or cards, or hard offset shadows.
- **Don't** write copy that encourages use during live rated contests or assessments.
