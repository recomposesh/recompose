---
title: 'Four kinds of accounts'
description: 'Subscriptions, API keys, aggregators, and local runtimes.'
---

recompose holds a provider as an account, and every account is one of four kinds. Start from what you already have:

| You have                          | Kind                                            | Connecting asks for                                       | The row's standing                       |
| --------------------------------- | ----------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| A coding plan you sign in to      | [Subscription](/docs/providers/subscriptions)   | A sign-in, run by the provider's own tool or by recompose | Read from local evidence                 |
| A key from one provider's console | [API key](/docs/providers/api-keys)             | The key, pasted                                           | None stored, with a Verify act on demand |
| One key that reaches many models  | [Aggregator](/docs/providers/aggregators)       | The key, pasted                                           | None, and no Verify                      |
| A model server on this machine    | [Local runtime](/docs/providers/local-runtimes) | A port, and nothing else                                  | Observed fresh on every look             |

A row carries a standing exactly when recompose can observe one without spending. That's why a key gets a Verify act you press, while a local runtime's chip answers on its own.

## Where connecting happens

Every kind connects the same way: pick the kind in the sidebar under **Providers**, click **Add provider** in the toolbar, and choose a card. The sheet walks the rest.

## Where coding plans land

Three coding plans stand in the Subscriptions catalog but connect as pasted tokens: the GLM, Qwen, and MiniMax coding plans. Their rows land under **API keys**, and the sidebar counts them there. You connect on one screen and find the row on the other, once.

## Any kind can be a target

Whatever the kind, a connected account becomes a [target](/docs/get-started/how-recompose-works) on the canvas, and routing treats all four alike.
