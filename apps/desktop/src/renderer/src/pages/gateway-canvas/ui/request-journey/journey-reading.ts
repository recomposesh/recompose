import type { Account, LogRow as LoggedRequest } from '@recompose/contracts';

import { requestInFlight } from '../../../../entities/request-log';
import { servedAt, servedBy, tookFor } from '../log-row/logged-request';

/** One thing the journey says about a request, under the word a person looks for it by. */
export type JourneyLine = { label: string; reading: string };

function statusReading(logged: LoggedRequest): string {
  return requestInFlight(logged) ? 'live' : String(logged.status);
}

function childrenTried(logged: LoggedRequest): readonly JourneyLine[] {
  return (logged.diagnosis?.tried ?? []).map((attempt) => ({
    label: 'Tried',
    reading: `${attempt.child} ${attempt.why}`,
  }));
}

function theRequestAndWhatTookIt(
  logged: LoggedRequest,
  account: Account | undefined,
): readonly JourneyLine[] {
  return [
    { label: 'Time', reading: servedAt(logged.at) },
    { label: 'Method', reading: logged.method },
    { label: 'Asked for', reading: logged.virtualModel ?? '' },
    { label: 'Resolved to', reading: logged.providerModel ?? '' },
    { label: 'Served by', reading: servedBy(logged, account) },
  ];
}

function howItWent(logged: LoggedRequest): readonly JourneyLine[] {
  return [
    { label: 'Status', reading: statusReading(logged) },
    { label: 'Took', reading: requestInFlight(logged) ? '' : tookFor(logged.durationMs) },
  ];
}

function theGatewaysReading(logged: LoggedRequest): readonly JourneyLine[] {
  return [
    { label: 'Router', reading: logged.diagnosis?.router ?? '' },
    ...childrenTried(logged),
    { label: 'Cause', reading: logged.failure ?? '' },
  ];
}

function theProvidersMessage(logged: LoggedRequest): readonly JourneyLine[] {
  return [{ label: 'Provider said', reading: logged.diagnosis?.upstreamMessage ?? '' }];
}

function everyLineTheRequestCouldFill(
  logged: LoggedRequest,
  account: Account | undefined,
): readonly JourneyLine[] {
  return [
    ...theRequestAndWhatTookIt(logged, account),
    ...howItWent(logged),
    ...theGatewaysReading(logged),
    ...theProvidersMessage(logged),
  ];
}

/**
 * What one request came to, read from the moment it landed to the reason it ended.
 *
 * @summary The order is the order the request happened in, so a person reads down the panel and
 * arrives at the failure having already seen everything that led to it. A line the request never
 * filled leaves rather than standing empty, because a blank reading asks a reader to work out
 * whether nothing happened or nothing was recorded. Every child the gateway reached gets a line of
 * its own under one word, since a ladder that ran out is a list rather than a sentence.
 */
export function journeyOf(
  logged: LoggedRequest,
  account: Account | undefined,
): readonly JourneyLine[] {
  return everyLineTheRequestCouldFill(logged, account).filter((line) => line.reading !== '');
}

/**
 * The whole journey as one block of text, which is what a single copy hands over.
 *
 * @summary A person reading this panel is usually about to paste it to somebody who can help, so
 * what lands in the paste is what stood on screen rather than a second rendering of the same facts.
 */
export function copiedJourney(logged: LoggedRequest, account: Account | undefined): string {
  return journeyOf(logged, account)
    .map((line) => `${line.label}: ${line.reading}`)
    .join('\n');
}
