# Mobbin references: adopt machine subscriptions

Run in the orchestrating session, per the standard-tier discovery table. Three searches on the `web` platform: detected-account-offered-for-connect, connect-an-integration-listing, and auto-detected-items-ready-to-import.

## What the search ruled out

The import-wizard pattern does not fit. [1Password CSV import](https://mobbin.com/screens/5f8927bd-52f8-4f69-9166-21ac3663cafe), [Clay CSV import](https://mobbin.com/screens/332d89e8-25a0-4228-98b7-9cd0ef69d512), [Dovetail column mapping](https://mobbin.com/screens/c9fa0c6b-43bf-47ee-aa3a-3b7cf9aa399f), and [WRITER terms importer](https://mobbin.com/screens/932f7a0b-33c4-42fe-8131-f492500b1bf2) all spend their screens on a step bar and a column-mapping table. Adoption has nothing to map. One credential is either present or absent, and the person confirms it or does not.

The credential-first sign-in pattern also does not fit. [Substack](https://mobbin.com/screens/e9337878-3263-4602-87dd-8afb2fa7858d), [Linear](https://mobbin.com/screens/27d5ce11-de67-49c0-a92c-49ea46d00b09), [Plane](https://mobbin.com/screens/721af9b9-b3c5-440a-aacb-4c3c8a01140c), and [Shop](https://mobbin.com/screens/be4a674c-8d5a-49f8-a3b5-f8d296f8dc3f) all open with an empty email field. Adoption opens with the answer already known, so an empty field would throw away the whole point.

## What the search supports

### The two-section split

[Coda integrations](https://mobbin.com/screens/30749981-68ec-45ae-955e-0acae5615b4b) puts a section titled "Accounts connected to packs" above a second section titled "Other integrations". The top section carries what the product already knows about, one row with the provider mark and the account address. The bottom section carries everything that still needs work, each row ending in a "Connect" link.

That split maps onto this feature directly. What sits on the machine goes in the top section and reads as an answer. The terminal path drops to a second section and reads as the exception it now is.

### The row shape

[Linear connected accounts](https://mobbin.com/screens/3b7417c7-551f-4935-890f-4788e4d8d334) sets the row: provider mark, name, one line of plain description, and the action pinned right. [User Interviews](https://mobbin.com/screens/a663fa43-1fbe-4f01-a1cc-3525a6b75e70) shows the connected state of the same row, where the action flips to "Disconnect" and the row keeps its position rather than moving to another list. [Cursor integrations](https://mobbin.com/screens/abcc7d0b-e2d2-4b18-942b-a3333bc23182) and [Replit integrations](https://mobbin.com/screens/718e8393-29d9-474c-8a40-c798cc577ea9) repeat the shape at a denser rhythm.

A row that keeps its place when its state changes matters here. An adopted subscription and a terminal-signed-in subscription are the same kind of thing afterward, so they belong in one list under one row shape.

### Naming what was found

[WRITER](https://mobbin.com/screens/932f7a0b-33c4-42fe-8131-f492500b1bf2) writes "We were able to auto-match 19 of 19 columns from your file" above its table. The count is the reassurance. The parallel for this feature is naming the account and where it came from, not announcing that a scan happened.

## Reference notes carried into the brainstorm

- The found account is stated, never offered as a blank to fill.
- Where it was found belongs in the row, because a credential adopted from the machine and one minted through the terminal behave the same afterward and the person deserves to know which is which.
- The terminal path stays reachable and stays quiet, one section down.
- Found and adopted are the same row in two states, not two lists.
- An empty result is its own state and is not the same as a scan that failed. A machine with no Claude Code on it and a keychain that refused to open read alike from the code and must not read alike on screen.
