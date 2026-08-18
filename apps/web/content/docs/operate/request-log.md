---
title: 'Request log'
description: 'Every served request, one line each, scoped by what you select.'
---

The request log is a drawer under the canvas on a gateway's detail page. Open it with the **Request log** button on the toolbar, or with **Gateway → Show Logs**, Cmd+Shift+L on macOS and Ctrl+Shift+L elsewhere. Drag its top edge to resize it.

## Reading the drawer

The header names what you're looking at, as `Logs for My gateway` plus the subject's type: gateway, virtual model, binding, router, or provider. A chip beside it reads **Live** while the gateway serves and **Stopped** otherwise. A segmented control filters rows to **All**, **Success**, or **Errors**.

## Reading a row

Each row is one request, newest at the bottom, and shows in order:

1. The time, as `HH:MM:SS`
2. The HTTP method
3. The model journey, as `virtual model → provider model`
4. The provider and the account that answered
5. The status code, painted danger red at 400 and above, attention amber on 429
6. The duration, as seconds with one decimal, such as `2.3s`

A request still in flight shows the word `live` in place of a status and its duration ticks upward. A request the gateway refused before trying any provider shows empty provider cells and no duration: nothing upstream ever ran.

Rows don't expand, and no search box exists. The keyboard covers the rest: Up and Down move a cursor, and Cmd+C or Ctrl+C copies the row under it as one text line.

## Scope by selection

The drawer follows the canvas selection. Select the gateway and every request shows. Select a virtual model, its cable, or a router, and the drawer narrows to that model's requests. Select a target and only requests that reached that account remain. Each scope has its own empty state, such as `No requests through this virtual model yet.` or `No requests reached this provider yet.`

## Retention

The log lives in memory and holds the last 10,000 rows. It writes nothing to disk, and a restart starts it empty. Stopping a gateway settles its unfinished rows as 503 with `The gateway stopped before the request finished.` Aggregates survive elsewhere: [Usage](/docs/operate/usage-and-spend) keeps served history across restarts.

## What a row never carries

No prompt and no completion ever enter the log. A row carries timing, routing, status, and token counts, and the client's key appears only as a digest, never as the key itself. [Data on disk](/docs/operate/data-on-disk) covers what recompose writes and what it doesn't.
