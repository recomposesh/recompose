import type { CredentialedAccountKind } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useForm, useSelector } from '@tanstack/react-form';
import { useId } from 'react';

import type { CatalogEntry } from '../../../../entities/provider';

import { useConnectAccount, withRefusal } from '../../../../shared/api';
import {
  addressRefusal,
  dialectNamed,
  firstDialect,
  namedDialects,
  providerIdFromName,
} from '../../model/own-address-draft';
import { ConnectStep } from '../connect-step/connect-step';
import { SheetField } from '../sheet-field/sheet-field';

type ConnectOwnEndpointProps = {
  /** The escape-hatch entry a person picked, which knows no address of its own. */
  entry: CatalogEntry;
  /** Which kind the registry holds this key under, settled by the catalog that opened. */
  kind: CredentialedAccountKind;
  /** Runs once the row is stored, so the catalog can close behind it. */
  onConnected: () => void;
};

type EndpointDraft = ReturnType<typeof useEndpointDraft>;

function useEndpointDraft(kind: CredentialedAccountKind, onConnected: () => void) {
  const connect = withRefusal(useConnectAccount());
  const form = useForm({
    defaultValues: { label: '', secret: '', origin: '', dialect: firstDialect },
    onSubmit: ({ value }) => {
      connect.mutate(
        {
          provider: providerIdFromName(value.label),
          kind,
          label: value.label.trim(),
          secret: value.secret,
          endpoint: { origin: value.origin.trim(), dialect: value.dialect },
        },
        { onSuccess: onConnected },
      );
    },
  });

  return { connect, form };
}

function dialectRow(form: EndpointDraft['form']): ReactNode {
  return (
    <form.Field name="dialect">
      {(field) => (
        <label className="field-box-row" data-stacked>
          <span>Dialect</span>
          <select
            className="w-full rounded-control border border-line-field focus-ring px-2 py-1 text-body text-ink"
            onChange={(event) => {
              field.handleChange(dialectNamed(event.target.value));
            }}
            value={field.state.value}
          >
            {namedDialects.map((named) => (
              <option key={named.value} value={named.value}>
                {named.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </form.Field>
  );
}

function endpointFields(form: EndpointDraft['form']): ReactNode {
  return (
    <>
      <form.Field name="label">
        {(field) => (
          <SheetField
            label="Name"
            onChangeValue={field.handleChange}
            placeholder="My endpoint"
            stacked
            value={field.state.value}
          />
        )}
      </form.Field>
      <form.Field name="origin">
        {(field) => (
          <SheetField
            label="Base URL"
            onChangeValue={field.handleChange}
            placeholder="https://models.example.com"
            stacked
            value={field.state.value}
          />
        )}
      </form.Field>
      {dialectRow(form)}
      <form.Field name="secret">
        {(field) => (
          <SheetField
            label="Key"
            onChangeValue={field.handleChange}
            placeholder="Paste the secret"
            stacked
            type="password"
            value={field.state.value}
          />
        )}
      </form.Field>
    </>
  );
}

/**
 * The connect step for an endpoint recompose knows no address for.
 *
 * @summary Reach for it under a Custom endpoint or a Custom aggregator. Every other entry carries
 * an address and a dialect the directory names, so its form asks only for the secret and never
 * makes a person be right about something recompose already knows. This one asks for both, because
 * the person is the only source of either, and a wrong dialect would otherwise fail at the first
 * turn with nothing on screen explaining why.
 */
export function ConnectOwnEndpoint({ entry, kind, onConnected }: ConnectOwnEndpointProps) {
  const formId = useId();
  const { connect, form } = useEndpointDraft(kind, onConnected);
  const origin = useSelector(form.store, (state) => state.values.origin);
  const ready = useSelector(
    form.store,
    (state) =>
      state.values.label.trim() !== '' &&
      state.values.secret.trim() !== '' &&
      URL.canParse(state.values.origin.trim()),
  );

  return (
    <ConnectStep
      caption={
        <p className="text-detail text-ink-secondary">
          recompose knows nothing about this endpoint, so it asks you
        </p>
      }
      formId={formId}
      lead={entry.lead}
      onSubmit={() => {
        void form.handleSubmit();
      }}
      pending={connect.isPending}
      ready={ready}
      refusal={addressRefusal(origin) ?? connect.refusal}
      title={entry.name}
    >
      {endpointFields(form)}
    </ConnectStep>
  );
}
