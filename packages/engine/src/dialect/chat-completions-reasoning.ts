function present(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * The thought a compatible answer carries, under either spelling its vendors use for it.
 *
 * @summary `reasoning_content` is what the compatible providers document, and several answer with
 * a bare `reasoning` instead, so a reader taking only the documented one drops the whole thought
 * for those vendors and the client watches an answer arrive with nothing behind it. One reading
 * serves the whole answer and every chunk of a stream, because the two spellings are one fact
 * about this wire rather than two decisions. The documented spelling wins where both arrive: a
 * vendor sending both is naming one thought twice.
 */
export function spokenThought(
  documented: string | null | undefined,
  bare: string | null | undefined,
): string | undefined {
  return present(documented) ?? present(bare);
}
