---
title: 'Verify a connection'
description: 'Confirm that a client reached the gateway.'
---

A request in the gateway's log proves the connection: a client that starts without complaining proves nothing. Two surfaces show it.

## The status line in the connect sheet

The line at the foot of **Connect a client** watches the gateway's log. Before any traffic it reads that nothing has reached the gateway yet, and it turns green the moment the log takes a request. The count belongs to the gateway rather than to the client named beside it: a request carries no name recompose can trust.

## The request log

Click **Request log** in the toolbar. A row shows the time, the method, the model journey from asked id to resolved provider model, the provider, the account, the status, and the duration. A row that never reached a target still lands, with the refusal as its status. [The request log](/docs/operate/request-log) covers scopes and filters.

## When nothing lands

- The client started without the variables in front of it: start it again with the whole block, since most clients read the endpoint once at launch.
- The address carries the wrong `/v1` shape: check the client's page for the shape it takes, or copy the block again from the sheet.
- The gateway answers `401`: the key came from another gateway's sheet. See [authentication errors](/docs/troubleshooting/authentication-errors).

For a client-free check, [curl](/docs/connect/curl) asks the gateway directly.
