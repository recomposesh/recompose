import type { ReactNode } from 'react';

import { useState } from 'react';

import type { BranchWording } from '../../lib/conditional-policy';
import type { RouterMode } from '../../lib/routing-edits';
import type { RouterChild } from '../router-child-list/router-child';

import { ConsequenceDialog } from '../../../../shared/ui';
import { BranchRuleSheet } from '../branch-rule-sheet/branch-rule-sheet';
import { RouterChildList } from '../router-child-list/router-child-list';
import { branchRemovalQuestion } from '../router-inspector/branch-removal';

export type BranchEditorProps = {
  /** How the router spreads, which is what decides whether its rows order anything. */
  mode: RouterMode;
  /** The children in declared order, carrying their branch facts where the mode has any. */
  rows: readonly RouterChild[];
  /**
   * Whether these rows stand for branches a person can rule and remove.
   *
   * @summary Off for a router that reads no requests, whose rows have no rule to edit and whose
   * children leave by the plain node removal the canvas already offers.
   */
  branching: boolean;
  /** Receives the rank a row moved from and the rank it moved to. */
  onMove: (from: number, to: number) => void;
  /** Receives the child a person opened, which selects its card and turns the drawer to it. */
  onOpen: (child: RouterChild) => void;
  /** Receives the branch and the words a person settled on for it. */
  onRuleBranch: (child: RouterChild, wording: BranchWording) => void;
  /** Receives the branch a person accepted the cost of removing. */
  onDropBranch: (child: RouterChild) => void;
};

/** What the sheet reports a branch routes to, which is the row's own two lines run together. */
function routesTo(child: RouterChild): string {
  return child.detail === undefined ? child.name : `${child.name} · ${child.detail}`;
}

function ruleSheet(
  editing: RouterChild | undefined,
  onEditing: (child: RouterChild | undefined) => void,
  onRule: (child: RouterChild, wording: BranchWording) => void,
): ReactNode {
  if (editing === undefined) {
    return null;
  }

  return (
    <BranchRuleSheet
      branch={{ label: editing.label ?? '', rule: editing.rule ?? '' }}
      onOpenChange={() => {
        onEditing(undefined);
      }}
      onSave={(wording) => {
        onRule(editing, wording);
        onEditing(undefined);
      }}
      open
      routesTo={routesTo(editing)}
    />
  );
}

function removalDialog(
  child: RouterChild | undefined,
  onCancel: () => void,
  onDrop: (child: RouterChild) => void,
): ReactNode {
  const asked = branchRemovalQuestion(child?.label);

  return (
    <ConsequenceDialog
      confirmLabel={asked.confirmLabel}
      heading={asked.heading}
      onCancel={onCancel}
      onConfirm={() => {
        if (child !== undefined) {
          onDrop(child);
        }
      }}
      open={child !== undefined}
    >
      {asked.body}
    </ConsequenceDialog>
  );
}

/**
 * The children a router holds, and everything a person can do to a branch among them.
 *
 * @summary It owns which branch is open and which is being removed, because both are questions a
 * person asked of one row and neither belongs in the stored document. The rule sheet and the
 * removal question stand here rather than in the inspector for the same reason the delete act
 * stands in the row's menu: the surface that asks about a branch is the surface that lists them.
 */
export function BranchEditor(props: BranchEditorProps) {
  const [editing, setEditing] = useState<RouterChild | undefined>(undefined);
  const [removing, setRemoving] = useState<RouterChild | undefined>(undefined);

  return (
    <>
      <RouterChildList
        mode={props.mode}
        onDeleteBranch={props.branching ? setRemoving : undefined}
        onEditRule={props.branching ? setEditing : undefined}
        onMove={props.onMove}
        onOpen={props.onOpen}
        rows={props.rows}
      />
      {ruleSheet(editing, setEditing, props.onRuleBranch)}
      {removalDialog(
        removing,
        () => {
          setRemoving(undefined);
        },
        (child) => {
          props.onDropBranch(child);
          setRemoving(undefined);
        },
      )}
    </>
  );
}
