# 0143: The site answers at one address

**Status**: Accepted
**Date**: 2026-08-18

## Context

The recompose.sh zone went live behind Cloudflare with two proxied placeholder records
(`AAAA 100::` on the apex and on www) replacing the registrar's imported parking records. Record
0140's workflow replaces the whole `http_request_dynamic_redirect` phase ruleset on every publish,
so a redirect added by hand in the dashboard vanishes at the next release. Nothing canonicalized
the host or the scheme: www answered a bare error, and plain HTTP reached the placeholder origin.

## Decision

**www lands on the apex with a 301.** The rule lives in the workflow's ruleset as its first
entry, preserving path and query string, and the workflow verifies it after every write. Record
0140's "always 302" holds for download targets because their destination changes each release.
The canonical host never changes, so this one redirect is permanent on purpose.

**Anything permanent in that ruleset lives in the workflow.** The workflow owns the phase
entrypoint outright and replaces it as one unit, so the repository is the only place a lasting
rule can survive.

**Plain HTTP upgrades at the edge.** The maintainer turns on the zone's Always Use HTTPS setting
in the dashboard. No token in continuous integration carries zone-settings scope, and one boolean
doesn't justify minting one.

## Alternatives

- **Bulk Redirects for the www rule**: a second redirect system at the account level for one
  rule, invisible next to the ruleset the workflow already writes.
- **A hand-made rule in the dashboard**: the next publish deletes it without a trace.
- **Leaving www unresolvable**: typing www in front of a domain is the oldest habit on the web,
  and the zone already answers for the name.

## Consequences

**Good**: one owner for every redirect in the zone, and the same job that writes the host
canonicalization also proves it.

**Bad**: the www rule only starts answering once a bootstrap write or the first publish lands it.
The Always Use HTTPS toggle stays manual dashboard state the repository can't prove or restore.
