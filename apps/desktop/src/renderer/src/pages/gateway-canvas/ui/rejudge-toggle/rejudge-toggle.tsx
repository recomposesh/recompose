import { Switch } from '../../../../shared/ui';
import { rejudgeSentences } from '../../lib/router-modes';
import { sectionHeading } from '../subject-shell/subject-shell';

/**
 * What this section is called, which is the act its toggle carries out.
 *
 * @summary The heading and the control answer to one string, so a person reading the panel and one
 * hearing it meet the same words, and the title names what moving the toggle does rather than
 * naming a category they would have to translate first.
 */
const REJUDGE_TITLE = 'Re-judge every request';

type RejudgeToggleProps = {
  /** Whether this router asks its judge again for every request it takes. */
  rejudgeEveryRequest: boolean;
  /** Receives the rhythm the person asked for, which is a stored edit either way. */
  onChangeChecked: (rejudgeEveryRequest: boolean) => void;
};

function rhythmOf(rejudgeEveryRequest: boolean) {
  return rejudgeEveryRequest ? 'every-request' : 'once-per-conversation';
}

/**
 * How often a conditional router asks its judge, and one plain sentence about where it stands.
 *
 * @summary Reach for it in the router inspector, above the judge the rhythm applies to. The
 * sentence describes the position the toggle is actually in rather than standing as fixed helper
 * text, so a person reads what their own router does instead of a description of a setting. The
 * control stands beside the heading rather than inside it, because a switch answering to the very
 * words of the title it sits in makes a screen reader read the act twice over.
 */
export function RejudgeToggle({ rejudgeEveryRequest, onChangeChecked }: RejudgeToggleProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        {sectionHeading(REJUDGE_TITLE)}
        <span className="ms-auto shrink-0">
          <Switch
            checked={rejudgeEveryRequest}
            label={REJUDGE_TITLE}
            onChangeChecked={onChangeChecked}
          />
        </span>
      </div>
      <p className="px-1 text-detail text-ink-secondary">
        {rejudgeSentences[rhythmOf(rejudgeEveryRequest)]}
      </p>
    </>
  );
}
