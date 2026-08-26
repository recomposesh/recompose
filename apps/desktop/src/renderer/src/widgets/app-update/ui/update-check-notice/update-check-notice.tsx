import type { UpdateCheck } from '@recompose/contracts';

import { Button } from '../../../../shared/ui';

type UpdateCheckNoticeProps = {
  check: UpdateCheck;
  version: string;
  onDismiss: () => void;
};

type NoticeWords = { title: string; detail: string | null };

function wordsFor(check: UpdateCheck, version: string): NoticeWords {
  if (check.standing === 'asking') {
    return { title: 'Checking for updates…', detail: null };
  }

  if (check.standing === 'current') {
    return { title: 'Up to date', detail: `Recompose ${version} is the newest version.` };
  }

  if (check.standing === 'found') {
    return { title: 'Update found', detail: `Recompose ${check.version} is downloading.` };
  }

  return { title: 'Update check failed', detail: check.reason };
}

/**
 * What the check a person asked for has to say, in the sidebar the update card already owns.
 *
 * @summary A check still asking offers no way out, because dismissing one mid-flight would leave
 * the person with no way back to the answer they asked for.
 */
export function UpdateCheckNotice({ check, version, onDismiss }: UpdateCheckNoticeProps) {
  const words = wordsFor(check, version);

  return (
    <section
      aria-label="Update check"
      className="flex items-start gap-2 rounded-panel border border-line-subtle bg-surface-card px-3 py-2.5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body font-semibold">{words.title}</p>
        {words.detail === null ? null : (
          <p className="text-caption text-ink-secondary">{words.detail}</p>
        )}
      </div>
      {check.standing === 'asking' ? null : (
        <Button aria-label="Dismiss" glyph="close" onPress={onDismiss} variant="icon-secondary" />
      )}
    </section>
  );
}
