import { pluralized } from '../../../../shared/lib';
import { NumericField } from '../../../../shared/ui';
import { sectionHeading } from '../subject-shell/subject-shell';

/**
 * What this section is called, which is the wait it sets rather than the field that sets it.
 *
 * @summary The heading and the control answer to one string, so a person reading the panel and one
 * hearing it meet the same words.
 */
const JUDGE_TIMEOUT_TITLE = 'Judge timeout';

const MS_IN_SECOND = 1000;

/**
 * The shortest and the longest wait a person may write here, in seconds.
 *
 * @summary A second is the floor because a judge given less than one has effectively been switched
 * off, and two minutes is the ceiling because a request waiting longer than that reads as a hang to
 * whoever sent it, whatever the router intended. Both stand well inside what the stored shape
 * accepts, so the field refuses a number before the save has to.
 */
const JUDGE_TIMEOUT_SECONDS = { min: 1, max: 120 } as const;

type JudgeTimeoutFieldProps = {
  /** How long this router waits on its judge, as the table stores it. */
  judgeBoundMs: number;
  /** Receives the wait a person wrote, in the milliseconds the table stores. */
  onCommitBoundMs: (judgeBoundMs: number) => void;
};

/**
 * How long a conditional router waits on its judge, written in the seconds a person thinks in.
 *
 * @summary Reach for it in the router inspector, beside the rhythm and the judge the wait applies
 * to. Seconds rather than the stored milliseconds, because every other number on this panel a
 * person writes is one they can say out loud. The unit stands under the field rather than only in
 * the sentence, because a person reading the number alone would otherwise be left to guess it, and
 * a screen reader would announce it bare. The sentence names the wait that actually stands and what
 * running out of it costs, since a judge past its budget refuses the request rather than falling to
 * the else branch, and that is the reason to give a slow judge more room. The field stands beside
 * the heading rather than inside it, so a screen reader meets the name once.
 */
export function JudgeTimeoutField({ judgeBoundMs, onCommitBoundMs }: JudgeTimeoutFieldProps) {
  const seconds = Math.round(judgeBoundMs / MS_IN_SECOND);

  return (
    <>
      <div className="flex items-center gap-2">
        {sectionHeading(JUDGE_TIMEOUT_TITLE)}
        <span className="ms-auto shrink-0">
          <NumericField
            description={`${String(JUDGE_TIMEOUT_SECONDS.min)} to ${String(JUDGE_TIMEOUT_SECONDS.max)} seconds`}
            label={JUDGE_TIMEOUT_TITLE}
            max={JUDGE_TIMEOUT_SECONDS.max}
            min={JUDGE_TIMEOUT_SECONDS.min}
            onCommitValue={(written) => {
              onCommitBoundMs(written * MS_IN_SECOND);
            }}
            value={seconds}
          />
        </span>
      </div>
      <p className="px-1 text-detail text-ink-secondary">
        {`Every request waits up to ${String(seconds)} ${pluralized(seconds, 'second')} on the judge. A judge that has not answered by then refuses the request.`}
      </p>
    </>
  );
}
