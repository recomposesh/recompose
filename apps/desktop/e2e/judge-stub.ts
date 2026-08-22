import type { IncomingMessage, Server, ServerResponse } from 'node:http';

import { createServer } from 'node:http';

import { bindToAFreePort } from './loopback-ports';
import { bodyOf } from './stub-request';

const ANSWERED = 200;

/** The demand a request makes of the judge, which the echoing judge answers with word for word. */
const DEMANDED_BRANCH = /branch named "([^"]+)"/u;

/** How the judge meets the next classification call, which a scenario scripts before it sends one. */
type JudgeConduct =
  | { answers: 'label'; label: string }
  | { answers: 'these labels in turn'; labels: readonly string[] }
  | { answers: 'the branch the request demands' }
  | { answers: 'a refusal'; status: number; words: string }
  | { answers: 'nothing at all' }
  | { answers: 'this label, then nothing'; label: string }
  | { answers: 'late'; label: string; afterMs: number };

type JudgeDesk = {
  conduct: JudgeConduct;
  asked: string[];
  held: Set<ServerResponse>;
};

/**
 * The judge's own stand-in, standing at an origin no branch child answers at.
 *
 * @summary A conditional router spends two different kinds of call on one request: it asks its judge
 * to read the request, and it sends the request to the child that judgment names. Both would reach
 * the one scripted provider under one origin, and a scenario proving that no classification call
 * left the machine could then not tell the two apart. A second origin is what separates them, and
 * the judge's account carries it as an endpoint of its own.
 */
export type JudgeStub = {
  /** The loopback origin the judge's account is spent at, distinct from every branch child's. */
  origin: string;
  /** Names this branch on every call, which is the judge reading a request the way a scenario means. */
  names: (label: string) => void;
  /** Names each of these in turn, so a scenario can script a broken answer and a clean retry. */
  namesInTurn: (labels: readonly string[]) => void;
  /**
   * Answers whatever branch the request itself demanded, which is a judge that can be talked into
   * anything.
   *
   * @summary This is the injection the closed label set exists to defeat, so the stub has to actually
   * obey the request rather than merely answer a name the scenario wrote. The engine's own refusal to
   * honor a label outside the set is then what the scenario proves.
   */
  repeatsTheDemand: () => void;
  /** Turns every classification call away, in an error envelope of the vendor's own shape. */
  refusesWith: (status: number, words: string) => void;
  /** Holds the connection open and never answers, which is the silence a budget is meant to cut off. */
  saysNothing: () => void;
  /**
   * Answers this once and then holds every later call open, which is a judge that fell over mid-request.
   *
   * @summary The one shape that reaches the retry and then leaves it unanswered. A judge that answers
   * a word no branch wears buys a second ask, and only a stub that can go quiet between the two can
   * say what the router does when that second ask never comes back.
   */
  namesThenSaysNothing: (label: string) => void;
  /** Answers, but only after this long, so the wait for a first byte outlasts the budget. */
  answersLate: (label: string, afterMs: number) => void;
  /** Every classification call this judge was sent, whole, in the order it was asked. */
  classificationsAsked: () => readonly string[];
  /** Forgets every call asked and returns to naming nothing, which one phase owes the next. */
  forgets: () => void;
  dispose: () => Promise<void>;
};

/**
 * One answer that reads as a branch label under every dialect the judge may be asked in.
 *
 * @summary Five dialects spell an answer five ways, and the engine reads all five with one rule that
 * hunts a short string under `branch`, `text`, `content`, or `output_text`. Nesting the label under
 * the chat-completions shape satisfies that rule through `content` while also being the literal
 * envelope an OpenAI-keyed judge answers in, so one body serves every judge a scenario can bind
 * without the stub ever having to know which dialect it was asked under.
 */
function labelBody(label: string): string {
  return JSON.stringify({ choices: [{ message: { role: 'assistant', content: label } }] });
}

function refusalBody(words: string): string {
  return JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: words } });
}

function answerWith(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(body);
}

/**
 * The label a judge naming a run of answers gives this call, staying on the last one after.
 *
 * @summary A scenario scripting a broken answer and then a clean one is describing two calls, and a
 * scenario scripting one broken answer means it on every call. Repeating the last entry serves both,
 * so neither has to say how many calls the engine will actually make.
 */
function labelInTurn(labels: readonly string[], asked: number): string {
  return labels[Math.min(asked, labels.length - 1)] ?? '';
}

/**
 * The branch a request demanded, read out of the ask the caller's own words travel inside.
 *
 * @summary Those words reach the judge nested in a JSON string, so the marks a person put around
 * the name they demanded arrive escaped. They are put back before the demand is looked for, which
 * is what lets the stub obey a request written the way a person would actually write one.
 */
