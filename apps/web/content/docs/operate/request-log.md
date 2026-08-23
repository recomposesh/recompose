---
title: 'Request log'
description: 'Every served request, one line each, scoped by what you select.'
---

The request log is a drawer under the canvas on a gateway's detail page. Open it with the **Request log** button on the toolbar, or with **Gateway → Show Logs**, Control+` on every platform. Drag its top edge to resize it.

## Reading the drawer

The header names what you're looking at, as `Logs for My gateway` plus the subject's type: gateway, virtual model, binding, router, or provider. A chip beside it reads **Live** while the gateway serves and **Stopped** otherwise. A segmented control filters rows to **All**, **Success**, or **Errors**.

## Reading a row

A head above the run names the columns and holds still while the rows scroll. Each row is one request, newest at the top, and shows in order:

1. **Time**, as `HH:MM:SS`
2. **Method**, the HTTP method
3. **Model**, the journey as `virtual model → provider model`
4. **Provider**, what answered
5. **Account**, which account it answered through
6. **Status**, the status code, painted danger red at 400 and above, attention amber on 429
7. **Took**, the duration as seconds with one decimal, such as `2.3s`
8. **Detail**, the sentence a failed request came to, empty on a served one

A narrow drawer drops columns rather than clipping every one of them: the account goes first, then the provider, the method, and the duration.

A request still in flight shows the word `live` in place of a status and its duration ticks upward. A request the gateway refused before trying any provider shows empty provider cells and no duration: nothing upstream ever ran.

Rows don't expand, and no search box exists. The keyboard covers the rest: Up and Down move a cursor, and Cmd+C or Ctrl+C copies the row under it as one text line.

## Scope by selection

The drawer follows the canvas selection. Select the gateway and every request shows. Select a virtual model, its cable, or a router, and the drawer narrows to that model's requests. Select a target and only requests that reached that account remain. Each scope has its own empty state, such as `No requests through this virtual model yet.` or `No requests reached this provider yet.`

## Retention

The log lives in memory and holds the last 10,000 rows. It writes nothing to disk, and a restart starts it empty. Stopping a gateway settles its unfinished rows as 503 with `The gateway stopped before the request finished.` Aggregates survive elsewhere: [Usage](/docs/operate/usage-and-spend) keeps served history across restarts.

## What a row never carries

No prompt and no completion ever enter the log. A row carries timing, routing, status, and token counts, and the client's key appears only as a digest, never as the key itself. [Data on disk](/docs/operate/data-on-disk) covers what recompose writes and what it doesn't.
