# Mobbin references

Session-run Mobbin pass for the status footer and the logs drawer, searched 2026-08-10 on the web platform.

## The layout pattern: canvas above, logs drawer below

- [n8n workflow editor with bottom logs panel](https://mobbin.com/screens/1562fe41-4f0a-48b9-b6da-ed9ebf8b9ec5). The strongest match for the whole feature. A node canvas keeps the upper stage while a logs panel expands from the bottom edge. Rows are per-node executions carrying a status word and a duration, which mirrors selection-scoped rows per virtual model or target. The panel and the canvas stay visible together, so wiring context never leaves the screen.
- [Magnific canvas editor with persistent bottom bar](https://mobbin.com/screens/04e15bb3-c049-4c41-8854-35fe1342b7b7). A slim persistent bar under the canvas holding counts and a zoom control, with an expandable tray above it. Supports the resting-footer reading: a thin strip that stays put and expands upward on demand.
- [Canva editor footer strip](https://mobbin.com/screens/e6a0b5d0-f8be-461c-98f4-834fd3ea2777). A minimal footer with tallies (pages, zoom) at the edges, confirming the left-cluster right-cluster split the reference screenshots use.

## Log row anatomy and filter chips

- [ElevenLabs Request Log](https://mobbin.com/screens/849a13c1-9f79-4ce4-8521-8dbfe75cf269). The closest row anatomy to ours: status code chip, method, request path, latency, timestamp, one row per request, newest first. A chip row above the table adds filters (method, code, latency bounds). Validates the drawer's chip strip and monospace row rhythm.
- [Vercel Logs](https://mobbin.com/screens/c6b747bc-29d1-4b25-806d-2bd2ac71633f). A Live toggle sits in the toolbar while rows stream in below; status-code facets narrow the stream. Validates the Live indicator beside the drawer title and status-scoped narrowing.
- [Supabase Logs](https://mobbin.com/screens/421ba664-3c7d-442a-8fcc-3342af79d811). Dark-scheme log console with severity facets (error, success, warning) and a row selection opening a detail pane. The severity facet maps to our Errors chip; the detail pane is a possible later rider, not this slice.
- [WRITER observability log](https://mobbin.com/screens/262e03a6-99a8-48b1-8925-2ff6df0d23ad). LLM observability rows carrying the model per request beside endpoint and response code. Confirms the model column belongs in the row, matching our virtual model and resolved provider model pair.
- [Profound agent logs](https://mobbin.com/screens/c4731d46-e08b-47c7-82f2-5c38188bd348). A Live chip pinned in the filter toolbar over streaming rows, another vote for the Live affordance pattern.

## What the pass settles

- The drawer opens over the lower canvas while the footer stays as the drawer's own status line, matching n8n's panel and the reference screenshots.
- Filter chips ride in the drawer header row, right-aligned, as ElevenLabs and Supabase place their facets.
- A Live indicator beside the drawer title follows Vercel and Profound.
- Rows read monospace with the status code as the strongest color accent, per ElevenLabs and Supabase.
