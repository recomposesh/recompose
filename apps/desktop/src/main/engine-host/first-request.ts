import type { EngineTrafficReport } from '@recompose/contracts';

/**
 * Reports the first request a gateway actually served, and never reports again.
 *
 * @summary A request reaching a target says nothing about whether the target answered it: a
 * credential the app stored can be turned away the first time a client spends it, and a stream can
 * rate-limit after it opens. So the latch reads the outcome the gateway wrote down rather than the
 * grant that let the request go, and only a served outcome closes it.
 *
 * A live outcome closes nothing, because a request still answering has served nobody yet. The
 * same request arriving later as served is what closes the latch, which is the honest reading of a
 * stream that opened and then finished.
 */
export function noticingTheFirstServed(
  onFirstServed: () => void,
): (report: EngineTrafficReport) => void {
  let unreported = true;

  return (report) => {
    if (report.request.outcome === 'served' && unreported) {
      unreported = false;
      onFirstServed();
    }
  };
}
