import { RecomposeMark } from '../../../../shared/ui';

const RINGS = [0, 800, 1600];

/**
 * The field a waiting step sends out while nothing has landed.
 *
 * @summary It says the gateway is listening rather than that anything is happening, which is the
 * honest reading: nothing here can make a request arrive. It hides from the accessibility tree,
 * because the standing beside it already says the same thing in words a reader can act on, and
 * under a reduced-motion preference the rings stand still rather than pulsing.
 */
export function SetupSonar() {
  return (
    <div aria-hidden className="relative flex size-64 items-center justify-center">
      {RINGS.map((delay) => (
        <span
          className="absolute size-64 sonar-ring rounded-full border-2 border-running"
          key={delay}
          style={{ animationDelay: `${String(delay)}ms` }}
        />
      ))}
      <span className="relative flex size-16 items-center justify-center rounded-full border border-line-subtle bg-surface-card">
        <RecomposeMark className="size-8" />
      </span>
    </div>
  );
}
