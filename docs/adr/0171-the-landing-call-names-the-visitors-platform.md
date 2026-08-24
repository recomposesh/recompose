# 0171: The landing call names the visitor's platform

**Status**: Accepted
**Date**: 2026-08-24

## Context

Both landing calls to action, the one under the hero headline and the one closing the page, read
`download for macOS` beside an Apple emblem. They read that to everyone. A visitor on Windows or
Linux met a button naming an operating system they don't run. One click later, the download page
worked out which platform they were on and offered the matching build.

The download page reads the platform in the route component through `useSyncExternalStore`, with
`detectPlatform` over `navigator.userAgent` as the client snapshot and `mac` as the snapshot the
prerender uses. The site ships as static HTML, so the server has no request to read a header from.

## Decision

**The landing reads the visitor platform the same way the download page does, through a hook both
share.** `useVisitorPlatform` holds the store wiring that `/download` carried inline.

**The two sections call the hook where they render, rather than taking the answer from the route.**
`/download` reads the platform once because three children need it. On the landing only the hero and
the closing section do, and they sit apart in the page. Threading it from the route also copied that
route's opening lines into `/`, which the duplication gate reads as a clone.

**One component owns the copy and the emblem for all three platforms.** `DownloadCall` maps a
platform to `download for macOS`, `download for Windows`, or `download for Linux` beside the Apple,
Windows, or Tux mark. The sections keep their own link and styling, which already differ, and render
the call inside it.

**The prerendered HTML keeps naming macOS.** A static page has one body for every visitor, so the
call it ships is a guess that hydration corrects on the client. Naming macOS matches the download
page's fallback and the platform most visitors arrive on. A Windows visitor sees the label change
once, in the same tick their browser finishes hydrating.

## Consequences

A visitor sees a call that names their own operating system, and the download page that follows
agrees with it.

The label a crawler reads, and the label a visitor sees for the first frames after paint, is the
macOS one on every platform. That's the cost of a prerendered page adapting on the client, and the
download page already pays it.

Detection stays as good as `navigator.userAgent`. A browser that lies, or an architecture the string
hides, lands on the mac call, and the download page offers every build a click later.
