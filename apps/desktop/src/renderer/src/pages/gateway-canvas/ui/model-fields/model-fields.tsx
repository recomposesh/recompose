import type { ReactNode, RefObject } from 'react';

import { Field } from '@base-ui/react/field';

import type { RoutingPickerProps } from '../routing-picker/routing-picker';

import { Button, CopyButton } from '../../../../shared/ui';
import { discoveryHint, discoverySuggestion } from '../../lib/picker-discovery';
import { RoutingPicker } from '../routing-picker/routing-picker';

const MODEL_ID_HELP = 'Clients send this exact string as the model.';

type TypedFields = {
  /** Control the flow lands opening focus on. */
  nameField: RefObject<HTMLInputElement | null>;
  /** The name as it stands in the draft. */
  name: string;
  /** Sentence standing under the name field, where one applies. */
  nameRefusal?: string | undefined;
  /** Receives every keystroke in the name field. */
  onNameChange: (typed: string) => void;
  /** The id a client sends, derived from the name until a person edits it here. */
  id: string;
  /** Sentence standing under the model id field, where one applies. */
  idRefusal?: string | undefined;
  /** Receives every keystroke in the model id field. */
  onIdChange: (typed: string) => void;
};

export type ModelFieldsProps = TypedFields & RoutingPickerProps;

function nameField(props: TypedFields): ReactNode {
  return (
    <div className="px-3 py-2.5">
      <Field.Root>
        <Field.Label className="mb-1.5 block text-caption font-semibold text-ink-secondary">
          Name
        </Field.Label>
        <Field.Control
          className="field-control w-full placeholder:text-ink-tertiary"
          onChange={(event) => {
            props.onNameChange(event.currentTarget.value);
          }}
          placeholder="Fast"
          ref={props.nameField}
          value={props.name}
        />
        {props.nameRefusal === undefined ? null : (
          <Field.Error className="mt-1.5 block text-caption text-danger-ink" match role="alert">
            {props.nameRefusal}
          </Field.Error>
        )}
      </Field.Root>
    </div>
  );
}

function shapedIdOffer(id: string, onIdChange: (typed: string) => void): ReactNode {
  const suggestion = discoverySuggestion(id);

  if (suggestion === undefined) {
    return null;
  }

  return (
    <div className="mt-2">
      <Button
        onPress={() => {
          onIdChange(suggestion);
        }}
      >
        {`Use ${suggestion}`}
      </Button>
    </div>
  );
}

/**
 * What stands under the model id field: a refusal alone, or the help the hint and its offer join.
 *
 * @summary A refusal takes the whole line, because an id no gateway can serve is not one to nudge
 * about a picker. The hint takes a line of its own under the help rather than riding its end,
 * because an id derived here already carries the word: reaching the hint at all means a person
 * typed past that, and a word they typed past has to be readable to be worth printing. The offer
 * stands as its own press under both, so taking the hint costs a person no typing.
 */
function modelIdBelow(props: TypedFields): ReactNode {
  if (props.idRefusal !== undefined) {
    return (
      <Field.Error className="mt-1.5 block text-caption text-danger-ink" match role="alert">
        {props.idRefusal}
      </Field.Error>
    );
  }

  const hint = discoveryHint(props.id);

  return (
    <>
      <Field.Description className="mt-1.5 block text-footnote text-ink-secondary">
        <span className="block">{MODEL_ID_HELP}</span>
        {hint === undefined ? null : <span className="mt-1 block text-attention-ink">{hint}</span>}
      </Field.Description>
      {shapedIdOffer(props.id, props.onIdChange)}
    </>
  );
}

function modelIdField(props: TypedFields): ReactNode {
  return (
    <div className="border-t border-line-faint px-3 py-2.5">
      <Field.Root>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Field.Label className="text-caption font-semibold text-ink-secondary">
            Model id
          </Field.Label>
          <CopyButton announcement="Model id copied." label="Copy model id" value={props.id} />
        </div>
        <Field.Control
          className="field-control w-full font-mono placeholder:text-ink-tertiary"
          onChange={(event) => {
            props.onIdChange(event.currentTarget.value);
          }}
          placeholder="fast"
          value={props.id}
        />
        {modelIdBelow(props)}
      </Field.Root>
    </div>
  );
}

/**
 * The fields a definition needs, in the order a person settles them, in two boxes.
 *
 * @summary The name and the id are typed and stand in the first box, and where the model routes is
 * picked and stands in the second, because the two boxes answer different kinds of question and a
 * person fills one with a keyboard and the other with a pointer. The id a client sends follows the
 * name as it is derived and then a person may edit it, so it carries a copy and the word that
 * clients send it exactly.
 */
export function ModelFields(props: ModelFieldsProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="shrink-0 field-box">
        {nameField(props)}
        {modelIdField(props)}
      </div>
      <RoutingPicker
        bindsThrough={props.bindsThrough}
        judge={props.judge}
        modelRefusal={props.modelRefusal}
        models={props.models}
        onPickKind={props.onPickKind}
        onPickModel={props.onPickModel}
        onPickTarget={props.onPickTarget}
        onReopenKind={props.onReopenKind}
        onReopenRouterMode={props.onReopenRouterMode}
        onRouterModeChange={props.onRouterModeChange}
        onRouterNameChange={props.onRouterNameChange}
        onSelectDifferentProvider={props.onSelectDifferentProvider}
        providerModel={props.providerModel}
        routerMode={props.routerMode}
        routerName={props.routerName}
        target={props.target}
        targetName={props.targetName}
        targets={props.targets}
      />
    </div>
  );
}
