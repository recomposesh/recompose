import type { ReactNode } from 'react';

import { useState } from 'react';

import type { BranchWording } from '../../lib/conditional-policy';

import { FieldRow, Sheet, TextArea, TextField } from '../../../../shared/ui';

const WHAT_A_RULE_IS =
  "The judge reads this text as its prompt, beside every other branch's, and answers with one branch label.";

/**
 * What the rule field is headed, which says what the text becomes rather than where it is stored.
 *
 * @summary Headed Rule alone, the field read as a matcher the gateway evaluates, so people wrote a
 * keyword into a slot a model reads in sentences. The heading is the only part of the surface a
 * person meets before they start typing, so it is where the register has to be settled.
 */
const RULE_AS_PROMPT = 'Rule as prompt';

/**
 * The example an empty field stands, written the way the compiled prompt reads it.
 *
 * @summary Every branch reaches the judge as `label: rule`, so the example is a description of the
 * requests that belong here rather than an instruction about routing. It closes with what the
 * branch is not, because a classifier reads a boundary as readily as a category and nothing else
 * on this surface could teach that a rule may hold more than a noun phrase.
 */
const AN_EXAMPLE_PROMPT =
  'Requests about source code, such as reviewing a diff, fixing a failing build, or reading a stack trace. Not general chat about programming.';

const A_RENAME_IS_SEMANTIC =
  'The judge answers with this word, so a rename changes what it reads. Left blank, it fills itself from the rule.';

type BranchRuleSheetProps = {
  /** Whether this branch's rule stands open for editing. */
  open: boolean;
  /** Receives a close, whether the person cancelled, saved, or dismissed the surface. */
  onOpenChange: (open: boolean) => void;
  /** The branch as it stands, which the fields open on and walk back to on a cancel. */
  branch: BranchWording;
  /** What the branch routes to, named as the row names it, which the sheet only reports. */
  routesTo: string;
  /** Receives the label and the rule the person settled on. */
  onSave: (wording: BranchWording) => void;
  /** Sentence standing where the last save was refused, which every keystroke clears. */
  refusal?: string | undefined;
};

/**
 * Whether the sheet holds enough to save, which is the rule and nothing else.
 *
 * @summary The label is the only field a save can fill on a person's behalf, because the rule it
 * would be drawn from is right there. So the rule alone holds the save shut, and a person who wrote
 * one and skipped the other is taken at their word rather than sent back to a field.
 */
function settled(wording: BranchWording): boolean {
  return wording.rule.trim() !== '';
}

type SheetActs = { cancel: () => void; save: () => void };

function sheetFooter(draft: BranchWording, acts: SheetActs): ReactNode {
  return (
    <>
      <button
        className="push-button"
        onClick={() => {
          acts.cancel();
        }}
        type="button"
      >
        Cancel
      </button>
      <button
        className="push-button-primary focus-ring-wide"
        disabled={!settled(draft)}
        onClick={() => {
          acts.save();
        }}
        type="button"
      >
        Save branch
      </button>
    </>
  );
}

function labelField(draft: BranchWording, onDraft: (held: BranchWording) => void): ReactNode {
  return (
    <FieldRow
      control={
        <TextField
          label="Label"
          onChangeValue={(label) => {
            onDraft({ ...draft, label });
          }}
          placeholder="code"
          value={draft.label}
        />
      }
      description={A_RENAME_IS_SEMANTIC}
      label="Label"
    />
  );
}

function ruleField(
  draft: BranchWording,
  refusal: string | undefined,
  onDraft: (held: BranchWording) => void,
): ReactNode {
  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <span className="text-body text-ink">{RULE_AS_PROMPT}</span>
      <TextArea
        label={RULE_AS_PROMPT}
        onChangeValue={(rule) => {
          onDraft({ ...draft, rule });
        }}
        placeholder={AN_EXAMPLE_PROMPT}
        rows={6}
        value={draft.rule}
      />
      {refusal === undefined ? null : (
        <p className="text-caption text-danger-ink" role="alert">
          {refusal}
        </p>
      )}
    </div>
  );
}

/**
 * The whole of one branch: the word the judge answers with, where it routes, and the rule behind it.
 *
 * @summary Reach for it from a branch row, because a rule is free text a person composes rather
 * than a name they type and an inspector column has nowhere to read a paragraph. The label leads,
 * since it is the judge's vocabulary and everything else describes it. The routes-to line only
 * reports: a branch's child is moved by dragging its cable on the canvas, and a second way to
 * change it here would be a second thing that could disagree with the wire a person can see.
 *
 * Deleting lives on the row rather than in here, because a sheet that can both save and destroy
 * makes a person read two buttons carefully every time they meant to fix a typo.
 */
export function BranchRuleSheet({
  open,
  onOpenChange,
  branch,
  routesTo,
  onSave,
  refusal,
}: BranchRuleSheetProps) {
  const [draft, setDraft] = useState(branch);

  const closed = (): void => {
    setDraft(branch);
    onOpenChange(false);
  };

  return (
    <Sheet
      description={WHAT_A_RULE_IS}
      footer={sheetFooter(draft, {
        cancel: closed,
        save: () => {
          onSave({ label: draft.label.trim(), rule: draft.rule.trim() });
        },
      })}
      onOpenChange={onOpenChange}
      open={open}
      title="Branch rule"
      width="wide"
    >
      <div className="flex flex-col gap-1">
        {labelField(draft, setDraft)}
        <FieldRow
          control={<span className="text-body text-ink">{routesTo}</span>}
          label="Routes to"
        />
        {ruleField(draft, refusal, setDraft)}
      </div>
    </Sheet>
  );
}
