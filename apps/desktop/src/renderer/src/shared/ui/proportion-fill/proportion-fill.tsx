import { Meter } from '@base-ui/react/meter';

type ProportionFillProps = {
  /** The name assistive tech reads the gauge by. */
  label: string;
  /** How full the track stands, from zero to one. */
  value: number;
  /** Where the record stands on the same track, from zero to one. */
  marker?: number | undefined;
  /** The fill's paint, one of the meter or series tokens. */
  fillClassName?: string;
};

/**
 * A proportion on a fixed track, with the record drawn as a marker rather than as the track's end.
 *
 * @summary Reach for it wherever a share or a burn needs painting: the quota gauges and the
 * breakdown's share meters both compose it. The track never rescales to its own maximum, so a new
 * record moves the marker instead of quietly shrinking every earlier reading, and the meter role
 * hands the exact value to assistive tech while the paint stays decoration.
 */
export function ProportionFill({
  label,
  value,
  marker,
  fillClassName = 'bg-meter-fill',
}: ProportionFillProps) {
  return (
    <Meter.Root aria-label={label} className="w-full" max={1} min={0} value={value}>
      <Meter.Track className="relative h-1.5 w-full rounded-full bg-line-faint">
        <Meter.Indicator className={`h-full rounded-full ${fillClassName}`} />
        {marker === undefined ? null : (
          <span
            aria-hidden
            className="absolute -inset-y-0.5 w-px bg-line-selected"
            style={{ insetInlineStart: `${String(marker * 100)}%` }}
          />
        )}
      </Meter.Track>
    </Meter.Root>
  );
}
