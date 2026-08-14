import type { FixtureResponse, FixtureOpts, JournalEntry, LLMock } from '@copilotkit/aimock';

import { LLMock as MockedProvider } from '@copilotkit/aimock';

import { answerTheProviderGives } from './key-probe-stub';

/** The status and the words one target turns a forwarded turn away with. */
type ScriptedRefusal = {
  status: number;
  words?: string;
  /** The vendor's own name for the failure, which the classification table reads. */
  kind?: string;
  /**
   * The seconds the provider promises before another try can work.
   *
   * @summary Only a provider that promises one writes `Retry-After`, and the exhausted refusal
   * answers 429 rather than 502 only when every child it tried promised a time. A scenario about
   * either therefore has to be able to say whether this refusal carried one.
   */
  retryAfterSeconds?: number;
};

/**
 * A stand-in for the vendors' hosts that answers each target differently.
 *
 * @summary Every method addresses a target by the real model name it serves, because that is what
 * actually tells two targets apart on the wire: both children of a router reach one origin under
 * one dialect, and the model each attempt names is the only thing that differs. It is also what
 * `modelsAsked` reads back, so a scenario arranges and asserts in the same vocabulary.
 */
export type ScriptedProvider = {
  /** The loopback origin recompose spends this scenario's targets at, in place of the vendors'. */
  origin: string;
  /** Answers every turn asked under this real model with the words a served turn carries. */
  serves: (providerModel: string, words?: string) => void;
  /** Turns every turn asked under this real model away, in the vendor's own error envelope. */
  refuses: (providerModel: string, refusal: ScriptedRefusal) => void;
  /**
   * The general lane: any answer a fixture can express, under any of its delivery controls.
   *
   * @summary `truncateAfterChunks` and `disconnectAfterMs` ride the delivery controls, which is how
   * a scenario about a stream that fails partway says where it failed.
   */
  answers: (providerModel: string, answer: FixtureResponse, delivery?: FixtureOpts) => void;
  /**
   * Every real model this provider was asked for, in the order it was asked.
   *
   * @summary The same reading `KeyProbeStub` answers, so a step proving what left the machine reads
   * one shape whichever stand-in the scenario was served by.
   */
  modelsAsked: () => readonly string[];
  /** Every turn asked, whole, for a scenario that has to read what a request carried. */
  turnsAsked: () => readonly JournalEntry[];
  /**
   * The mock itself, for an answer no fixture can express.
   *
   * @summary Two shapes need it and neither is expressible as a fixture: a 200 stream whose first
   * event is an error, and a connection dropped before any status. `mount` cannot serve a path the
   * mock already owns, so neither reaches `/v1/messages` through it.
   */
  mock: LLMock;
  /** Forgets every scripted answer and every turn asked, which one scenario owes the next. */
  forgets: () => void;
  dispose: () => Promise<void>;
};

function refusalBody(refusal: ScriptedRefusal): FixtureResponse {
  return {
    error: {
      message: refusal.words ?? 'the target could not answer',
      type: refusal.kind ?? 'invalid_request_error',
    },
    status: refusal.status,
    ...(refusal.retryAfterSeconds === undefined ? {} : { retryAfter: refusal.retryAfterSeconds }),
  };
}

function modelOf(entry: JournalEntry): string {
  return entry.body?.model ?? '';
}

/**
 * A vendor stand-in a scenario writes the answers of, bound on loopback so recompose reaches it.
 *
 * @summary The key probe answers one thing to every turn, which is enough while a virtual model
 * binds one target. A router offers one request to several children in turn, so a scenario about
 * failover has to be able to say that this child refused and that one served, and a scenario about
 * the commit boundary has to be able to open a stream and break it partway. Both are why the
 * serving path adopts a mock rather than growing the probe a second time.
 */
export async function fakeScriptedProvider(): Promise<ScriptedProvider> {
  const mock = new MockedProvider({ host: '127.0.0.1', logLevel: 'silent' });
  const origin = await mock.start();

  const answers = (
    providerModel: string,
    answer: FixtureResponse,
    delivery?: FixtureOpts,
  ): void => {
    mock.prependFixture({ match: { model: providerModel }, response: answer, ...delivery });
  };

  return {
    origin,
    serves: (providerModel, words) => {
      answers(providerModel, { content: words ?? answerTheProviderGives });
    },
    refuses: (providerModel, refusal) => {
      answers(providerModel, refusalBody(refusal));
    },
    answers,
    modelsAsked: () => mock.getRequests().map(modelOf),
    turnsAsked: () => mock.getRequests(),
    mock,
    forgets: () => {
      mock.reset();
    },
    dispose: async () => mock.stop(),
  };
}
