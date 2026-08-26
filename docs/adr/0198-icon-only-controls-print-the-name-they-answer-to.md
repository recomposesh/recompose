# 0198: Icon-only controls print the name they answer to

**Status**: Accepted
**Date**: 2026-08-26

## Context

Most controls in the desktop app are a glyph in a box. The sidebar toggle, the inspector toggle,
every toolbar control, and the copy button carry an `aria-label` and nothing else. So do the four
zoom controls, the move controls on a router child, and the keyboard ask on a canvas card. A screen
reader hears what each one does. A person with a pointer reads a glyph and guesses.

One control was the exception. `shared/ui/toolbar-button` set a native `title`, which paints the
browser's own tip after a delay. No stylesheet reaches it, no position moves it, and no keyboard
press opens it. It also held a second copy of the label: the button said `aria-label={label}` and
`title={label}`, so the two strings could drift on the next edit and nobody would notice.

The project has already shipped the failure that lives at the other end of this. A control gained
a visible name beside an `aria-label` that still stood, and a screen reader announced the name
twice. The suite passed, because both names were correct in isolation.

## Decision

`shared/ui/tooltip` wraps Base UI's Tooltip and takes one `label`. That string becomes the
trigger's `aria-label` and the reading printed on hover, so the two can't disagree. A control that
uses the tooltip drops its own `aria-label`, because holding the name in two places is the drift
the primitive exists to prevent.

The printed reading is `aria-hidden`. It repeats the accessible name and nothing more, so leaving
it in the accessibility tree offers a screen reader a second copy of a name it has already heard.
Base UI wires no `aria-describedby` and no `role="tooltip"` of its own, which makes hiding the
popup the whole of the work.

Anything the name genuinely can't carry goes in `note`, a second sentence that reads after the
name in the printed tip. It also reaches assistive technology as the control's description through
a visually hidden element. That's what carries the toolbar control's "Waits on the guide." sentence,
which the old `title` used to hold with the label glued in front of it.

The tooltip opens on hover and on keyboard focus, and it never takes focus. The popup isn't
focusable and the trigger keeps the focus a person gave it.

## Alternatives

- **Keeping the native `title` and adding it everywhere**: rejected. It takes no styling to match
  the app, it never opens under keyboard focus, and it duplicates the label on every control that
  already has one.
- **Making the tooltip the accessible name through `aria-labelledby`**: rejected. The popup exists
  only while it's open, so the name would come and go with the pointer, and every control would
  lose its name the moment the tip closed.
- **Letting the tooltip stay in the accessibility tree as a description**: rejected. The
  description would repeat the name word for word, which is the doubled announcement this project
  has already shipped once.
- **Wrapping the app in Base UI's `Tooltip.Provider`**: rejected for now. It shares an open delay
  across a group so the second control in a row answers instantly. No control needs that yet, and
  the provider would have to reach into the app shell, which no tooltip currently touches.

## Consequences

**Good**: every icon-only control this record covers explains itself to a pointer, in the same
words it already gave a screen reader, from one string that can't drift. The toolbar control keeps
its waiting sentence and gains a description that no longer repeats its own name.

**Cost**: a control that wants the tooltip has to give up its own `aria-label`, which is easy to
forget and would produce the doubled name again. `tooltip.browser.test.tsx` pins the rule: the
control answers to its name once, and the reading is never its description.

**Not covered**: `canvas-minimap` carries no button of its own, so nothing there took a tooltip.
Truncated text that falls back to a native `title`, such as a canvas card's name, is a different
question and stays as it is.
