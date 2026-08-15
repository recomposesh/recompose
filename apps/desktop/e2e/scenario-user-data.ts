import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CHECKOUT_DIGITS = 12;

/**
 * The folder one scenario's application keeps its user data in.
 *
 * @summary The worker index alone named it until two checkouts running the suite at once were
 * found sharing a folder, where the fixture's own sweep raced a live application into `ENOTEMPTY`,
 * a missing gateways folder, and gateways another checkout had named. The checkout the harness
 * runs from is what tells those runs apart, so its path is hashed into the name. A hash rather
 * than the path itself because the path is long, nested, and full of separators, and nothing
 * reads the folder name back. Every checkout has a path, so a plain clone is named the same way a
 * worktree is, on every platform the suite runs on.
 */
export function scenarioUserDataDir(checkoutRoot: string, parallelIndex: number): string {
  const checkout = createHash('sha256')
    .update(checkoutRoot)
    .digest('hex')
    .slice(0, CHECKOUT_DIGITS);

  return join(homedir(), `.recompose-e2e-${checkout}-w${String(parallelIndex)}`);
}
