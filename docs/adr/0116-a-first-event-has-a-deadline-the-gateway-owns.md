# 0116: A first event has a deadline the gateway owns

**Status**: Accepted
**Date**: 2026-08-15

## Context

The commit latch of Architecture Decision Record (ADR) 0114 holds a request until the first
downstream event. An upstream 200 proves nothing, because a stream can open with an error. The latch
holds without a bound of its own. A target that accepts a request and then says nothing holds the
caller for as long as it likes, and the sibling that could have served never hears about it.

Three bounds sit under that wait today, and none of them belongs to recompose. Node's own fetch
carries `headersTimeout` and `bodyTimeout`, both defaulting to 300 seconds. `bodyTimeout` measures
the gap between body chunks rather than total body time. `proxyFetchBoundMs` puts a 600-second abort
on the outbound fetch. The first two evaporate wherever the transport isn't Node's fetch. That means
every subscription turn, since those cross through `node-wreq` for its own fingerprint. The third
fires after the first two, and it reports an abort rather than a target.

One measurement settled the shape ahead of the code. An abort signal handed to fetch stays attached
to the response body. Headers arrived at 9 ms and the first chunk at 10 ms. A signal set for 1500 ms
then errored the body at 1503 ms, mid-read. So `AbortSignal.timeout` doesn't bound the wait for a
first byte. It bounds the whole answer. A bound short enough to be useful would cut every healthy
stream at the bound.

## Decision

**The bound belongs to the commit latch, which releases it at the commit.** The latch races each read
of the held body against a deadline, and cancels the reader when the deadline wins. The first event
clears the deadline as it lands. A model that thinks for three minutes before its first token still
streams for as long as it likes afterward. A bound that kept counting would cut a reply already in
flight, and that's the one failure this deadline exists to avoid causing.

**Cancelling the reader enforces the bound, rather than a signal on the fetch.** A signal needs the
transport to honour `init.signal`, and the subscription path never sees one. Cancelling a
`ReadableStream` is the contract every body obeys, whatever produced it. The latch already relies on
it for the child whose first event carried an error. One seam covers both transports.

**Running out of patience is a transport failure, not a refusal.** The latch throws. The attempt
guard already spanning the latch catches it, and the walk moves to the next child exactly as it does
for a refused connection. A target that never answered gave the caller the same nothing. It earns
the same reading rather than a fourth one.

**The bound is 240 seconds, and it's a default rather than a law.** The ceiling is 300 seconds,
because that's where Node's fetch severs a silent body. recompose has to fire first, so the failure
names the gateway, the target and the virtual model instead of surfacing an untyped dispatcher error.

How long a healthy request can legitimately stay silent sets the floor. Anthropic, Gemini and the
OpenAI Responses interface open with a lifecycle event that precedes thinking, so for those the
answer is seconds. OpenAI chat completions against a reasoning model has no such event. The published
figures are medians rather than tails. At high effort, `gpt-5` publishes 97 seconds to a first token
and 112 seconds to a first answer token. The efforts above it publish 110 to 141 seconds. Nobody
publishes a tail for any of them. A documented keep-alive event is permissive rather than guaranteed, and a field
report records 185 seconds of a stream carrying no event of any kind.

Where the evidence runs out, the asymmetry decides. Waiting on a request already lost costs latency.
Cutting a healthy one spends a second account, charges twice and returns a worse answer. Generosity
is close to free here, precisely because the deadline stops at the commit. Tightness buys little,
because a dead target refuses its connection in milliseconds and already fails over.

The room between that floor and the 300-second ceiling is thinner than it looks. A median near 141
seconds leaves a tail that may already cross both numbers. If it does, Node's own default already
severs the slowest healthy reasoning turns, on every credentialed request, and did so long before
this record. Repairing that means an undici `Agent` recompose builds and passes as its dispatcher. It
would carry a body timeout chosen for a streamed answer rather than one inherited from a
general-purpose transport. That touches global dispatcher state, and this record doesn't do it.

**A mid-stream death names what it lost.** The stream the latch hands downstream reads through a
wrapper. The wrapper logs the gateway, the target and the virtual model before rethrowing, so a
truncated answer still reaches the caller unchanged. It adds one `try` to a callback that already
runs per chunk. It copies nothing, buffers nothing, and leaves back-pressure untouched.

## Consequences

A silent target now costs one child and 240 seconds rather than the caller's whole patience. That
holds on every transport, rather than only the ones Node's fetch carries. A person reading the log
learns which gateway, which target and which virtual model, for the silence and the death alike.

The wait for response headers keeps its 600-second ceiling. An answer carrying no event stream never
enters the latch, so this record bounds neither. Both are worth revisiting, and neither is what a
terminated stream is.

`proxyFetchBoundMs` is partly unreachable as written, since Node's fetch severs a silent body at 300
seconds long before that abort fires. This record doesn't repair it.

One question stayed open through the research, and the number rides on it. Does OpenAI flush its
opening role frame on chat completions before a reasoning model finishes thinking? Or does it
withhold every byte until the answer starts? No vendor document and no field report settles it either
way. The published measurements count tokens rather than frames, so an empty opening frame would be
invisible to them. The bound assumes the pessimistic reading. One timestamped streaming request
against a reasoning model at high effort would settle it, and let the number tighten on evidence.

One number can't be right for every provider and every model. Comparable gateways expose this per
provider, and none publishes a default worth copying. LiteLLM names a knob for this wait exactly, and
its own tracker records that the knob went unenforced on the first chunk. That's a fair warning about
how this goes wrong. A constant ships here because exposing it needs a schema field, a
transport hop and a settings surface, which is a feature rather than a bound. The seam is a plain
parameter on the latch, so a per-gateway value has somewhere to land. The provider observability span
already records time to first token, which lets real traffic settle the number rather than argument.
