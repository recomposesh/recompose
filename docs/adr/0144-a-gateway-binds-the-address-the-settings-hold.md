# 0144: A gateway binds the address the settings hold

**Status**: Accepted
**Date**: 2026-08-18

## Context

Architecture Decision Record (ADR) 0056 gave each gateway its own port and fixed the interface: every listener bound loopback and nothing else. recompose fronts paid accounts, the record argued, and a wider bind exposes them. That fixed bind kept a real use out of reach. A person running recompose on one machine couldn't point a phone, a second computer, or a container at a gateway, because the listener refused every interface but loopback.

## Decision

The settings document carries one app-wide `bindAddress`, and every gateway listener binds it. The default stays loopback (`127.0.0.1`), so nothing serves the network until a person chooses to. The settings screen offers the address as an editable field, and a change made while gateways run holds behind a confirmation naming the restart it costs.

The printed origin follows the setting, with one repair. A bind address answers which interfaces a listener accepts on, which isn't the same question as where a client sends. The wildcard `0.0.0.0` names every interface and routes nowhere, so `routableGatewayOrigin` hands out `http://127.0.0.1:<port>` for it rather than an origin that can't connect. Every other stored address prints as written, and the schema rejects addresses carrying a colon, which keeps IPv6 wildcards out by construction.

Two refusals stand apart from the bind. While the address stands at its loopback default, the listener answers 403 to a request whose Host header names anything but a loopback address. A page that resolved its own name onto this machine still misses. And a request carrying an `Origin` header answers 403 whatever the bind, so no web page reaches a gateway even after a person widens the bind to the local network. A hostile page can steer a browser at an address its user never typed. Widening the bind opts into serving devices, not into cross-site requests from every page an on-network browser visits.

## Alternatives

- **Keep the fixed loopback bind**: rejected because serving another device on the person's own network is an ordinary ask for a gateway app, and a tunnel or reverse proxy bolted on outside the app hides the exposure decision from the one screen that should show it.
- **A per-gateway bind address**: rejected because the exposure decision is about the machine rather than one gateway, and one address on the settings screen is one place to audit.
- **Dropping the `Origin` 403 once the bind widens**: rejected because the refusal costs a legitimate caller nothing, and keeping it means the widened bind admits devices without admitting the web.
- **Printing a discovered local network address under the wildcard bind**: rejected for now because it needs interface-picking on multi-homed machines and a story for address churn when the machine changes networks. The loopback origin always connects from the machine itself, and a person who widened the bind already knows the address they picked.

## Consequences

**Good**: a gateway can serve other devices when a person asks it to, through a stored setting with a loopback default. Browser traffic stays refused on every bind, so the paid accounts behind a gateway never answer a cross-site request. The restart confirmation names the cost of a bind change before it lands.

**Bad**: a widened bind exposes every gateway on the machine at once, and the API key becomes the only guard in front of the accounts. The Host check guards the default bind alone, so a person who widens the bind takes on the network they open.
