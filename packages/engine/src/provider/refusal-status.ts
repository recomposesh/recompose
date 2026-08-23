import { isJsonObject, parsedJson } from '../gateway-wire';

const PAYLOAD_TOO_LARGE = 413;

const TOO_MANY_REQUESTS = 429;

const RATE_LIMIT_WORDS = ['rate_limit', 'quota', 'tokens per minute', 'requests per minute'];

function declaresARateLimit(body: string): boolean {
  const document = parsedJson(body);
  const error = isJsonObject(document) ? document['error'] : undefined;
  const said = isJsonObject(error) ? `${String(error['code'])} ${String(error['message'])}` : body;
  const lowered = said.toLowerCase();

  return RATE_LIMIT_WORDS.some((word) => lowered.includes(word));
}

/**
 * The status a refusal deserves, where the vendor's own status misreads its own body.
 *
 * @summary Groq answers a tokens-per-minute refusal with `413`, and every client reads that as a
 * request too big to send: Claude Code tells a person to remove images from a conversation that
 * has none. The body says `rate_limit_exceeded` in as many words, so the answer is restated as the
 * `429` it is. That is not a guess about the vendor: a 413 over real size never calls itself a
 * rate limit, and nothing else about the answer is touched.
 *
 * Restating it also puts the refusal back in the class the walk already knows how to act on, so a
 * child that ran out of quota stands down and a sibling takes the turn, rather than the refusal
 * reaching a person as a request they cannot fix.
 */
export async function refusalStatusRestated(answer: Response): Promise<Response> {
  if (answer.status !== PAYLOAD_TOO_LARGE) return answer;

  const body = await answer.clone().text();

  if (!declaresARateLimit(body)) return answer;

  return new Response(body, {
    status: TOO_MANY_REQUESTS,
    statusText: answer.statusText,
    headers: answer.headers,
  });
}
