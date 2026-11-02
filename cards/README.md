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
- **A change can reach older accounts later** (schema 2). `from` / `until` are the dates for a
  new account; `existingFrom` / `existingUntil` are when the same change reached accounts opened
  before it. A charge is valued with the rules in force on its day *for that card*: opened on or
  after `from` (or after `until`), the first dates; opened before, or not known, the later ones.
  The app knows the month a card was opened (Cards → the card → Opened); the month of a change
  counts as before it. When a card has charges between the two dates and no opening month, its
  row says "Set when you opened it". Older app builds ignore the two keys and read everyone as a
  new account from `from` — close enough until they update.

  Sapphire Reserve's 2025 refresh, as written here:

  | Rule | Dates |
  |---|---|
  | 10x hotels and car rentals, 5x flights through Chase Travel; 3x other travel | `until` 2025-06-22, `existingUntil` 2025-10-25 |
  | 8x Chase Travel; 4x flights and 4x hotels booked direct | `from` 2025-06-23, `existingFrom` 2025-10-26 |
  | 3x dining, 1x everything else, 5x Lyft (`until` 2027-09-30) | no dates |

  Only the current annual fee is held (`annualFeeCents`); a fee change is said in `feeNotes`.
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
   When existing cardholders switched later than new applicants, add `existingUntil` to the old
   rule and `existingFrom` to the new one (the issuer's dates for existing accounts).
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

## The bundled copy (v101)

The app ships `Packages/CohabitCore/Sources/CohabitCore/Resources/cards.json`, the same file as
this one. Keep the two identical (`cp web/cards/catalog.json Packages/CohabitCore/Sources/CohabitCore/Resources/cards.json`).
A copy elsewhere on a Mac (for example `Cohabit/Resources/cards.json`) must be refreshed from this
file too. The app reads schema 1 and schema 2 alike.

## How often phones check (v50)

Terms change a few times a year, so the app checks this file at most once a week and sends the
ETag it got last time; an unchanged file is a 304 and costs a few bytes. The bundled copy in
`Packages/CohabitCore/Sources/CohabitCore/Resources/cards.json` is the fallback, so keep both in
step when you publish. Reports on the phone are recomputed only when the household's data or the
catalog changes.
