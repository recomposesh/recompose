import { compiledJudgePrompt, declineWordFor } from '@recompose/contracts';

import type { JsonObject, ProviderDialect } from '../gateway-wire';
import type { BranchRule } from '../routing/policies';

import { userTurnsOf } from '../gateway-request-turns';
import { isJsonObject, parsedJson } from '../gateway-wire';

export type JudgeQuestion = {
  dialect: ProviderDialect;
  providerModel: string;
  branches: readonly BranchRule[];
  directive?: string | undefined;
  raw: JsonObject;
};

const TAIL_OPEN = '<request>';

const TAIL_CLOSE = '</request>';

const TAIL_CHARS = 2_000;

const ELIDED = '\n...\n';

const ANTHROPIC_ANSWER_TOKENS = 1_024;

const TOOL_NAME = 'pick_branch';

const LABEL_KEYS = new Set(['branch', 'text', 'content', 'output_text']);

/**
 * Every word the judge may answer with, which is the branches and then the decline.
 *
 * @summary The decline rides in the enum rather than beside it, because Gemini answers a bare label
 * and has no second field to carry a refusal in. It stands last for the same reason it stands last in
 * the prompt, and the two lists are drawn from one authority so a judge can never be offered a word
 * the prompt never showed it.
 */
function labelsOf(question: JudgeQuestion): readonly string[] {
  return [
    ...question.branches.map((branch) => branch.label.trim()),
    declineWordFor(question.branches),
  ];
}

/**
 * What the judge is told about the branches, which is the very text the inspector prints.
 *
 * @summary The assembly lives in the contracts rather than here, because the panel that shows a
 * person what their judge reads has to show this text and not a second copy of it.
 */
function judgeInstructions(question: JudgeQuestion): string {
  return compiledJudgePrompt({ branches: question.branches, directive: question.directive });
}

/**
 * The last turn narrowed to what a judge is given room to read, keeping both of its ends.
 *
 * @summary No client agrees on where the ask sits inside a turn. An agentic client appends reminders
 * and gathered context after the words a person typed, while somebody pasting a long log writes the
 * ask underneath it. A window over either end alone drops the ask for half of them, and a window over
 * the trailing end alone is how a question about deployment reached a judge as a page of renderer
 * vocabulary. The middle is elided instead, because no classification has ever turned on it.
 */
function withinTheJudgesRoom(spoken: string): string {
  if (spoken.length <= TAIL_CHARS) return spoken;

  const end = TAIL_CHARS / 2;

  return `${spoken.slice(0, end)}${ELIDED}${spoken.slice(-end)}`;
}

/**
 * The caller's own words, marked as the untrusted data they are.
 *
 * @summary A tail that wrote the markers itself could otherwise close the block and go on as if it
 * were the gateway talking, so both markers are struck out of it before it is wrapped. Only the last
 * turn travels: the classification turns on what is being asked now, and a whole transcript would
 * spend the judge's context on turns already answered.
 */
function markedTail(raw: JsonObject): string {
  const spoken = withinTheJudgesRoom(userTurnsOf(raw).at(-1) ?? '');
  const tail = spoken.replaceAll(TAIL_OPEN, ' ').replaceAll(TAIL_CLOSE, ' ');

  return `${TAIL_OPEN}\n${tail}\n${TAIL_CLOSE}`;
}

function enumSchema(labels: readonly string[]): JsonObject {
  return {
    type: 'object',
    properties: { branch: { type: 'string', enum: labels } },
    required: ['branch'],
    additionalProperties: false,
  };
}

function chatCompletionsAsk(question: JudgeQuestion): JsonObject {
  return {
    model: question.providerModel,
    messages: [
      { role: 'system', content: judgeInstructions(question) },
      { role: 'user', content: markedTail(question.raw) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'branch', strict: true, schema: enumSchema(labelsOf(question)) },
    },
  };
}

function responsesAsk(question: JudgeQuestion): JsonObject {
  return {
    model: question.providerModel,
    instructions: judgeInstructions(question),
    input: markedTail(question.raw),
    text: {
      format: {
        type: 'json_schema',
        name: 'branch',
        strict: true,
        schema: enumSchema(labelsOf(question)),
      },
    },
  };
}

