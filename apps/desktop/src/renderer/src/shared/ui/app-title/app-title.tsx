import { RecomposeMark } from '../recompose-mark/recompose-mark';
import { RecomposeWordmark } from '../recompose-wordmark/recompose-wordmark';

/**
 * The app's own mark and name, standing where the platform's title bar would have drawn them.
 *
 * @summary Reach for it only on a platform whose title bar the window hides without drawing the
 * window controls over this corner. Where the controls float here the mark stands alone, because
 * the lockup would run under the control at the band's far end once the controls have taken their
 * ninety pixels, and where the platform keeps its title bar the name is already on it. How far it
 * stands off the leading edge belongs to whatever it stands in, which is what keeps one clearance
 * from being spelled in two places.
 */
export function AppTitle() {
  return (
    <span className="flex items-center gap-1.5 text-ink-secondary">
      <RecomposeMark className="size-4 shrink-0" />
      <RecomposeWordmark />
    </span>
  );
}
