import { useForm, useSelector } from '@tanstack/react-form';
import { useId } from 'react';

import type { CatalogLead } from '../../../../entities/provider';

import { useConnectLocalRuntime, withRefusal } from '../../../../shared/api';
import { portRefusal } from '../../model/own-address-draft';
import { ConnectStep } from '../connect-step/connect-step';
import { SheetField } from '../sheet-field/sheet-field';

type ConnectOwnServerProps = {
  /**
   * The escape-hatch row a person picked, which knows no port of its own.
   *
   * @summary The step draws the row and never reads its offers, so it takes the drawing rather
   * than the whole catalog entry behind it.
   */
  entry: { lead: CatalogLead; name: string };
  /** Runs once the row is stored, so the catalog can close behind it. */
  onConnected: () => void;
};

function useServerDraft(onConnected: () => void) {
  const connect = withRefusal(useConnectLocalRuntime());
  const form = useForm({
    defaultValues: { label: '', port: '' },
    onSubmit: ({ value }) => {
      connect.mutate(
        { runtime: 'custom', port: Number(value.port), label: value.label.trim() },
        { onSuccess: onConnected },
      );
    },
  });

  return { connect, form };
}

/**
 * The connect step for a server on this machine that recompose documents no port for.
 *
 * @summary Reach for it under the Custom local server entry. Every documented runtime knows the
 * port its own project publishes, so its step opens a look straight away. This one has nothing to
 * look at until a person names a port, and no project to name the row by. The person never types a
 * host, because recompose mints the loopback address itself and a typed host could aim a stored
 * row off this machine.
 */
export function ConnectOwnServer({ entry, onConnected }: ConnectOwnServerProps) {
  const formId = useId();
  const { connect, form } = useServerDraft(onConnected);
  const port = useSelector(form.store, (state) => state.values.port);
  const named = useSelector(form.store, (state) => state.values.label.trim() !== '');
  const typed = port.trim() === '' ? undefined : portRefusal(port);

  return (
    <ConnectStep
      caption={
        <p className="text-detail text-ink-secondary">
          recompose looks at <span className="font-mono text-mono-value">127.0.0.1</span> on the
          port you name
        </p>
      }
      formId={formId}
      lead={entry.lead}
      onSubmit={() => {
        void form.handleSubmit();
      }}
      pending={connect.isPending}
      ready={named && portRefusal(port) === undefined}
      refusal={typed ?? connect.refusal}
      title={entry.name}
    >
      <form.Field name="label">
        {(field) => (
          <SheetField
            label="Name"
            onChangeValue={field.handleChange}
            placeholder="Bench box"
            value={field.state.value}
          />
        )}
      </form.Field>
      <form.Field name="port">
        {(field) => (
          <SheetField
            label="Port"
            onChangeValue={field.handleChange}
            placeholder="8000"
            value={field.state.value}
          />
        )}
      </form.Field>
    </ConnectStep>
  );
}
