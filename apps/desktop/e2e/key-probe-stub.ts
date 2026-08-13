import type { IncomingMessage, ServerResponse } from 'node:http';

import { createServer } from 'node:http';

import { controlPlaneBodyFor } from './control-plane-stub';
import { bindToAFreePort } from './loopback-ports';

const MODELS_PATH = '/v1/models';

const CHAT_TURN_PATH = '/v1/chat/completions';

const MESSAGES_TURN_PATH = '/v1/messages';

const ACCEPTED = 200;

const TURNED_AWAY = 401;

const NOTHING_THERE = 404;

/** The model ids the stand-in provider serves, which a scenario binds a virtual model to. */
export const modelsTheProviderServes = ['claude-sonnet-5', 'claude-haiku-5'] as const;

/** The words the stand-in provider answers a turn with, so a scenario reads the answer back. */
export const answerTheProviderGives = 'The target answered.';

/** How the provider answers the next check, which a scenario scripts before it asks for one. */
type ProviderAnswer = 'accepts' | 'turns-away' | 'refuses-the-connection';

/** The status and the words the provider turns a forwarded turn away with. */
type TurnRefusal = { status: number; words: string };

type ProviderDesk = {
  answer: ProviderAnswer;
  refusal: TurnRefusal | undefined;
  asked: string[];
};

/** Stands in for the vendors' own hosts, so a scenario decides what a stored key hears back. */
export type KeyProbeStub = {
  /** The loopback origin recompose looks at and serves against in place of the vendors' hosts. */
  origin: string;
  accepts: () => void;
  turnsAway: () => void;
  cannotBeReached: () => void;
  /**
   * Turns every forwarded turn away under this status, saying so in its own words.
   *
   * @summary A vendor that refuses a turn answers a status and an explanation of its own, and the
   * two travel separately: the status is a fact every surface may read, while the words are the
   * target's own answer text. A scenario scripts both so it can prove which of them recompose
   * carries and which it leaves behind.
   */
  refusesTurnsWith: (status: number, words: string) => void;
  /**
   * Every model the provider was asked for this run, in the order it was asked.
   *
   * @summary The model name is the whole of what is kept, because a failing assertion prints what
   * it compared and a turn also carries the credential that opened it.
   */
  modelsAsked: () => readonly string[];
  dispose: () => Promise<void>;
};

function catalogBody(): string {
  return JSON.stringify({
    object: 'list',
    data: modelsTheProviderServes.map((id) => ({ id, object: 'model' })),
  });
}

function chatTurnAnswerBody(model: string): string {
  return JSON.stringify({
    id: 'chatcmpl-stand-in',
    object: 'chat.completion',
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: answerTheProviderGives },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
  });
}

function messagesTurnAnswerBody(model: string): string {
  return JSON.stringify({
    id: 'msg_stand-in',
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text: answerTheProviderGives }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 3, output_tokens: 4 },
  });
}

async function bodyOf(request: IncomingMessage): Promise<string> {
  return new Promise<string>((settle) => {
    let text = '';

    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      text += chunk;
    });
    request.on('end', () => {
      settle(text);
    });
  });
}

function modelNamedIn(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);

    return typeof parsed === 'object' && parsed !== null && 'model' in parsed
      ? String(parsed.model)
      : '';
  } catch {
    return '';
  }
}

function answerTheLook(desk: ProviderDesk, response: ServerResponse): void {
  response.writeHead(desk.answer === 'accepts' ? ACCEPTED : TURNED_AWAY, {
    'content-type': 'application/json',
  });
  response.end(catalogBody());
}

function refusalBody(words: string): string {
  return JSON.stringify({
    type: 'error',
    error: { type: 'invalid_request_error', message: words },
  });
}

async function answerTheTurn(
  desk: ProviderDesk,
  request: IncomingMessage,
  response: ServerResponse,
  bodyFor: (model: string) => string,
): Promise<void> {
  const model = modelNamedIn(await bodyOf(request));
  const { refusal } = desk;

  desk.asked.push(model);

  if (refusal !== undefined) {
    response.writeHead(refusal.status, { 'content-type': 'application/json' });
    response.end(refusalBody(refusal.words));

    return;
  }

  response.writeHead(ACCEPTED, { 'content-type': 'application/json' });
  response.end(bodyFor(model));
}

function answerWith(response: ServerResponse, body: string): void {
  response.writeHead(ACCEPTED, { 'content-type': 'application/json' });
  response.end(body);
}

/**
 * @summary A vendor is asked under a path that may carry a query, because Claude names its beta
 * there, so the route is decided by the path alone rather than by the whole line.
 */
function pathAsked(request: IncomingMessage): string {
  return new URL(request.url ?? '/', 'http://stand-in').pathname;
}

async function answerWhatWasAskedFor(
  desk: ProviderDesk,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const path = pathAsked(request);

  if (path === MODELS_PATH) {
    answerTheLook(desk, response);

    return;
  }

  if (path === CHAT_TURN_PATH) {
    return answerTheTurn(desk, request, response, chatTurnAnswerBody);
  }

  if (path === MESSAGES_TURN_PATH) {
    return answerTheTurn(desk, request, response, messagesTurnAnswerBody);
  }

  response.writeHead(NOTHING_THERE).end();
}

async function answerAsked(
  desk: ProviderDesk,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (desk.answer === 'refuses-the-connection') {
    request.socket.destroy();

    return;
  }

  const controlPlane = controlPlaneBodyFor(pathAsked(request));

  if (controlPlane !== null) {
    answerWith(response, controlPlane);

    return;
  }

  return answerWhatWasAskedFor(desk, request, response);
}

/**
 * A stand-in for both vendors' own host, bound on loopback so recompose will reach it.
 *
 * @summary Neither the engine child nor main honors an origin override unless it names a loopback
 * host, so the stub binds `127.0.0.1` and hands that origin over beside the launcher and keychain
 * overrides. One server answers both vendors, each at the native turn path its own dialect asks
 * under: OpenAI at chat completions, Anthropic at messages. It answers the three things a scenario
 * needs offline: the probe that asks whether a key authenticates, the catalog a live model list is
 * read from, and the turn a gateway forwards under a real model name. The look answers whatever the
 * scenario last scripted, and the model each turn asked for is kept so a scenario can prove what
 * left the machine.
 */
export async function fakeKeyProbe(): Promise<KeyProbeStub> {
  const desk: ProviderDesk = { answer: 'accepts', refusal: undefined, asked: [] };
  const server = createServer((request, response) => {
    answerAsked(desk, request, response).catch((failure: unknown) => {
      console.error('the stand-in provider could not answer a request', failure);
      response.writeHead(NOTHING_THERE).end();
    });
  });
  const port = await bindToAFreePort(server, '127.0.0.1');

  return {
    origin: `http://127.0.0.1:${String(port)}`,
    accepts: () => {
      desk.answer = 'accepts';
    },
    turnsAway: () => {
      desk.answer = 'turns-away';
    },
    cannotBeReached: () => {
      desk.answer = 'refuses-the-connection';
    },
    refusesTurnsWith: (status, words) => {
      desk.refusal = { status, words };
    },
    modelsAsked: () => desk.asked,
    dispose: async () =>
      new Promise<void>((settle) => {
        server.closeAllConnections();
        server.close(() => {
          settle();
        });
      }),
  };
}
