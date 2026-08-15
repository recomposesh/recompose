const notSaved = "Couldn't save the change. Try again.";

export function saveStatusFor(field: string, unsavedFields: readonly string[]): string | undefined {
  return unsavedFields.includes(field) ? notSaved : undefined;
}
