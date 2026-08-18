import { useState } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { FieldBoxRow } from './field-box-row';

const label = 'Name';

function RowRecordingSettles({ settled, opening = '' }: { settled: string[]; opening?: string }) {
  const [value, setValue] = useState(opening);

  return (
    <FieldBoxRow
      controlClasses="w-sheet-field"
      label={label}
      onChangeValue={setValue}
      onCommitValue={(committed) => {
        settled.push(committed);
      }}
      value={value}
    />
  );
}

test('a value settled with Enter settles once, and leaving the field adds nothing', async () => {
  const settled: string[] = [];
  const screen = await render(<RowRecordingSettles settled={settled} />);
  const control = screen.getByRole('textbox', { name: label });

  await control.fill('Codex');
  await userEvent.keyboard('{Enter}');
  await userEvent.tab();

  expect(settled).toEqual(['Codex']);
});

test('Escape walks a half-typed entry back to the value last settled, settling nothing', async () => {
  const settled: string[] = [];
  const screen = await render(<RowRecordingSettles settled={settled} />);
  const control = screen.getByRole('textbox', { name: label });

  await control.fill('Codex');
  await userEvent.keyboard('{Enter}');
  await control.fill('Cursor');
  await userEvent.keyboard('{Escape}');

  await expect.element(control).toHaveValue('Codex');
  expect(settled).toEqual(['Codex']);
});

test('Escape before anything settles walks back to the value the row opened with', async () => {
  const screen = await render(<RowRecordingSettles opening="8397" settled={[]} />);
  const control = screen.getByRole('textbox', { name: label });

  await control.fill('9000');
  await userEvent.keyboard('{Escape}');

  await expect.element(control).toHaveValue('8397');
});

test('a change typed after Enter settles again when the field is left', async () => {
  const settled: string[] = [];
  const screen = await render(<RowRecordingSettles settled={settled} />);
  const control = screen.getByRole('textbox', { name: label });

  await control.fill('Codex');
  await userEvent.keyboard('{Enter}');
  await control.fill('Codex CLI');
  await userEvent.tab();

  expect(settled).toEqual(['Codex', 'Codex CLI']);
});
