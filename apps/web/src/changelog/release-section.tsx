import type { ChangelogSection } from '../lib/changelog';

import { gitHubUrl } from '../lib/links';
import { ItemMarker } from './item-marker';

export function ReleaseSection({ index, section }: { index: number; section: ChangelogSection }) {
  const breaking = section.title === 'Breaking changes';

  return (
    <section className="flex flex-col gap-4.5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-stage-hush">{`0${index}`}</span>
          <h3 className="text-xl font-medium text-fd-foreground lowercase">{section.title}</h3>
        </div>
        <div className="h-px bg-stage-hairline" />
      </div>

      {section.items.map((item) => (
        <div key={item.text} className="flex gap-2 text-body leading-prose">
          <ItemMarker breaking={breaking} />
          <p className="text-stage-prose">
            {item.text}
            {item.prNumbers.map((pr) => (
              <a
                key={pr}
                href={`${gitHubUrl}/pull/${pr}`}
                className="ms-3 font-mono text-xs whitespace-nowrap text-stage-ghost hover:text-fd-foreground"
              >
                #{pr}
              </a>
            ))}
          </p>
        </div>
      ))}
    </section>
  );
}