function interactionsAsk(question: JudgeQuestion): JsonObject {
  return {
    model: question.providerModel,
    system_instruction: judgeInstructions(question),
    input: markedTail(question.raw),
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'branch', strict: true, schema: enumSchema(labelsOf(question)) },
    },
  };
}

/**
 * How a Gemini judge is asked, which is for a bare label rather than for json holding one.
 *
 * @summary Gemini is the one dialect whose own enum mode answers the label and nothing around it, so
 * the answer needs no parsing at all and a truncated brace can never break a classification.
 */
function geminiAsk(question: JudgeQuestion): JsonObject {
  return {
    contents: [{ role: 'user', parts: [{ text: markedTail(question.raw) }] }],
    systemInstruction: { parts: [{ text: judgeInstructions(question) }] },
    generationConfig: {
      responseMimeType: 'text/x.enum',
      responseSchema: { type: 'STRING', enum: labelsOf(question) },
    },
  };
}

/**
 * How an Anthropic judge is asked, which is through one tool it has no choice but to call.
 *
 * @summary Forced tool use is the constraint every Anthropic channel honors, while the schema field
 * the newest models publish is stripped by wires a person may well have bound the judge to, and the
 * walk gives a refused ask no second chance to try the other channel. A tool call also suppresses
 * any prose before it, so a model that would have explained itself answers the label alone. The
 * answer keeps room past whatever thinking the judge does first, because a cap sized for one word
 * would be spent on reasoning and come back empty.
 */
function anthropicAsk(question: JudgeQuestion): JsonObject {
  return {
    model: question.providerModel,
    max_tokens: ANTHROPIC_ANSWER_TOKENS,
    system: judgeInstructions(question),
    messages: [{ role: 'user', content: markedTail(question.raw) }],
    tools: [
      {
        name: TOOL_NAME,
        description: 'Name the one branch this request belongs to.',
        input_schema: enumSchema(labelsOf(question)),
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  };
}

const ASK_BY_DIALECT: Record<ProviderDialect, (question: JudgeQuestion) => JsonObject> = {
  anthropic: anthropicAsk,
  'chat-completions': chatCompletionsAsk,
  gemini: geminiAsk,
  interactions: interactionsAsk,
  responses: responsesAsk,
};

/**
 * The one classification request a judge is sent, shaped the way its own dialect constrains answers.
 *
 * @summary Prompt discipline alone is not a constraint, so every dialect here closes the answer to
 * the branch labels through its own mechanism. That closure is also the injection defense: a tail
 * that begs for an expensive branch cannot name one outside the set, and a label the set does not
 * hold lands on else by construction rather than by a check written somewhere downstream.
 */
export function judgeRequestBody(question: JudgeQuestion): JsonObject {
  return ASK_BY_DIALECT[question.dialect](question);
}

function labelUnder(key: string, value: unknown): string | undefined {
  return typeof value === 'string' && LABEL_KEYS.has(key) ? value : labelWritten(value);
}

function labelWritten(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.map(labelWritten).find((found) => found !== undefined);
  }

  if (!isJsonObject(value)) return undefined;

  for (const [key, held] of Object.entries(value)) {
    const found = labelUnder(key, held);

    if (found !== undefined) return found;
  }

  return undefined;
}

function branchNamedInJson(written: string): string | undefined {
  const parsed = parsedJson(written);

  if (!isJsonObject(parsed)) return undefined;

  const branch = parsed['branch'];

  return typeof branch === 'string' ? branch.trim() : undefined;
}

/**
 * The branch label one judge answer carries, whichever dialect wrote it.
 *
 * @summary Five dialects spell an answer five ways and every one of them buries a short string, so
 * the read is one rule over the whole answer rather than five readers that would drift apart. An
 * answer nothing can be read from comes back empty, which is the broken answer the branches already
 * know how to absorb rather than a throw the walk would have to catch.
 */
export function labelTheJudgeWrote(answer: unknown): string {
  const written = labelWritten(answer)?.trim() ?? '';

  return branchNamedInJson(written) ?? written;
}
