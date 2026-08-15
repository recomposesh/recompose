# 0121: A streamed answer rides a transport recompose owns

**Status**: Accepted
**Date**: 2026-08-15

## Context

Architecture Decision Record (ADR) 0116 bounded the wait for a first event at 240 seconds. It left
two things open. The first: repairing the transport meant an undici `Agent` recompose builds and
passes as its dispatcher. That dispatcher would carry a body timeout chosen for a streamed answer
rather than one inherited from a general-purpose transport, and the record didn't build it. The
second: `proxyFetchBoundMs` read as partly unreachable, because Node's fetch severs a silent body at
300 seconds long before that abort fires.

The whole repair rests on a number, so the number got checked before anything else got designed.

**The runtime that matters isn't the one a terminal reports.** The engine child starts through
Electron's `utilityProcess.fork`. It runs Electron's Node, not the machine's.

- Electron 43.2.0 answers Node 24.18.0 and undici 7.28.0.
- A developer shell on the same machine answers Node 26.5.0 and undici 8.7.0.

Designing against the shell would have pinned the bound to a runtime that never ships.

**ADR-0116 read the defaults correctly.** A bare undici `Client` reports `bodyTimeout` 300000 and
`headersTimeout` 300000. The same read against a client built with 1234 and 5678 returns those, so
the reading measures the client rather than repeating a constant. undici's own `Client`
documentation states 300 seconds for both at 6.x, 7.x and 8.x. It describes `bodyTimeout` as
monitoring the time between consecutive body chunks. Gap, not total. The earlier record's premise
holds on every version in play here.

**The clock behind those timeouts isn't wall time.** `lib/util/timers.js` advances its `fastNow`
value by a fixed `TICK_MS` of 499 milliseconds on each tick rather than reading the system clock.
Four attempts to wait out the 300-second default returned nothing, because the host suspended the
process each time. A one-second sampler recorded 897 to 927 seconds of drift per run, and the silent
body outlived the default every time. A suspended machine doesn't spend its timeout. That's a real
property rather than a measurement fault. A laptop that sleeps mid-answer wakes with its streams
intact.

**A dispatcher crosses the copy boundary only while the majors agree.** undici 8 reads its global
dispatcher from `Symbol.for('undici.globalDispatcher.2')`, while 6 and 7 read `.1`. A mismatched
pair goes unread in one direction and throws `invalid onRequestStart method` in the other. The
installed 7.29.0 and Electron's bundled 7.28.0 share a major, which is the pairing that holds.

Measured on the runtime that ships: an `Agent` carrying `bodyTimeout` 3000, handed to the global
fetch as `init.dispatcher`, severed a silent body at 3522 milliseconds. The failure arrived as
`TypeError: terminated`, caused by `BodyTimeoutError`, code `UND_ERR_BODY_TIMEOUT`. The same shape
appeared at 30525 milliseconds for a 30000 bound on the developer runtime. Node documents
`init.dispatcher` itself, under a custom dispatcher heading, so this is the platform's own seam
rather than a trick.

**The other transport was worse off than anyone thought, and only measuring found it.** Subscription
turns cross `node-wreq`, so undici's bounds never reach them. The same silent server, pointed at
`node-wreq` on Electron's Node, answered in three readings, each with a clock sampler alongside
reporting single-digit drift.

- A silent body severed at 30010 milliseconds, as `TimeoutError`, code `ERR_TIMEOUT`.
- A stream fed a byte every ten seconds, healthy and arriving, died at 30009 milliseconds all the
  same. The default is a ceiling on the whole request, not a gap between chunks.
- `readTimeout` set to 60 seconds still died at 30005. The total wins, so the gap knob can lower the
  bound and never raise it.

Setting `timeout` to 300 seconds carried that same 60-second answer to a clean end at 60013
milliseconds. `readTimeout` then applies underneath it: with the total at 600 seconds, a 3-second gap
bound severed a silent body at 3010 milliseconds.

Nothing in the subscription path set either option, so every subscription turn ran under a
30-second ceiling on the whole answer. The gateway's own 240-second first-event bound could never
fire, because the transport was already gone. `claude-device-profile.ts` meanwhile advertises
`X-Stainless-Timeout: 600` to Anthropic, so the headers claimed ten minutes while the socket allowed
thirty seconds.

## Decision

**The dispatcher rides on each request, never on the process.** `setGlobalDispatcher` reaches every
consumer in the process, Electron's own traffic included, and a gateway has no business reaching
that far. The engine builds one `Agent` and passes it as `init.dispatcher`. The engine child already
threads a `fetchLike` from a single place. One argument at the composition root carries the bound to
every provider request, and no call site changes.

**Both transports state the same two bounds.** One silence means one number, so the gap bound stands
in the engine and each client reads it: undici takes it as `bodyTimeout`, `node-wreq` as
`readTimeout`. The whole-request ceiling is `proxyFetchBoundMs` on both, carried by an `AbortSignal`
on one and by `timeout` on the other.

The bounds ride on the provider turn rather than on the shared subscription transport options. A
token refresh isn't a streamed answer, and it already carries a 30-second signal of its own that
these numbers would otherwise loosen to ten minutes.

**The bound is 300 seconds, and on the credentialed path it's the same number as the default on
purpose.** What changes is who owns it. undici already shipped 30 seconds by accident once, in the release that became Node
18.14.1, and reverted it a version later. An Electron upgrade moves the bundled undici, so a number
left inherited moves with it and nothing in this repository would notice. Naming it pins it.

