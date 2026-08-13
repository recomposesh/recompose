import { z } from 'zod';

export const ipcErrorSchema = z.strictObject({
  code: z.enum([
    'vault-unavailable',
    'vault-newer-schema',
    'settings-newer-schema',
    'accounts-newer-schema',
    'usage-newer-schema',
    'validation-failed',
    'storage-failed',
    'folder-open-failed',
    'name-conflict',
    'port-conflict',
    'tool-missing',
    'sign-in-timed-out',
    'keychain-denied',
    'nothing-to-adopt',
  ]),
  message: z.string().min(1),
});

export type IpcError = z.infer<typeof ipcErrorSchema>;

export function ipcResult<Value extends z.ZodType>(value: Value) {
  return z.union([
    z.strictObject({ ok: z.literal(true), value }),
    z.strictObject({ ok: z.literal(false), error: ipcErrorSchema }),
  ]);
}
