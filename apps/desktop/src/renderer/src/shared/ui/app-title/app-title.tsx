import { RecomposeMark } from '../recompose-mark/recompose-mark';
import { RecomposeWordmark } from '../recompose-wordmark/recompose-wordmark';

/**
 * The app's own mark and name, standing where the platform's title bar would have drawn them.
 *
 * @summary Reach for it only on a platform whose title bar the window hides without drawing the
 * window controls over this corner. Where the controls float here there is nothing to fill, and
 * where the platform keeps its title bar the name is already on it.
 */
export function AppTitle() {
  return (
    <span className="flex items-center gap-1.5 ps-1 text-ink-secondary">
      <RecomposeMark className="size-4 shrink-0" />
      <RecomposeWordmark />
    </span>
  );
}