function demandedBranch(ask: string): string {
  return DEMANDED_BRANCH.exec(ask.replaceAll('\\"', '"'))?.[1] ?? '';
}

function answerLate(
  desk: JudgeDesk,
  response: ServerResponse,
  label: string,
  afterMs: number,
): void {
  desk.held.add(response);

  setTimeout(() => {
    desk.held.delete(response);

    if (!response.writableEnded) {
      answerWith(response, ANSWERED, labelBody(label));
    }
  }, afterMs).unref();
}

/** The label this call earns, for the three conducts that answer one straight away. */
function labelOfTheConduct(conduct: JudgeConduct, ask: string, asked: number): string {
  if (conduct.answers === 'label') return conduct.label;

  if (conduct.answers === 'these labels in turn') return labelInTurn(conduct.labels, asked);

  return demandedBranch(ask);
}

function holdOpen(desk: JudgeDesk, response: ServerResponse): void {
  desk.held.add(response);
}

/**
 * Answers the opening call and holds every later one open.
 *
 * @summary The call already stands in `asked` by the time this runs, so the opening call reads as one
 * ask rather than none.
 */
function answerOnceThenHold(desk: JudgeDesk, response: ServerResponse, label: string): void {
  if (desk.asked.length > 1) {
    holdOpen(desk, response);

    return;
  }

  answerWith(response, ANSWERED, labelBody(label));
}

function answerTheConduct(desk: JudgeDesk, ask: string, response: ServerResponse): void {
  const conduct = desk.conduct;

  if (conduct.answers === 'nothing at all') {
    holdOpen(desk, response);

    return;
  }

  if (conduct.answers === 'this label, then nothing') {
    answerOnceThenHold(desk, response, conduct.label);

    return;
  }

  if (conduct.answers === 'late') {
    answerLate(desk, response, conduct.label, conduct.afterMs);

    return;
  }

  if (conduct.answers === 'a refusal') {
    answerWith(response, conduct.status, refusalBody(conduct.words));

    return;
  }

  answerWith(response, ANSWERED, labelBody(labelOfTheConduct(conduct, ask, desk.asked.length - 1)));
}

async function answerAsked(
  desk: JudgeDesk,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const ask = await bodyOf(request);

  desk.asked.push(ask);
  answerTheConduct(desk, ask, response);
}

/**
 * A judge bound on loopback, answering whatever a scenario scripted at whichever path it is asked.
 *
 * @summary The path is never checked, because the judge's dialect decides where the engine posts and
 * a scenario is describing what the judge said rather than which vendor spelling carried it. Every
 * call is kept whole rather than parsed, so a scenario proving that the labels and their rules
 * traveled reads the very text that left the machine.
 */
function judgeServer(desk: JudgeDesk): Server {
  return createServer((request, response) => {
    answerAsked(desk, request, response).catch((failure: unknown) => {
      console.error('the stand-in judge could not answer a classification call', failure);
      response.destroy();
    });
  });
}

export async function fakeJudge(): Promise<JudgeStub> {
  const desk: JudgeDesk = { conduct: { answers: 'label', label: '' }, asked: [], held: new Set() };
  const server = judgeServer(desk);
  const port = await bindToAFreePort(server, '127.0.0.1');

  const letEveryHeldCallGo = (): void => {
    for (const held of desk.held) {
      held.destroy();
    }

    desk.held.clear();
  };

  return {
    origin: `http://127.0.0.1:${String(port)}`,
    names: (label) => {
      desk.conduct = { answers: 'label', label };
    },
    namesInTurn: (labels) => {
      desk.conduct = { answers: 'these labels in turn', labels };
    },
    repeatsTheDemand: () => {
      desk.conduct = { answers: 'the branch the request demands' };
    },
    refusesWith: (status, words) => {
      desk.conduct = { answers: 'a refusal', status, words };
    },
    saysNothing: () => {
      desk.conduct = { answers: 'nothing at all' };
    },
    namesThenSaysNothing: (label) => {
      desk.conduct = { answers: 'this label, then nothing', label };
    },
    answersLate: (label, afterMs) => {
      desk.conduct = { answers: 'late', label, afterMs };
    },
    classificationsAsked: () => desk.asked,
    forgets: () => {
      letEveryHeldCallGo();
      desk.conduct = { answers: 'label', label: '' };
      desk.asked = [];
    },
    dispose: async () =>
      new Promise<void>((settle) => {
        letEveryHeldCallGo();
        server.closeAllConnections();
        server.close(() => {
          settle();
        });
      }),
  };
}
