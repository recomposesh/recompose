import { RUNTIME_PORT_RANGE, runtimePortSchema } from '@recompose/contracts';
import { useForm } from '@tanstack/react-form';

const PORT_RANGE_REFUSAL = `Accepts ${String(RUNTIME_PORT_RANGE.min)} through ${String(RUNTIME_PORT_RANGE.max)}.`;

/**
 * Why a typed port cannot be one, and nothing when it can.
 *
 * @summary Two surfaces ask for a port: the step that adds a runtime and the dialog that moves
 * one. They read the same rule from here, so a port the add would take is never one the move
 * refuses. The words come from the range itself rather than being written twice.
 */
export function portRefusal(port: string): string | undefined {
  return runtimePortSchema.safeParse(Number(port)).success ? undefined : PORT_RANGE_REFUSAL;
}

/** The draft a port is typed into, opened on whichever port the surface starts from. */
export function usePortForm(opensOn: string) {
  return useForm({ defaultValues: { port: opensOn } });
}

export type PortForm = ReturnType<typeof usePortForm>;
