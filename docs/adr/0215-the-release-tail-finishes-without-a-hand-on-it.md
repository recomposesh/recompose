# 0215: The release tail finishes without a hand on it

**Status**: Accepted
**Date**: 2026-08-27

## Context

v0.6.0 shipped, and every step after the build wanted a person.

`release.yml`'s `draft` job died twice at the same file:

```text
HTTP 400: 400 Bad Request (https://uploads.github.com/repos/recomposesh/recompose/releases/<id>/assets?label=&name=Recompose-0.6.0-mac.zip)
```

`gh release create` uploads five assets at once, so one refusal took four healthy siblings down with it. Both attempts left a draft holding two or three blockmaps and nothing a person could install. The file itself was sound. It hashed to exactly the sha512 that `latest-mac.yml` names, and the same upload from a laptop finished in 70 seconds.

Recovering meant downloading the three build artifacts and uploading 18 assets by hand.

`release-surfaces` then wrote the Cloudflare redirect rules, read them back about a second later, and reported that `/download/mac-arm64` still pointed at v0.5.0. Every rule read correctly minutes afterward. The job had raced the edge it had just written to.

That red job cost more than a wrong report. `site-redeploy` carries the rebuild that stamps the version on the download page, and it waited on the redirects. The redirects failed, the redeploy never ran, and recompose.sh served 0.6.0 downloads under a v0.5.0 badge until a person dispatched the deploy by hand.

## Decision

**The draft job uploads one asset at a time and gives each three attempts.** `gh release create` opens the draft with notes and no files, then a loop uploads each asset with `--clobber`, sleeping 15 and then 30 seconds between attempts. A refusal now costs one asset a retry rather than costing the release everything.

**Opening the draft became idempotent.** `gh release view` guards the create, so re-running the job after a partial upload finishes the release rather than dying on a tag that already carries one.

**A redirect check waits for the edge.** A `settled` helper reads six times, 10 seconds apart, and passes the moment status and location both match. Reading once measures propagation rather than correctness.

**One read answers both halves of that check, under a clock.** `%{redirect_url}` hands back the target of a redirect the request didn't follow, so a single `GET` carries the status and the location together. Two requests could land on two edge states and pass a status against a location it never came with. `--connect-timeout` and `--max-time` bound each read, because a helper that promises six tries owes a caller an end even when a name server or a handshake never answers.

**The site redeploy stopped waiting on the redirects.** The two jobs write different things to Cloudflare: one a redirect ruleset, the other a Worker. Neither reads what the other wrote, and a version badge frozen a release behind hurts more than a redirect job reporting late.

## Consequences

**Good**: a green build produces a complete draft on its own, with no person downloading artifacts to upload them again. A publish now updates the download page even when the redirect job has a bad minute.

**Bad**: uploading in turn takes longer than five at once, about a minute more across the 18 assets a release ships. A redirect that's genuinely wrong takes six reads to report rather than one.

## Alternatives

**Swap `gh` for `softprops/action-gh-release`.** Rejected. It offers `preserve_order` for sequential uploads but documents no retry, which is the half that mattered here. It would also add a third-party action to a pipeline that attests every artifact it ships.

**Re-run the whole tag when an upload fails.** Rejected on cost. The macOS leg signs and notarizes, which owns most of the run, and the builds were never the part that failed.

**Keep `needs` and trust the retry to keep the redirects green.** Rejected because it leaves one job's bad minute able to strand the site. The dependency never bought the two jobs anything they shared.