The number sits above the 240 seconds the commit latch waits for a first event. A target that never
opens still fails through the latch, which names the gateway, the target and the virtual model. No
untyped dispatcher error reaches the caller in its place. The bound sits at or under the 600 seconds
`proxyFetchBoundMs` allows a whole request. The transport speaks only for silence that falls after
an answer has begun. That window is the one the latch stops watching at the commit.

Wrong in each direction costs differently. Too short cuts a healthy answer mid-stream, which spends
a second account, charges twice and returns a worse answer. Too long holds a child on a connection
already dead, which costs latency on one attempt while the caller waits. The asymmetry ADR-0116
named still points the same way, so the bound errs long. The seam is a plain parameter, so real
traffic can move it.

**`proxyFetchBoundMs` stays, and its meaning sharpens.** ADR-0116 called it partly unreachable
because a 300-second severance fired first. Measured, the two bounds have different shapes rather
than different lengths. `proxyFetchBoundMs` is an `AbortSignal` over the whole request, and the
transport bound measures the gap between chunks. Neither subsumes the other. A stalled answer trips
the gap bound at 300 seconds. A healthy answer that streams for more than 10 minutes trips the total
bound. The abort keeps its job as the ceiling on one outbound request.

**An explicit `undici` sits where ADR-0057 put Hono.** That record rejected Fastify over fifteen
runtime dependencies inside the package the boundary rules isolate, and took Hono because it ships
none. `undici` 7.29.0 declares no runtime dependencies either, and carries an `MIT` license, which
the allowlist admits. It adds no new vendor either. Node's `fetch` is undici already, so the package
names a second copy of a library the engine runs on rather than introducing one.

## Alternatives

**A chunk-gap timer in the read loop.** The engine already reads every committed chunk through one
place, the wrapper ADR-0116 added, which logs a mid-stream death with its gateway, target and virtual
model. A timer reset on each read would measure the same gap `bodyTimeout` measures, in application
code, with no dependency and no runtime pairing to get right. It reaches further in one respect. The
subscription path and the credentialed path both return through the commit latch, so a bound there
covers `node-wreq` traffic, which the transport bound never touches.

The rejection turns on reach, not on cost. The wrapper exists only for an answer carrying
`text/event-stream`. Any other answer leaves the latch with its body untouched, so a timer there
never sees it. It never sees the requests that don't stream at all, which are token counts, images,
compact and alpha search, and which reach providers through the same seam. Nothing in a read loop
bounds the wait before headers arrive either, because no stream exists yet to time.

The reach that alternative has is worth having, and an application timer isn't how to get it. Each
client already owns the bound in its own vocabulary, so stating the number on both covers everything
and leaves each client the socket handling it has. Reading the documentation suggested `readTimeout`
was the lever. Measuring showed it isn't: the 30-second total fires first, and only `timeout` lifts
it. Had this record shipped the documented answer, the defect would have survived the repair.

**Freeing the socket wasn't a reason to prefer the transport.** An application abort looks like it
would leave the peer hanging, and it doesn't. The latch already cancels readers it has decided
against, and its own note records that cancelling frees the socket.

**Attribution favours the alternative, and this choice pays for it.** A timer in the wrapper would
fail with the gateway, the target and the virtual model already in hand. The transport fails with
`UND_ERR_BODY_TIMEOUT` instead.

## Consequences

Every provider request that travels on the global fetch now carries a bound recompose chose, and a
runtime upgrade can't move it. A person reading a severed stream still reads `UND_ERR_BODY_TIMEOUT`.
That's the transport's own vocabulary rather than the gateway's, so the attribution ADR-0116 built
for the latch doesn't extend here.

**A subscription answer may now run past thirty seconds.** That's a repair rather than a loosening.
A 30-second ceiling covered every subscription turn, so any reply longer than that died as
`ERR_TIMEOUT` while the gateway's own bound sat unused. Anthropic, Gemini and the OpenAI Responses
interface open with a lifecycle event within seconds, so the commit latch usually saw a first event
and committed. The death then landed mid-answer. That reads as a truncated reply rather than a
refusal, and failover never ran, because the turn had already committed. Long subscription answers
should stop truncating at half a minute.

The bound now sits where the reply length lives rather than where the transport's author left it. A
reply that genuinely needs more than ten minutes still meets the total, exactly as on the
credentialed path.

A healthy answer streaming past 600 seconds is still cut by `proxyFetchBoundMs`, and the total shape
is what cuts it. That cost was invisible while the record read the bound as unreachable, and it's
visible now. Whether a total-duration ceiling belongs on a streamed answer at all is worth its own
record.

The repository now types undici twice. `@types/node` describes the fetch options with
`undici-types` 7.18.2, and the engine installs `undici` 7.29.0, which carries its own declarations.
The two genuinely differ: the newer copy adds `typeOfService`, `statusText` and `rawHeaders`, and
drops `redirectionLimitReached`. A declared intersection compares the two `Dispatcher` copies and
rejects the `Agent`, and the linter forbids a type assertion, so `Object.assign` builds the options
and its inferred intersection carries the dispatcher through. Aligning the copies would mean overriding a
version `@types/node` pins, which reaches every package rather than this one.

The bound sits in the engine rather than beside its siblings in contracts. Only the engine reaches a
provider. The two bounds it answers to, `firstEventBoundMs` and `proxyFetchBoundMs`, still sit in
contracts. A spec pins the ordering between all three, so a later edit to any one of them fails the
suite rather than inverting the design unnoticed.
