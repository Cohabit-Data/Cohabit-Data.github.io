# The card catalog (`catalog.json`)

What each card earns and the credits it carries. The app ships with a copy
(`Packages/CohabitCore/Sources/CohabitCore/Resources/cards.json`, the same file) and checks
this one on the website once a day, keeping whichever has the later `asOf`. So a change here
reaches every phone within a day, without an app release.

## How the app measures with it

- **Points are 1¢ each** unless a household sets a value per program in Cards (3x = 3% back).
  `valuations` here are reference transfer values only — shown as "Typical when transferred"
  next to the setting, never used on their own.
- **Each charge is valued by the terms on its day.** A rule or credit can carry `from` and
  `until` ("YYYY-MM-DD"). Last quarter's spending keeps last quarter's rates after a change.
- **Credits** are counted per stretch (month, quarter, half, year) from charges on that card
  whose name carries one of the credit's `hints`, or marked used by hand.
- Every card carries `checkedOn`, the day someone last checked it against its `sources`. The
  app shows it under the card, and if the whole file is more than 120 days old it says the
  terms may have changed.

## Keeping it current (monthly, first week)

1. For each card, open its `sources` and compare the earning table, credits, fee and any
   enrolment rule.
2. **Never edit a changed rule in place.** Give the old one an `until` (the last day it
   applied) and add the new one with a `from`. Same for credits that end, start or change size.
3. Set `checkedOn` on every card you checked, even if nothing changed.
4. New card: add it with `hints` (words in a bank's account name: "SAPPHIRE", "CSR"),
   `sources`, `checkedOn`.
5. Bump `asOf` to today and add a line to `changes` saying what moved.
6. Check: `python3 -m json.tool catalog.json > /dev/null`, copy the file over the app's
   bundled one, run `swift test --package-path Packages/CohabitCore` (the catalog tests read
   it), then publish `web/`.

## Later

- A scheduled job that fetches each card's sources and flags a page that changed since
  `checkedOn` (a human still decides what changed).
- The day each card was opened, so annual credits follow the card year, not the calendar.
- Caps (`capCents`/`capPeriod`) applied in the optimiser.

## How often phones check (v50)

Terms change a few times a year, so the app checks this file at most once a week and sends the
ETag it got last time; an unchanged file is a 304 and costs a few bytes. The bundled copy in
`Packages/CohabitCore/Sources/CohabitCore/Resources/cards.json` is the fallback, so keep both in
step when you publish. Reports on the phone are recomputed only when the household's data or the
catalog changes.
