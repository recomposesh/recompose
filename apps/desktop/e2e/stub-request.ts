import type { IncomingMessage } from 'node:http';

/**
 * Everything one incoming request carried, read whole before a stand-in answers it.
 *
 * @summary Every stand-in on loopback needs the body before it can decide anything, and a body
 * arrives in chunks rather than at once. One reading serves them all, so two stubs can never come
 * to differ about what a request said.
 */
export async function bodyOf(request: IncomingMessage): Promise<string> {
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
