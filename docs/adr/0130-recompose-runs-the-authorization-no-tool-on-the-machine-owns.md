# 0130: recompose runs the authorization no tool on the machine owns

**Status**: Accepted
**Date**: 2026-08-16

## Context

Architecture Decision Record (ADR) 0069 settled that a subscription is a directory recompose owns and the provider's own tool fills. It rejected running the authorization inside recompose, and it argued that rejection on one plan's terms. Anthropic forbids a third party to offer a claude.ai login. A second program refreshing a credential it doesn't own is the shape behind every rotation defect on record.

Three plans don't fit those terms. GitHub Copilot ships no tool a person could run against a config home. Kimi Code and Gemini through Antigravity are reachable only through CLIProxyAPI, a Go proxy this app has already ported the transport half of. For those three, the branch spawned `cliproxyapi` as a child, handed it a generated config file naming an auth directory, and read whatever it left behind.

That binary was never a dependency the app could ask for. A person installing recompose had to install a Go proxy to connect a plan. The app had to keep a config file in a format it doesn't own in step with a tool it doesn't ship. The sign-in a person watched happened inside a process the app couldn't see into. On a machine carrying no such binary, two of the three plans stayed out of reach.

The authorization itself isn't the hard part. Copilot and Kimi both run Request for Comments (RFC) 8628 device authorization. That standard fixes the whole exchange. It leaves a vendor only its addresses, its client identity, and any headers it counts callers with. Antigravity runs Google's loopback redirect against a public desktop client. Neither flow is a login recompose invents, and neither belongs to a tool a person already installed.

## Decision

**recompose runs the authorization for the plans no tool on the machine owns, and for no others.** Anthropic and OpenAI keep the whole of ADR 0069. Their own tools sign in, refresh, and own the credential, and recompose never touches the material. GitHub Copilot, Kimi Code, and Antigravity have no such tool, so recompose performs their flows itself and keeps what they issue.

**The vocabulary decides which surface a plan gets, never the plan's name.** `toolBackedProviderIdSchema` names the plans a tool signs in. `deviceFlowProviderIdSchema` names the plans that show a person a code. `browserSignInProviderIdSchema` names the plans that redirect a browser. Every path that runs a tool, reads a config home, shows a step, or answers a channel asks the vocabulary. A plan added to one of those sets reaches the right surface without a fourth place learning its name.

**One implementation of RFC 8628 serves every plan that authorizes that way.** A vendor supplies its addresses, its client, its scope where it takes one, and its headers where it counts callers. The flow supplies the poll, the pace the server asks for, the `slow_down` step, the terminal refusals, and the expiry. Some vendors answer a pending sign-in with a plain 200 carrying an error word, so the token decides that a sign-in landed, never the status.

**A ported flow names recompose as its caller.** Kimi counts callers by `X-Msh-Platform`, and this app sends its own name there rather than the name of the tool the flow came from.

**A credential this app mints keeps the shape CLIProxyAPI writes.** An account signed in here and one adopted from an existing install of that tool read the same way in every reader downstream. The port adds no second format to maintain.

**A plan whose serving needs more than a token asks for it at sign-in.** Antigravity turns name a Google Cloud project, so the sign-in reads the account's project from `loadCodeAssist`. It onboards through `onboardUser` where the account has none yet. It refuses rather than storing a credential that would connect and answer nothing.

**One table names the file each plan's credential lives in, and both the writer and the reader ask it.** The two disagreeing leaves a home holding a credential nothing looks for. That reads on screen as a signed-in account that lapsed the moment it landed.

## Consequences

**Good**: no binary outside recompose connects any plan now. Copilot, Kimi, and Antigravity all reach a bare machine. One device flow means a fix to the poll reaches every plan that polls, and one vendor descriptor is the whole cost of the next such plan. The compiler asks every tool-delegating path what it does about a plan with no tool, because those plans aren't in the tool table. Unifying the reader and the writer surfaced two defects: Copilot and Kimi accounts had been landing as lapsed, and the Antigravity loopback had been answering before it released its port.

**Bad**: recompose now holds three refresh flows it didn't hold before, which is the shape ADR 0069 warned about. It holds them only for credentials no other program on the machine owns. The split-brain that argument rests on has no second writer to occur against, but the maintenance is real. It grows with every vendor that changes an endpoint. The Antigravity client secret ships in the app. It belongs to a public desktop client, which Google's own guidance says isn't a secret, and the loopback redirect binds the exchange. It's still a string in the repository. The loopback holds one fixed port, because Google matches this client's redirect exactly, so a machine already using 51121 can't sign that plan in. Kimi publishes nothing that names the person behind a token, so a Kimi row stands under its plan rather than an address. Three vendor endpoint sets now live in this repository and drift when the vendors move.

## Alternatives

**Keep spawning `cliproxyapi`.** Rejected because it makes a Go binary a prerequisite for connecting a plan in a desktop app. It hides an interactive sign-in inside a child process. It leaves the app maintaining a config file in a format it neither owns nor validates.

**Copy the device flow once per plan.** Rejected because RFC 8628 is one piece of knowledge. Two copies drift on the day one vendor starts answering `slow_down` and the other doesn't. The copy nobody touched keeps polling at the pace the server refused.

**Give each plan its own channel pair, the way Copilot had.** Rejected because the channel would name the plan rather than the exchange. A fourth plan on the same exchange would add a fifth and sixth channel carrying no new meaning. The provider travels as a request field, checked against the set of plans that authorize that way.

**Store an Antigravity credential without its project and discover the project on the first turn.** Rejected because the discovery can fail, and failing there turns a connected account into a turn that refuses. A sign-in is a moment a person is present and watching. That's the honest place to find out the account can't serve.
