# Mobbin references

Session-run discovery arm for the app-menu-shortcuts change. Two searches on the web platform: shortcut discoverability surfaces in developer tools, and zoom controls in canvas editors. Mobbin carries no macOS menu bars, so the menu bar's own shape leans on the HIG material in the technical-research arm; these references cover the conventions the menu encodes.

## Shortcut conventions in developer tools

- [Perplexity, keyboard shortcuts overlay](https://mobbin.com/screens/b0a63cb0-ff2e-49a9-90ab-b4dff7f8084d): a grouped overlay (General, Navigation, Interface) listing every binding with symbol keycaps, opened by Cmd+/. Settings sits on Cmd+, and the overlay itself is listed inside itself under "Show Shortcuts". The reference for the Help menu's shortcut item once an in-app overlay exists; until then the item opens the published reference.
- [Supabase, command palette](https://mobbin.com/screens/9b4725f5-e038-4fc7-98ad-64a59f74b4d7): Cmd+K palette whose first group is literally named "Shortcuts", carrying New project (N) and Show all keyboard shortcuts. Palettes teach bindings; deferred with the palette itself.
- [Airtable, keyboard shortcuts dialog](https://mobbin.com/screens/99cfd691-0aed-451d-8138-7beff8915c7a): Cmd+/ overlay grouped by surface (Expanded record, Rich text formatting, Interfaces). Confirms Cmd+/ as the shortcut-reference binding and grouping by surface rather than alphabet.
- [Mistral AI, palette](https://mobbin.com/screens/8450c1c7-7c10-40a3-9af3-c9c234ac4b53) and [Juicebox, palette](https://mobbin.com/screens/2af813bf-0129-45d1-81ed-069edee76e16): both palettes lead with "Go to <section>" navigation rows, which is the same navigation set this change puts on the plain number accelerators.

## Zoom controls in canvas editors

- [Workable, document zoom control](https://mobbin.com/screens/21aee311-5463-4470-8b42-d2ea2a2349ba): the zoom dropdown prints "Zoom: Fit Width" as a named mode beside the plain percentages, so fitting and a numeric level read as two different operations, never one reset item doing both.
- [Magnific, canvas](https://mobbin.com/screens/5659cf16-6427-4525-9bd7-77a42be5f5a3) and [Semrush, editor canvas](https://mobbin.com/screens/73ef6b00-0f64-4c9f-a714-846d5380a2fe): both print the standing zoom as a percentage control on the canvas edge, which is what a "return to 100%" menu item answers to.

## What the arm suggests for the brainstorm

1. Cmd+/ is the settled binding for a shortcut reference, and Cmd+, for settings; the Help menu item should carry Cmd+/ so the binding survives when an in-app overlay replaces the external reference later.
2. Navigation reads as "go to a section" everywhere, and it always enumerates the same few top-level sections. Gateways, providers, and usage on the plain numbers matches what the palettes teach.
3. Fit and 100% never share one control in the references. The Workable dropdown names fit as a mode beside percentages, which supports splitting the Gateway menu's reset item in two.
4. Every reference that lists shortcuts groups them by surface, not alphabetically. Worth keeping when the published shortcut reference gets written.
