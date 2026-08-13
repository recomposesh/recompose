function imagePart(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'type' in value &&
    value.type === 'input_image'
  );
}

function imageParts(parsed: unknown): unknown[] | null {
  if (imagePart(parsed)) return [parsed];

  return Array.isArray(parsed) && parsed.length > 0 && parsed.every(imagePart) ? parsed : null;
}

function parsedOrNothing(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return undefined;
  }
}

function looksEncoded(output: string): boolean {
  const opening = output.trimStart().charAt(0);

  return opening === '{' || opening === '[';
}

/**
 * A custom tool output, with an image the caller encoded as a string opened back into parts.
 *
 * @summary A tool returning an image often hands it over as JSON text, because the custom tool
 * contract carries a string. Passing that along leaves the caller reading an encoded blob where an
 * image belongs. Anything that is not image parts stays exactly as it arrived, including a string
 * that merely looks like JSON.
 */
export function unwrappedCustomOutput(output: unknown): unknown {
  if (typeof output !== 'string' || !looksEncoded(output)) return output;

  return imageParts(parsedOrNothing(output)) ?? output;
}
