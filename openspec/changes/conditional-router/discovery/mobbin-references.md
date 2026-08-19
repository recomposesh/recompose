# Mobbin references: conditional router

Session-run discovery arm (`isUI: true`). Fresh searches on 2026-08-19, folded together with the curated IDs from the 2026-08-19 brainstorm in `BRAINSTORM-NOTES.md`.

## Fresh flow evidence

- **OpenAI Platform, "Adding a logic node"** — https://mobbin.com/flows/58f1f1e1-7f54-4e90-8f2e-9d02b6663afc
  Classifier agent node feeds an If/else node. The If/else inspector holds case name + condition rows and a permanent trailing "Else" slot rendered inside the node card. Condition references the classifier's parsed output (`input.output_parsed.classification == "flight_info"`). Confirms the locked "mandatory else" semantics and the classifier-feeds-branching pattern; recompose diverges by folding both into one router node with the judge as a satellite.
- **Lindy, "Adding a condition"** — https://mobbin.com/flows/277a6ba2-7d8c-44d0-94d9-572f7811545c
  Condition node sits between agent and action; the outgoing wire carries a truncated natural-language rule chip ("If the email intent matche…"). Direct precedent for rule pills riding the branch cable with a one-line preview, full text elsewhere.
- **Twenty, "Adding a conditional action"** — https://mobbin.com/flows/c9abe7c1-9de6-46ff-a1f7-5943d071b333
  If/Else action node with edge labels `if` and `else` on the two outgoing wires; branches can end in AI Agent nodes with their own model binding. Matches the brainstorm's Twenty wire-pill reference (screen 8289b902).

## Fresh screen evidence

- **WRITER classification node** — https://mobbin.com/screens/38c59932-46a7-49a6-a7a2-d9ae9759fb65
  The same screen the brainstorm cites (38c59932): a "Classify review category" node listing categories (Packaging, Pricing, Quality, Delivery, Empty), one output port per category, each wired to its own downstream branch. The per-category port is the eliminated alternative B (slot rules); kept as the contrast reference.
- **n8n If node** — https://mobbin.com/screens/817531c3-11e0-4638-bdc2-831ab9adb3a4
  `true` / `false` labels sit directly on the output ports; taken-branch wires carry item counts. Precedent for the chosen branch flowing green with traffic.
- **Attio conditions** — https://mobbin.com/screens/23cbd6b3-c15a-461f-876c-ae6d25706326
  "Is true" / "Is false" labels float on long wires far from the node. Legibility caution: wire labels must stay attached to their cable at canvas zoom levels.
- **ManyChat condition cards** — https://mobbin.com/screens/53179bd2-ea8d-4454-88c6-cf6f9840bf9f
  Condition summaries live inside tall node cards; the canvas gets crowded fast. Supports the brainstorm's elimination of slot rules inside the router card.

## Carried from the brainstorm (curated IDs)

- OpenAI platform classifier into If/else: a3f3b2d7
- WRITER classification node with per-category ports: 38c59932
- Customer.io split-branch derived labels plus "All others": 2ae31404
- Twenty if/else wire pills: 8289b902
- Flodesk Yes/No pills: daf1786d
- Zapier Canvas edge labels: 8c45f47d
- Textarea precedents for the branch-rule sheet: Sana b23d6f81, Langdock 34d078d5, Mistral c694fcb5, ElevenLabs 9e0eefdb

## What the references settle for design

- Mandatory else is industry-standard in every surveyed builder (OpenAI, Twenty, Customer.io "All others", Flodesk, n8n false-port).
- Rule text previews on the wire (Lindy, Twenty, Zapier) beat rule rows inside the node (WRITER, ManyChat) for canvas economy; the drawn screens 0 to 7 already follow the wire-pill choice.
- No surveyed product renders the classifier as a satellite advisor node; the judge satellite is recompose's own move, so the design critique should weigh its legibility on screens 5 to 7 rather than look for outside precedent.
