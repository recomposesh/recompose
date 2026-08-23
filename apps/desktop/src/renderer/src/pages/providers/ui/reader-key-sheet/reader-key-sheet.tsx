import { useState } from 'react';

import type { ReaderKeyAsk } from '../../model/provider-catalog';

import { useSetReaderKey, withRefusal } from '../../../../shared/api';
import { Button, Sheet } from '../../../../shared/ui';
import { SheetField } from '../sheet-field/sheet-field';

type ReaderKeySheetProps = {
  /** The account the key lands on, which is the row that opened the sheet. */
  accountId: string;
  /** What this provider calls the key and why it wants one. */
  ask: ReaderKeyAsk;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SheetActs = { canSave: boolean; onCancel: () => void; onSave: () => void };

function sheetActions({ canSave, onCancel, onSave }: SheetActs) {
  return (
    <>
      <Button onPress={onCancel} variant="secondary">
        Cancel
      </Button>
      <Button disabled={!canSave} onPress={onSave}>
        Save
      </Button>
    </>
  );
}

/**
 * Where a person hands over the read-only key an already connected account never got.
 *
 * @summary Every account connected before this key existed holds none, so the sheet is the only
 * way one reaches an existing row. An empty field saves nothing, because a stray press must never
 * be read as an ask to forget the key already held: forgetting is its own act on the row.
 */
export function ReaderKeySheet({ accountId, ask, open, onOpenChange }: ReaderKeySheetProps) {
  const [secret, setSecret] = useState('');
  const stored = withRefusal(useSetReaderKey());

  return (
    <Sheet
      description={ask.note}
      footer={sheetActions({
        canSave: secret.trim() !== '' && !stored.isPending,
        onCancel: () => {
          onOpenChange(false);
        },
        onSave: () => {
          stored.mutate(
            { id: accountId, secret },
            {
              onSuccess: () => {
                setSecret('');
                onOpenChange(false);
              },
            },
          );
        },
      })}
      onOpenChange={onOpenChange}
      open={open}
      title="Add a credits key"
    >
      <SheetField
        label={ask.label}
        onChangeValue={setSecret}
        placeholder={ask.hint}
        stacked
        type="password"
        value={secret}
      />
      {stored.refusal === undefined ? null : (
        <p className="px-0.5 text-caption text-danger-ink" role="alert">
          {stored.refusal}
        </p>
      )}
    </Sheet>
  );
}
