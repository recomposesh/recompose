import type { CredentialedAccountKind } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { authoredRefusalIn, vendorShapeOf } from '@recompose/contracts';
import { useForm, useSelector } from '@tanstack/react-form';
import { useId } from 'react';

import type { CatalogEntry } from '../../model/provider-catalog';

import { IpcResultError, useConnectAccount, withRefusal } from '../../../../shared/api';
import {
  keyHostFor,
  keyShapeHintFor,
  keyTitleFor,
  providerName,
} from '../../model/provider-catalog';
import { ConnectStep } from '../connect-step/connect-step';
import { SheetField } from '../sheet-field/sheet-field';

type ConnectKeyFormProps = {
  /** The entry the key belongs to, already settled by the catalog card that opened the form. */
  entry: CatalogEntry;
  /** Which kind the registry holds this key under. */
  kind: CredentialedAccountKind;
  /** Runs once the key is stored, so the surface that opened the form can step aside. */
  onConnected: () => void;
};

function reachedHost(entry: CatalogEntry): ReactNode {
  const host = keyHostFor(entry.id);

  return host === undefined ? null : (
    <p className="text-detail text-ink-secondary">
      This key reaches <span className="font-mono text-mono-value">{host}</span>
    </p>
  );
}

function shapeWarning(provider: string, pasted: string): ReactNode {
  const suggested = vendorShapeOf(pasted);

  if (suggested === undefined || suggested === provider) {
    return null;
  }

  return (
    <p className="mt-1.5 px-0.5 text-caption text-attention-ink" role="status">
      The key&apos;s shape suggests {providerName(suggested)} rather than {providerName(provider)}.
      Connect it anyway if it belongs here.
    </p>
  );
}

function spokenRefusal(error: Error | null, refusal: string | undefined): string | undefined {
  if (!(error instanceof IpcResultError) || error.code !== 'validation-failed') {
    return refusal;
  }

  return authoredRefusalIn(error.message) ?? 'recompose cannot store this key as it stands.';
}

function useKeyDraftForm(
  provider: string,
  kind: CredentialedAccountKind,
  connect: ReturnType<typeof useConnectAccount>,
  onConnected: () => void,
) {
  return useForm({
    defaultValues: { label: '', secret: '' },
    onSubmit: ({ value }) => {
      connect.mutate({ provider, kind, ...value }, { onSuccess: onConnected });
    },
  });
}

type KeyDraftForm = ReturnType<typeof useKeyDraftForm>;

function keyFields(form: KeyDraftForm, provider: string): ReactNode {
  return (
    <>
      <form.Field name="label">
        {(field) => (
          <SheetField
            label="Name"
            onChangeValue={field.handleChange}
            placeholder="My API Key"
            value={field.state.value}
          />
        )}
      </form.Field>
      <form.Field name="secret">
        {(field) => (
          <SheetField
            label="Key"
            onChangeValue={field.handleChange}
            placeholder={keyShapeHintFor(provider)}
            type="password"
            value={field.state.value}
          />
        )}
      </form.Field>
    </>
  );
}

/**
 * The key half of a provider's fork, asking only what the catalog doesn't already know.
 *
 * @summary Reach for it under a catalog entry's key arm. The picked product stands centered over
 * the fields in the mark-and-heading anatomy the subscription step ships, so the page says whose
 * key it takes. The two things left to say are the name and the key, each hinted in the shape the
 * provider hands out. The name is required because two keys under one provider differ by purpose
 * and a person names the purpose. The connect act settles the sheet, so it rides the sheet's foot
 * beside Cancel. A key whose shape suggests another vendor draws a warning and connects regardless.
 * A refused connect keeps both drafts, because a person who has just pasted a key should never be
 * asked to find it a second time.
 */
export function ConnectKeyForm({ entry, kind, onConnected }: ConnectKeyFormProps) {
  const connect = withRefusal(useConnectAccount());
  const formId = useId();
  const provider = entry.id;
  const form = useKeyDraftForm(provider, kind, connect, onConnected);
  const ready = useSelector(
    form.store,
    (state) => state.values.label.trim() !== '' && state.values.secret.trim() !== '',
  );
  const pasted = useSelector(form.store, (state) => state.values.secret);

  return (
    <ConnectStep
      caption={reachedHost(entry)}
      formId={formId}
      lead={entry.lead}
      note={shapeWarning(provider, pasted)}
      onSubmit={() => {
        void form.handleSubmit();
      }}
      pending={connect.isPending}
      ready={ready}
      refusal={spokenRefusal(connect.error, connect.refusal)}
      title={keyTitleFor(entry.id)}
    >
      {keyFields(form, provider)}
    </ConnectStep>
  );
}
