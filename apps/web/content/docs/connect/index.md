---
title: 'Overview'
icon: Cable
description: 'How any client reaches a gateway.'
---

Every client needs the same three facts: the gateway's base URL, a key value, and a model id. recompose generates all three. In the gateway's toolbar, click **Connect a client**, pick your client, and copy the block the sheet prints. The values in it belong to your gateway, so the block is always right.

The pages in this section teach the shape of what you pasted. They show example values, and your own block carries your gateway's port, key, and model ids.

## The base URL is a bare origin

Each gateway listens on its own port and serves at the root of its address: no path and no trailing slash. One address answers the Anthropic, OpenAI, and Gemini dialects at once, so clients that speak different dialects share a gateway.

## Clients disagree about who owns /v1

Some clients append `v1/chat/completions` to whatever address you hand them, so they want the bare origin. Others append `chat/completions` and want the origin plus `/v1`. Each client page names the shape it takes, and the connect sheet picks it for you. A wrong guess lands requests on `/v1/v1`, the most common broken paste. The segment doesn't follow the dialect either: Kimi Code speaks Anthropic Messages at the bare origin.

## A keyless gateway still hands over a key

Clients refuse to start with an empty credential field, so the block carries the stand-in `unused` when your gateway checks nothing. It satisfies the client and nothing else. A client whose form takes only an address, such as Claude Desktop, stays out of reach of a gateway that does [require a key](/docs/operate/securing-a-gateway): its page says so.

## Two gateways never collide

Every id a config file stores carries the gateway's slug: the provider id reads `recompose-my-gateway` and the key variable reads `RECOMPOSE_MY_GATEWAY_API_KEY`. A second gateway adds its own entries instead of overwriting the first.

## Confirm the paste worked

The status line at the foot of the connect sheet watches the gateway's log and turns green on the first request. [Verify a connection](/docs/connect/verify) covers the detail.
