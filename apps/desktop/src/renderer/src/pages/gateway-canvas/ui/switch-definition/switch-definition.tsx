import type { Account, GatewayConfig } from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

import type { ConditionalSwitch, JudgeBinding } from '../../lib/conditional-draft';
import type { ModelListReading } from '../../lib/model-draft';
import type { RouterChild } from '../router-child-list/router-child';

import {
  switchBindingJudge,
  switchReordering,
  switchRuling,
  switchWhole,
  switchWithout,
} from '../../lib/conditional-draft';
import { gatewaySwitchingToConditional } from '../../lib/routing-edits-conditional';
import { BranchEditor } from '../branch-editor/branch-editor';
import { JudgeSection } from '../judge-section/judge-section';
import { editFooter, sectionHeading } from '../subject-shell/subject-shell';
import { switchDefinitionRows } from './switch-rows';

const NOTHING_BOUND: JudgeBinding = { accountId: '', providerModel: '' };

const WHAT_A_SWITCH_NEEDS =
  'Give every branch a word and a rule, and bind the model that reads each request. The last child catches a request the judge reads but cannot place.';

const STILL_OWED =
  'Nothing is stored until every branch holds a word and a rule and a judge binds.';

export type SwitchDefinitionProps = {
  /** The stored gateway the switch rewrites once the definition stands whole. */
  gateway: GatewayConfig;
  /** The virtual model whose routing holds the router being switched. */
  modelId: string;
  /** The id the stored table holds the router under. */
  routeNodeId: string;
  /** The registry the judge and the children read their names against. */
  accounts: readonly Account[];
  /** The children as the stored ladder reads them, which the definition orders and words. */
  rows: readonly RouterChild[];
  /** What a person has written into the definition so far. */
  held: ConditionalSwitch;
  /** The model ids the account being picked for the judge serves as of this look. */
  offered: ModelListReading;
  /** Which account the judge edit has landed on, or nothing while that section rests. */
  picking: string | undefined;
  /** Receives the account the judge edit landed on, and nothing where the edit ended. */
  onPicking: (accountId: string | undefined) => void;
  /** Receives the definition after every answer, or nothing once the definition is over. */
  onHeld: (next: ConditionalSwitch | undefined) => void;
  /** Takes a child off the stored ladder, which is the plain removal every mode already answers. */
  onDropChild: (child: RouterChild) => void;
  /** Receives the card a person opened from the ladder. */
  onOpen: (child: RouterChild) => void;
  /** Carries a whole gateway to storage. */
  onRewrite: (next: GatewayConfig) => void;
};

function judgeSection(props: SwitchDefinitionProps) {
  const { held, onHeld, onPicking } = props;

  return (
    <JudgeSection
      accounts={props.accounts}
      bound={held.judge ?? NOTHING_BOUND}
      offered={props.offered}
      onBindJudge={(judge) => {
        onHeld(switchBindingJudge(held, judge));
        onPicking(undefined);
      }}
      onPicking={onPicking}
      picking={props.picking}
      routesEverythingToElse={false}
    />
  );
}

function landing(props: SwitchDefinitionProps): () => void {
  return () => {
    props.onRewrite(
      gatewaySwitchingToConditional(
        props.gateway,
        props.modelId,
        props.routeNodeId,
        mintRouteNodeId(),
        props.held,
      ),
    );
    props.onHeld(undefined);
  };
}

function definitionFoot(whole: boolean, props: SwitchDefinitionProps) {
  return (
    <>
      {editFooter(
        {
          onCancel: () => {
            props.onHeld(undefined);
          },
          onSave: landing(props),
          label: 'Switch to conditional',
          withheld: !whole,
        },
        undefined,
      )}
      {whole ? null : (
        <p className="mt-2 px-1 text-caption text-ink-secondary" role="status">
          {STILL_OWED}
        </p>
      )}
    </>
  );
}

/**
 * The definition a router stands in between choosing conditional and storing it.
 *
 * @summary Choosing this mode is not one answer but three, and the stored shape refuses anything
 * less than all of them, so the panel holds the choice open rather than writing a router that
 * would bounce: every answer lands in the held definition and the whole of it crosses at once.
 * Every child a person already bound is here as a draft branch, because switching keeps the
 * bindings and collects the words each one answers to. The foot says what is still owed rather
 * than leaving a dead button to explain itself, and cancelling leaves the router spreading exactly
 * as it did, because trying this mode has to cost nothing.
 *
 * Dropping a child is the one answer that reaches storage early, since that child is still an
 * ordinary rung a person can take away whichever mode it ends up spreading by.
 */
export function SwitchDefinition(props: SwitchDefinitionProps) {
  const { held, onHeld } = props;

  return (
    <>
      <p className="mt-2 px-1 text-detail text-ink-secondary">{WHAT_A_SWITCH_NEEDS}</p>
      {judgeSection(props)}
      {sectionHeading('Branches')}
      <BranchEditor
        branching
        mode="conditional"
        onDropBranch={(child) => {
          onHeld(switchWithout(held, child.routeNodeId));
          props.onDropChild(child);
        }}
        onMove={(from, to) => {
          onHeld(switchReordering(held, from, to));
        }}
        onOpen={props.onOpen}
        onRuleBranch={(child, wording) => {
          onHeld(switchRuling(held, child.routeNodeId, wording));
        }}
        rows={switchDefinitionRows(props.rows, held)}
      />
      {definitionFoot(switchWhole(held), props)}
    </>
  );
}
