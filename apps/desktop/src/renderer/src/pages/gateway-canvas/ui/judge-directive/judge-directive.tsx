import type { GatewayConfig, JudgeBranchWording } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { compiledJudgePrompt } from '@recompose/contracts';
import { useState } from 'react';

import { useDefineVirtualModel } from '../../../../shared/api';
import { TextArea } from '../../../../shared/ui';
import { gatewayDirectingJudge } from '../../lib/routing-edits-directive';
import { editableSectionHeading, editFooter, sectionHeading } from '../subject-shell/subject-shell';

export type JudgeDirectiveProps = {
  /** The stored gateway holding the routing, which a directive rewrites as a whole. */
  gateway: GatewayConfig;
  /** The definition whose router is being directed. */
  modelId: string;
  /** The conditional router whose judge reads this, which is where the directive stores. */
  routerId: string;
  /** The branches in declared order, which is the rest of what the judge reads. */
  branches: readonly JudgeBranchWording[];
  /** The directive as stored, or nothing where nobody has written one. */
  directive: string | undefined;
};

const PROMPT_ROWS = 10;

const DIRECTIVE_PLACEHOLDER = 'Anything the branch rules leave unsaid.';

const PROMPT_NOTE =
  'The branch names, their order, and the markers around a request are fixed, so a judge can only ever answer with one of the names above.';

function promptSection(prompt: string): ReactNode {
  return (
    <>
      {sectionHeading('Classification prompt')}
      <TextArea
        inert
        label="Classification prompt"
        onChangeValue={() => {}}
        rows={PROMPT_ROWS}
        value={prompt}
      />
      <p className="mt-2 px-1 text-caption text-ink-secondary">{PROMPT_NOTE}</p>
    </>
  );
}

function restingDirective(directive: string | undefined): ReactNode {
  return (
    <p className="field-box px-3 py-2.5 text-detail text-ink-secondary">
      {directive ?? 'None. The judge reads the branch rules alone.'}
    </p>
  );
}

/**
 * What one judge is told beyond the rules, and the whole prompt that telling ends up inside.
 *
 * @summary The prompt prints from the same assembly the gateway sends, so a person tuning a
 * directive watches the very words their judge will read rather than a description of them. It
 * stays read-only because the label set, the branch order, and the markers around the request are
 * the injection posture: a prompt a person could rewrite whole is a prompt a crafted request could
 * talk its way out of. The directive is the one part that is theirs, and it counts as a semantic
 * edit exactly the way a rule does, because the next request is classified under it.
 */
export function JudgeDirective(props: JudgeDirectiveProps) {
  const { gateway, modelId, routerId, branches, directive } = props;
  const rewrite = useDefineVirtualModel();
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const shown = draft ?? directive;

  return (
    <>
      {editableSectionHeading('Judge directive', draft !== undefined, () => {
        setDraft(directive ?? '');
      })}
      {draft === undefined ? (
        restingDirective(directive)
      ) : (
        <TextArea
          label="Judge directive"
          onChangeValue={setDraft}
          placeholder={DIRECTIVE_PLACEHOLDER}
          value={draft}
        />
      )}
      {draft === undefined
        ? null
        : editFooter(
            {
              onCancel: () => {
                setDraft(undefined);
              },
              onSave: () => {
                rewrite.mutate(gatewayDirectingJudge(gateway, modelId, routerId, draft));
                setDraft(undefined);
              },
            },
            undefined,
          )}
      {promptSection(compiledJudgePrompt({ branches, directive: shown }))}
    </>
  );
}
